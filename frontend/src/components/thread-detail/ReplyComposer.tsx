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
    <div className="border-t border-[#1c1f2e] px-5 py-3.5 pb-4 flex-shrink-0 bg-[#0f1117] max-md:sticky max-md:bottom-0 max-md:z-[5]">
      {replyErr && (
        <div className="border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.1)] text-[#fca5a5] rounded-lg px-2.5 py-1.5 text-xs mb-2">
          {replyErr}
        </div>
      )}

      {replyToPost && (
        <div className="flex items-center gap-2 bg-[rgba(129,140,248,0.08)] border border-[rgba(129,140,248,0.2)] rounded-lg px-2.5 py-1.5 mb-2 text-xs text-[#a5b4fc]">
          <CornerDownRight size={12} />
          <span>
            Replying to <strong>{replyToName}</strong>
          </span>
          <span className="text-[#9ba3be] text-[11px] flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
            {replyToPost.content.slice(0, 60)}
            {replyToPost.content.length > 60 ? "…" : ""}
          </span>
          <button
            type="button"
            onClick={() => setReplyToPost(null)}
            className="border-none bg-transparent text-[#9ba3be] cursor-pointer flex p-0.5 rounded flex-shrink-0 transition-all duration-150 hover:text-[#e4e8f4] hover:bg-[#1a1d2a]"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {currentUser ? (
        <div className="flex gap-2.5 items-start">
          {/* User avatar */}
          <div
            className="w-[34px] h-[34px] rounded-full grid place-items-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5"
            style={{ background: `linear-gradient(135deg,${sav1},${sav2})` }}
          >
            {initials(sidebarName)}
          </div>

          {/* Input wrap */}
          <div className="relative flex-1 border-[1.5px] border-[#1c1f2e] rounded-xl bg-[#151821] transition-colors duration-150 focus-within:border-[#0EA5E9]">
            {/* Write / Preview tabs */}
            <div className="flex items-center gap-0 border-b border-[#1a1f2e] px-1 bg-transparent">
              <button
                type="button"
                onClick={() => setReplyPreview(false)}
                className={[
                  "border-none bg-transparent cursor-pointer text-[11px] font-semibold px-2.5 py-[7px] transition-colors duration-150 font-[inherit] border-b-2 -mb-px",
                  !replyPreview
                    ? "text-[#0EA5E9] border-b-[#0EA5E9]"
                    : "text-[#3d4460] border-b-transparent hover:text-[#7a849e]",
                ].join(" ")}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setReplyPreview(true)}
                disabled={!reply.trim()}
                className={[
                  "border-none bg-transparent cursor-pointer text-[11px] font-semibold px-2.5 py-[7px] transition-colors duration-150 font-[inherit] border-b-2 -mb-px disabled:opacity-30 disabled:cursor-not-allowed",
                  replyPreview
                    ? "text-[#0EA5E9] border-b-[#0EA5E9]"
                    : "text-[#3d4460] border-b-transparent hover:text-[#7a849e]",
                ].join(" ")}
              >
                Preview
              </button>
            </div>

            {replyPreview ? (
              <div className="min-h-16 bg-transparent px-3 py-2.5 w-full box-border">
                <RichText content={reply} variant="full" />
              </div>
            ) : (
              <>
                <TextArea
                  ref={replyRef}
                  variant="autogrow"
                  value={reply}
                  onChange={handleReplyChange}
                  placeholder={replyToPost ? `Reply to ${replyToName}…` : "Write a reply…"}
                  rows={2}
                  maxLength={2000}
                  onKeyDown={(e) => {
                    if (mention.onKeyDown(e, insertMention)) return;
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onSubmit();
                  }}
                  onBlur={() => setTimeout(mention.close, 150)}
                  className="border-none rounded-none bg-transparent focus:ring-0 focus:border-transparent text-[13px] min-h-16 font-[inherit]"
                />
                {mention.isOpen && (
                  <div className="absolute bottom-[calc(100%+6px)] left-0 right-0 bg-[#0f1117] border border-[#1c1f2e] rounded-[10px] overflow-hidden z-60 shadow-[0_4px_20px_rgba(0,0,0,0.45)]">
                    {mention.suggestions.length > 0 ? (
                      mention.suggestions.map((s, i) => (
                        <button
                          key={s.username}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            insertMention(i);
                          }}
                          className={[
                            "w-full flex items-center gap-2 px-3 py-2 bg-transparent border-none border-b border-b-[#151821] text-left cursor-pointer transition-colors duration-100 font-[inherit]",
                            "last:border-b-0",
                            i === mention.selectedIdx ? "bg-[#151821]" : "hover:bg-[#151821]",
                          ].join(" ")}
                        >
                          <span className="text-[13px] text-[#e4e8f4] font-medium">{s.display_name}</span>
                          <span className="text-[11px] text-[#5a6480] ml-auto">@{s.username}</span>
                        </button>
                      ))
                    ) : (
                      <p className="m-0 px-3 py-2.5 text-xs text-[#5a6480] italic">
                        {mention.query === "" ? "Type a username to search…" : "No users found"}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Footer row */}
            <div className="flex items-center justify-between px-2.5 py-1.5 pb-2 border-t border-[#1a1f2e]">
              <span className="text-[10px] text-[#2e3450] font-mono tracking-[0.02em]">
                **bold** *italic* `code` &gt; quote
              </span>
              <span className="text-[10px] text-[#2e3450]">
                {reply.length}/2000 · Ctrl+Enter
              </span>
            </div>
          </div>

          {/* Send button */}
          <button
            type="button"
            disabled={posting || !reply.trim()}
            onClick={onSubmit}
            className="w-[34px] h-[34px] rounded-[9px] border-none bg-[#0EA5E9] text-white grid place-items-center cursor-pointer flex-shrink-0 mt-0.5 shadow-[0_3px_10px_rgba(14,165,233,0.28)] transition-all duration-150 hover:enabled:opacity-[0.88] hover:enabled:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none"
          >
            <Send size={14} />
          </button>
        </div>
      ) : (
        <div className="text-center py-3.5 text-[13px] text-[#9ba3be] border border-dashed border-[#1c1f2e] rounded-[10px]">
          <Link href="/login" className="text-[#0EA5E9] no-underline font-bold">
            Sign in
          </Link>
          <span> to join the conversation</span>
        </div>
      )}
    </div>
  );
}
