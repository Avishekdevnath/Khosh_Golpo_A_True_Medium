"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Bookmark, Heart, MessageSquare, Share2, Sparkles } from "lucide-react";
import { useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from "react";

import RichText from "@/components/shared/RichText";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { TextArea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/api";
import { createPrefixedBlockMutation, type SelectionMutation } from "@/lib/threadComposerMarkdown";
import { avatarSeed, initials } from "@/lib/workspaceUtils";
import { useAuthStore } from "@/store/authStore";

type ToneCheckResponse = {
  score: number;
  warning: boolean;
  flagged: boolean;
  suggestion: string | null;
  reason: string | null;
};

type ThreadOut = {
  id: string;
};

type EditorMode = "write" | "preview";

function parseTags(input: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of input.split(",")) {
    const tag = raw.trim().toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }
  return tags.slice(0, 8);
}

function ToolbarButton({
  label,
  onClick,
  onMouseDown,
}: {
  label: string;
  onClick: () => void;
  onMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={onMouseDown}
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors duration-150 hover:border-primary/25 hover:bg-card-hover hover:text-foreground"
    >
      {label}
    </button>
  );
}

export default function NewThreadPage() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const [title, setTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [body, setBody] = useState("");
  const [editorMode, setEditorMode] = useState<EditorMode>("write");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [toneResult, setToneResult] = useState<ToneCheckResponse | null>(null);
  const [showToneModal, setShowToneModal] = useState(false);
  const [toneApproved, setToneApproved] = useState(false);

  const parsedTags = useMemo(() => parseTags(tagsInput), [tagsInput]);
  const bodyCount = body.length;
  const previewTitle = title.trim() || "Untitled thread";
  const previewName = currentUser?.display_name?.trim() || currentUser?.username || "You";
  const previewHandle = currentUser?.username ? `@${currentUser.username}` : "@you";
  const [previewAv1, previewAv2] = avatarSeed(currentUser?.id ?? "thread-preview");

  function handleBackNavigation() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/threads");
  }

  async function runToneCheck(): Promise<ToneCheckResponse> {
    const result = await apiPost<ToneCheckResponse>("ai/tone-check", { content: body });
    setToneResult(result);
    return result;
  }

  async function createThread(skipToneCheck: boolean) {
    if (!title.trim() || !body.trim()) {
      setErrorMessage("Title and body are required.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (!skipToneCheck) {
        const tone = await runToneCheck();
        if (tone.warning) {
          setShowToneModal(true);
          setIsSubmitting(false);
          return;
        }
      }

      const created = await apiPost<ThreadOut>("threads", {
        title: title.trim(),
        body: body.trim(),
        tags: parsedTags,
      });

      router.push(`/threads/${created.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create thread";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function applyBodyMutation(
    buildMutation: (value: string, start: number, end: number, selected: string) => SelectionMutation,
  ) {
    const input = bodyRef.current;
    if (!input) return;

    const start = input.selectionStart ?? body.length;
    const end = input.selectionEnd ?? body.length;
    const selected = body.slice(start, end);
    const mutation = buildMutation(body, start, end, selected);

    setBody(mutation.nextValue);
    setEditorMode("write");

    requestAnimationFrame(() => {
      const node = bodyRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(mutation.selectionStart, mutation.selectionEnd);
    });
  }

  function wrapSelection(before: string, after: string, placeholder: string) {
    applyBodyMutation((value, start, end, selected) => {
      const content = selected || placeholder;
      const nextValue = `${value.slice(0, start)}${before}${content}${after}${value.slice(end)}`;
      const selectionStart = start + before.length;
      const selectionEnd = selectionStart + content.length;
      return { nextValue, selectionStart, selectionEnd };
    });
  }

  function prefixLines(prefix: string, placeholder: string) {
    applyBodyMutation((value, start, end, selected) =>
      createPrefixedBlockMutation({
        value,
        start,
        end,
        selected,
        prefix,
        placeholder,
      }),
    );
  }

  function insertLink() {
    applyBodyMutation((value, start, end, selected) => {
      const label = selected || "link text";
      const url = "https://example.com";
      const nextValue = `${value.slice(0, start)}[${label}](${url})${value.slice(end)}`;
      const urlStart = start + label.length + 3;
      return {
        nextValue,
        selectionStart: urlStart,
        selectionEnd: urlStart + url.length,
      };
    });
  }

  function handleToolbarMouseDown(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  const previewArticle = (
    <article className="rounded-[24px] border border-border bg-background p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            Output Preview
          </div>
          <div className="text-[13px] text-text-secondary">
            This is how your thread will render after publishing.
          </div>
        </div>
        <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
          Live
        </span>
      </div>

      <div className="mb-6">
        <h2
          className="m-0 text-[2rem] font-bold leading-[1.1] text-foreground sm:text-[2.3rem]"
          style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
        >
          {previewTitle}
        </h2>
      </div>

      {body.trim() ? (
        <div
          className="mb-6 text-[15px] leading-[1.75] text-foreground"
          style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
        >
          <RichText content={body} variant="full" />
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-dashed border-border bg-card-hover px-4 py-7 text-sm leading-relaxed text-text-secondary">
          Start writing in the composer to see your formatted output here. Headings, emphasis, code, quotes, lists, and
          links will render live.
        </div>
      )}

      {parsedTags.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {parsedTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-card-hover px-3 py-1 text-[12px] text-text-secondary"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : (
        <div className="mb-6 text-[12px] text-text-tertiary">
          Add tags to help people discover the thread.
        </div>
      )}

      <div className="mb-4 flex items-center gap-3 border-t border-border pt-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
          style={{ background: `linear-gradient(135deg,${previewAv1},${previewAv2})` }}
        >
          {initials(previewName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-foreground">{previewName}</div>
          <div className="text-[12px] text-text-tertiary">{previewHandle} - Draft preview</div>
        </div>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-[12px] font-medium text-text-secondary">
          Preview
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3 text-[12px] text-text-secondary">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <Heart size={14} />
            Like
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MessageSquare size={14} />
            Comment
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Bookmark size={14} />
          <Share2 size={14} />
        </div>
      </div>
    </article>
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        className="pointer-events-none fixed -right-[100px] -top-[150px] z-0 h-[500px] w-[500px] rounded-full blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed -bottom-[150px] -left-[100px] z-0 h-[400px] w-[400px] rounded-full blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(129,140,248,0.08) 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/85 px-6 py-4 backdrop-blur-[16px]">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0"
            onClick={() => router.push("/")}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary font-serif text-lg font-bold text-white">
              K
            </span>
            <span className="font-serif text-xl text-foreground">KhoshGolpo</span>
          </button>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-[10px] border border-border bg-card px-3 py-2 text-xs text-text-secondary transition-colors hover:border-border/70 hover:bg-card-hover hover:text-foreground"
          onClick={handleBackNavigation}
        >
          <ArrowLeft size={16} />
          Back to Threads
        </button>
      </nav>

      <div className="relative z-[1] h-[calc(100vh-65px)] overflow-y-auto">
        <div className="mx-auto max-w-[1320px] px-5 pt-8 pb-24 sm:px-6 sm:pb-28 lg:px-8 lg:pb-32">
          <header className="mb-8 max-w-[760px]">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
              <Sparkles size={12} />
              Compose with live output
            </div>
            <h1 className="mb-2 font-serif text-[38px] leading-[1.08] sm:text-[44px]">Create New Thread</h1>
            <p className="text-base font-light text-text-secondary">
              Draft in markdown-style text, use quick insert controls, and watch the final thread output update as you go.
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] xl:grid-cols-[minmax(0,1.05fr)_420px]">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="m-0 text-[18px] font-semibold text-foreground">Compose</h2>
                  <p className="mt-1 text-[13px] text-text-secondary">
                    Keep the structure focused: title, tags, then the actual context you want feedback on.
                  </p>
                </div>
                <div className="hidden items-center gap-1.5 rounded-full border border-border bg-card-hover px-3 py-1 text-[11px] font-medium text-text-secondary lg:inline-flex">
                  <Sparkles size={12} />
                  Preview updates live
                </div>
              </div>

              <div className="space-y-6">
                <FormField label="Title" htmlFor="thread-title">
                  <Input
                    id="thread-title"
                    type="text"
                    placeholder="What do you want to discuss?"
                    className="bg-secondary border-input focus-visible:border-primary"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </FormField>

                <div className="flex flex-col gap-1.5">
                  <FormField label="Tags" htmlFor="thread-tags" hint="Comma-separated, up to 8 tags">
                    <Input
                      id="thread-tags"
                      type="text"
                      placeholder="fastapi, backend, career"
                      className="bg-secondary border-input focus-visible:border-primary"
                      value={tagsInput}
                      onChange={(event) => setTagsInput(event.target.value)}
                    />
                  </FormField>
                  {parsedTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {parsedTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-border bg-card px-3 py-1 text-[12px] text-text-secondary"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="overflow-hidden rounded-2xl border border-border bg-background">
                  <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
                    <label
                      htmlFor="thread-body"
                      className="text-xs font-semibold uppercase tracking-wider text-text-secondary"
                    >
                      Body
                    </label>
                    <div className="flex items-center gap-2 lg:hidden">
                      <button
                        type="button"
                        onClick={() => setEditorMode("write")}
                        className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                          editorMode === "write"
                            ? "bg-primary/10 text-primary"
                            : "text-text-tertiary hover:text-foreground"
                        }`}
                      >
                        Write
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorMode("preview")}
                        className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                          editorMode === "preview"
                            ? "bg-primary/10 text-primary"
                            : "text-text-tertiary hover:text-foreground"
                        }`}
                      >
                        Preview
                      </button>
                    </div>
                    <span className={`text-[11px] ${bodyCount > 1800 ? "text-warning" : "text-text-secondary"}`}>
                      {bodyCount}/2400
                    </span>
                  </div>

                  <div className={`${editorMode === "preview" ? "hidden lg:block" : "block"}`}>
                    <div className="flex flex-wrap gap-2 border-b border-border px-3 py-2">
                      <ToolbarButton
                        label="Bold"
                        onMouseDown={handleToolbarMouseDown}
                        onClick={() => wrapSelection("**", "**", "bold text")}
                      />
                      <ToolbarButton
                        label="Italic"
                        onMouseDown={handleToolbarMouseDown}
                        onClick={() => wrapSelection("*", "*", "italic text")}
                      />
                      <ToolbarButton
                        label="Code"
                        onMouseDown={handleToolbarMouseDown}
                        onClick={() => wrapSelection("`", "`", "code")}
                      />
                      <ToolbarButton
                        label="Quote"
                        onMouseDown={handleToolbarMouseDown}
                        onClick={() => prefixLines("> ", "Quoted insight")}
                      />
                      <ToolbarButton
                        label="Bullet List"
                        onMouseDown={handleToolbarMouseDown}
                        onClick={() => prefixLines("- ", "First point\nSecond point")}
                      />
                      <ToolbarButton
                        label="Link"
                        onMouseDown={handleToolbarMouseDown}
                        onClick={insertLink}
                      />
                    </div>

                    <TextArea
                      ref={bodyRef}
                      id="thread-body"
                      variant="autogrow"
                      maxLength={2400}
                      maxHeight={420}
                      placeholder="Share context, constraints, and what feedback you want..."
                      className="min-h-[240px] border-none rounded-none bg-transparent px-4 py-4 focus:ring-0 focus:border-transparent text-[15px] leading-[1.8]"
                      value={body}
                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setBody(event.target.value)}
                      onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
                          event.preventDefault();
                          wrapSelection("**", "**", "bold text");
                        }
                      }}
                    />

                    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-[11px] text-text-tertiary">
                      <span>Toolbar inserts markdown syntax. You can still type directly.</span>
                      <span className="font-mono hidden sm:inline">**bold** *italic* `code` &gt; quote - list [link](https://)</span>
                    </div>
                  </div>

                  <div className={`${editorMode === "preview" ? "block lg:hidden" : "hidden"} px-4 py-4`}>
                    {previewArticle}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card-hover px-4 py-3 text-xs text-text-secondary">
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles size={13} />
                    {toneResult
                      ? `Tone ${toneResult.score.toFixed(2)}${toneResult.warning ? " - warning" : " - clear"}`
                      : "No tone check yet"}
                  </span>
                  <span>{toneResult?.suggestion ? "Suggestion ready" : "Run a tone check before posting"}</span>
                </div>

                {errorMessage ? (
                  <div className="rounded-[10px] border border-destructive/35 bg-destructive/10 px-3 py-2.5 text-xs text-red-300">
                    {errorMessage}
                  </div>
                ) : null}

                <div className="flex flex-col gap-2.5 border-t border-border pt-6 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center rounded-[10px] border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-border/80 hover:bg-card-hover disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                    disabled={!body.trim() || isSubmitting}
                    onClick={async () => {
                      try {
                        setErrorMessage(null);
                        await runToneCheck();
                      } catch (error) {
                        const message = error instanceof Error ? error.message : "Tone check failed";
                        setErrorMessage(message);
                      }
                    }}
                  >
                    Tone Check Preview
                  </button>
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center rounded-[10px] bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                    disabled={isSubmitting}
                    onClick={() => createThread(false)}
                  >
                    {isSubmitting ? "Creating..." : "Create Thread"}
                  </button>
                </div>
              </div>
            </section>

            <aside className="hidden lg:block">
              <div className="sticky top-6">{previewArticle}</div>
            </aside>
          </div>
        </div>
      </div>

      {showToneModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,8,13,0.7)] p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tone-modal-title"
        >
          <div className="w-full max-w-[540px] rounded-2xl border border-border bg-card p-5">
            <h3 id="tone-modal-title" className="mb-2 font-serif text-[28px]">
              Tone Warning
            </h3>
            <p className="mb-3.5 text-sm text-text-secondary">
              Your draft may read as harsh. You can edit first or post anyway.
            </p>

            <div className="mb-2 rounded-[10px] border border-border bg-card-hover px-3 py-2.5 text-xs">
              Score: {toneResult ? toneResult.score.toFixed(2) : "-"}
            </div>
            {toneResult?.reason ? (
              <div className="mb-2 rounded-[10px] border border-border bg-card-hover px-3 py-2.5 text-xs">
                Reason: {toneResult.reason}
              </div>
            ) : null}
            {toneResult?.suggestion ? (
              <div className="mb-2 rounded-[10px] border border-primary/25 bg-primary/10 px-3 py-2.5 text-xs text-primary">
                Suggestion: {toneResult.suggestion}
              </div>
            ) : null}

            <div className="mt-3.5 flex justify-end gap-2.5">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-[10px] border border-border bg-card-hover px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-border/80"
                onClick={() => {
                  setShowToneModal(false);
                  setToneApproved(false);
                }}
              >
                Edit Draft
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-[10px] bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary/90"
                onClick={async () => {
                  if (toneApproved) return;
                  setToneApproved(true);
                  setShowToneModal(false);
                  await createThread(true);
                  setToneApproved(false);
                }}
              >
                Post Anyway
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
