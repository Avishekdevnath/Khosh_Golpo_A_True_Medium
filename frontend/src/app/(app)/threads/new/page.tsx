"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { apiPost } from "@/lib/api";
import { FormField } from "@/components/ui/form-field";
import { TextArea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

export default function NewThreadPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [toneResult, setToneResult] = useState<ToneCheckResponse | null>(null);
  const [showToneModal, setShowToneModal] = useState(false);
  const [toneApproved, setToneApproved] = useState(false);

  const parsedTags = useMemo(() => parseTags(tagsInput), [tagsInput]);
  const bodyCount = body.length;

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

  return (
    <main className="relative min-h-screen overflow-hidden bg-app-bg text-foreground">
      {/* Background orbs */}
      <div
        className="pointer-events-none fixed z-0 h-[500px] w-[500px] -top-[150px] -right-[100px] rounded-full blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed z-0 h-[400px] w-[400px] -bottom-[150px] -left-[100px] rounded-full blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(129,140,248,0.08) 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      {/* Nav */}
      <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-app-border bg-app-bg/85 px-6 py-4 backdrop-blur-[16px]">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="flex items-center gap-2.5 border-0 bg-transparent p-0 cursor-pointer"
            onClick={() => router.push("/")}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent font-serif text-lg font-bold text-white">
              K
            </span>
            <span className="font-serif text-xl text-foreground">KhoshGolpo</span>
          </button>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-[10px] border border-app-border bg-app-panel px-3 py-2 text-xs text-text-secondary transition-colors hover:border-app-border/70 hover:bg-app-card-hover hover:text-foreground"
          onClick={handleBackNavigation}
        >
          <ArrowLeft size={16} />
          Back to Threads
        </button>
      </nav>

      {/* Scrollable content */}
      <div className="relative z-[1] h-[calc(100vh-65px)] overflow-y-auto">
        <div className="mx-auto max-w-[900px] px-6 py-10 sm:px-6 md:px-6">
          {/* Page header */}
          <header className="mb-9">
            <h1 className="mb-2 font-serif text-[38px] leading-[1.1] sm:text-[42px]">Create New Thread</h1>
            <p className="text-base font-light text-text-secondary">Start a focused discussion with context and warmth.</p>
          </header>

          {/* Form card */}
          <section className="rounded-2xl border border-app-border bg-app-panel p-6 sm:p-8">
            <div className="space-y-6">
              {/* Title */}
              <FormField label="Title" htmlFor="thread-title">
                <Input
                  id="thread-title"
                  type="text"
                  placeholder="What do you want to discuss?"
                  className="bg-app-card-hover border-app-border focus-visible:border-accent"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </FormField>

              {/* Tags */}
              <div className="flex flex-col gap-1.5">
                <FormField label="Tags" htmlFor="thread-tags" hint="Comma-separated, up to 8 tags">
                  <Input
                    id="thread-tags"
                    type="text"
                    placeholder="fastapi, backend, career"
                    className="bg-app-card-hover border-app-border focus-visible:border-accent"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                  />
                </FormField>
                {parsedTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {parsedTags.map((tag) => (
                      <Badge key={tag} variant="info" size="md">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Body */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="thread-body"
                  className="text-xs font-semibold uppercase tracking-wider text-text-secondary"
                >
                  Body
                </label>
                <TextArea
                  id="thread-body"
                  variant="autogrow"
                  maxLength={2400}
                  maxHeight={400}
                  placeholder="Share context, constraints, and what feedback you want..."
                  className="min-h-[170px] bg-app-card-hover border-app-border focus-visible:border-accent leading-[1.7]"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                {/* Tone chip row */}
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles size={13} />
                    {toneResult
                      ? `Tone ${toneResult.score.toFixed(2)}${toneResult.warning ? " — warning" : " — clear"}`
                      : "No tone check yet"}
                  </span>
                  <span className={bodyCount > 1800 ? "text-warning" : ""}>
                    {bodyCount}/2400
                  </span>
                </div>
              </div>

              {/* Error */}
              {errorMessage ? (
                <div className="rounded-[10px] border border-destructive/35 bg-destructive/10 px-3 py-2.5 text-xs text-red-300">
                  {errorMessage}
                </div>
              ) : null}

              {/* Actions */}
              <div className="flex flex-col gap-2.5 border-t border-app-border pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-[10px] border border-app-border bg-app-card-hover px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-app-border/80 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto w-full"
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
                  className="inline-flex items-center justify-center rounded-[10px] bg-accent px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto w-full"
                  disabled={isSubmitting}
                  onClick={() => createThread(false)}
                >
                  {isSubmitting ? "Creating..." : "Create Thread"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Tone warning modal */}
      {showToneModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,8,13,0.7)] p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tone-modal-title"
        >
          <div className="w-full max-w-[540px] rounded-2xl border border-app-border bg-app-panel p-5">
            <h3 id="tone-modal-title" className="mb-2 font-serif text-[28px]">Tone Warning</h3>
            <p className="mb-3.5 text-sm text-text-secondary">
              Your draft may read as harsh. You can edit first or post anyway.
            </p>

            <div className="mb-2 rounded-[10px] border border-app-border bg-app-card-hover px-3 py-2.5 text-xs">
              Score: {toneResult ? toneResult.score.toFixed(2) : "-"}
            </div>
            {toneResult?.reason ? (
              <div className="mb-2 rounded-[10px] border border-app-border bg-app-card-hover px-3 py-2.5 text-xs">
                Reason: {toneResult.reason}
              </div>
            ) : null}
            {toneResult?.suggestion ? (
              <div className="mb-2 rounded-[10px] border border-accent/40 bg-accent/12 px-3 py-2.5 text-xs text-[#7dd3fc]">
                Suggestion: {toneResult.suggestion}
              </div>
            ) : null}

            <div className="mt-3.5 flex justify-end gap-2.5">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-[10px] border border-app-border bg-app-card-hover px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-app-border/80"
                onClick={() => {
                  setShowToneModal(false);
                  setToneApproved(false);
                }}
              >
                Edit Draft
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-[10px] bg-accent px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent/90"
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
