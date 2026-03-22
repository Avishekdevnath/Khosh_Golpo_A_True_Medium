// frontend/src/components/thread-detail/ReplyComposer.tsx
"use client";

import Link from "next/link";
import { useRef } from "react";
import { CornerDownRight, Send, X } from "lucide-react";

import { avatarSeed, initials } from "@/lib/workspaceUtils";
import { useMentionSuggest } from "@/hooks/useMentionSuggest";
import RichText from "@/components/shared/RichText";
import { TextArea } from "@/components/ui/textarea";
import type { PostNode, UserBrief } from "./useThreadDetail";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortId(id: string): string {
  if (/^[a-f0-9]{24}$/i.test(id)) return `Member ${id.slice(-4).toUpperCase()}`;
  return id.replace(/[_-]+/g, " ");
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReplyComposerProps {
  reply: string;
  setReply: (v: string) => void;
  posting: boolean;
  replyErr: string | null;
  replyPreview: boolean;
  setReplyPreview: (v: boolean) => void;
  replyToPost: PostNode | null;
  setReplyToPost: (p: PostNode | null) => void;
  userCache: Map<string, UserBrief>;
  currentUser: { id: string; display_name?: string | null; username?: string | null } | null;
  onSubmit: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReplyComposer({
  reply,
  setReply,
  posting,
  replyErr,
  replyPreview,
  setReplyPreview,
  replyToPost,
  setReplyToPost,
  userCache,
  currentUser,
  onSubmit,
}: ReplyComposerProps) {
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const mention = useMentionSuggest();

  const sidebarName = currentUser?.display_name ?? currentUser?.username ?? "Guest";
  const [sav1, sav2] = avatarSeed(currentUser?.id ?? "guest");

  const replyToName = replyToPost
    ? (userCache.get(replyToPost.author_id)?.display_name ?? shortId(replyToPost.author_id))
    : "";

  function handleReplyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setReply(e.target.value);
    mention.check(e.target.value, e.target.selectionStart ?? 0);
  }

  function insertMention(idx: number) {
    const username = mention.suggestions[idx]?.username;
    if (!username || !replyRef.current) return;
    const el = replyRef.current;
    const { newText, newCursor } = mention.buildInsert(reply, el.selectionStart ?? 0, username);
    setReply(newText);
    mention.close();
    requestAnimationFrame(() => {
      el.selectionStart = newCursor;
      el.selectionEnd = newCursor;
      el.focus();
    });
  }

  return (
    <div className="mb-10">
      {replyErr && (
        <div className="border border-red-500/30 bg-red-500/10 text-red-300 rounded-lg px-3 py-2 text-[13px] mb-3">
          {replyErr}
        </div>
      )}

      {replyToPost && (
        <div className="flex items-center gap-2 bg-primary/8 border border-primary/20 rounded-lg px-3 py-2 mb-3 text-[12px] text-primary/80">
          <CornerDownRight size={12} className="shrink-0" />
          <span>
            Replying to <strong>{replyToName}</strong>
          </span>
          <span className="text-text-tertiary flex-1 min-w-0 truncate">
            {replyToPost.content.slice(0, 60)}{replyToPost.content.length > 60 ? "…" : ""}
          </span>
          <button
            type="button"
            onClick={() => setReplyToPost(null)}
            className="text-text-tertiary cursor-pointer p-0.5 rounded hover:text-foreground hover:bg-card-hover transition-colors duration-150 shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {currentUser ? (
        <div className="flex gap-3 items-start">
          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5"
            style={{ background: `linear-gradient(135deg,${sav1},${sav2})` }}
          >
            {initials(sidebarName)}
          </div>

          {/* Input card */}
          <div className="relative flex-1 border border-border rounded-xl bg-card transition-colors duration-150 focus-within:border-primary/60">
            {/* Write / Preview tabs */}
            <div className="flex items-center border-b border-border px-1">
              <button
                type="button"
                onClick={() => setReplyPreview(false)}
                className={`text-[12px] font-medium px-3 py-2 border-b-2 -mb-px transition-colors duration-150 cursor-pointer ${
                  !replyPreview
                    ? "text-primary border-b-primary"
                    : "text-text-tertiary border-b-transparent hover:text-foreground"
                }`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setReplyPreview(true)}
                disabled={!reply.trim()}
                className={`text-[12px] font-medium px-3 py-2 border-b-2 -mb-px transition-colors duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  replyPreview
                    ? "text-primary border-b-primary"
                    : "text-text-tertiary border-b-transparent hover:text-foreground"
                }`}
              >
                Preview
              </button>
            </div>

            {replyPreview ? (
              <div className="min-h-[80px] px-3 py-3 text-[14px] leading-[1.7]">
                <RichText content={reply} variant="full" />
              </div>
            ) : (
              <>
                <TextArea
                  ref={replyRef}
                  variant="autogrow"
                  value={reply}
                  onChange={handleReplyChange}
                  placeholder={replyToPost ? `Reply to ${replyToName}…` : "Write a response…"}
                  rows={3}
                  maxLength={2000}
                  onKeyDown={(e) => {
                    if (mention.onKeyDown(e, insertMention)) return;
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onSubmit();
                  }}
                  onBlur={() => setTimeout(mention.close, 150)}
                  className="border-none rounded-none bg-transparent focus:ring-0 focus:border-transparent text-[14px] leading-[1.7] min-h-[80px]"
                />
                {mention.isOpen && (
                  <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-background border border-border rounded-xl overflow-hidden z-50 shadow-lg">
                    {mention.suggestions.length > 0 ? (
                      mention.suggestions.map((s, i) => (
                        <button
                          key={s.username}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); insertMention(i); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer transition-colors duration-100 border-b border-border last:border-b-0 ${
                            i === mention.selectedIdx ? "bg-card-hover" : "hover:bg-card-hover"
                          }`}
                        >
                          <span className="text-[13px] text-foreground font-medium">{s.display_name}</span>
                          <span className="text-[11px] text-text-tertiary ml-auto">@{s.username}</span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2.5 text-[12px] text-text-tertiary italic m-0">
                        {mention.query === "" ? "Type a username…" : "No users found"}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-border">
              <span className="text-[11px] text-text-tertiary font-mono">
                **bold** *italic* `code`
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-text-tertiary">{reply.length}/2000</span>
                <button
                  type="button"
                  disabled={posting || !reply.trim()}
                  onClick={onSubmit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-primary text-white cursor-pointer transition-all duration-150 hover:enabled:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Send size={12} />
                  <span>{posting ? "Posting…" : "Respond"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-[14px] text-text-secondary border border-dashed border-border rounded-xl">
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
          {" "}to join the conversation
        </div>
      )}
    </div>
  );
}
