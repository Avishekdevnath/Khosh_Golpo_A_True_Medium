// frontend/src/components/thread-detail/ThreadHeader.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Flag, Heart, MessageSquare, MoreHorizontal, Pencil } from "lucide-react";

import { profilePathFromUsername, toProfilePath } from "@/lib/profileRouting";
import { avatarSeed, initials, relativeTime } from "@/lib/workspaceUtils";
import RichText from "@/components/shared/RichText";
import UserHoverCard from "@/components/shared/UserHoverCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ThreadOut, UserBrief } from "./useThreadDetail";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export type ThreadStatus = "open" | "closed" | "archived";

function statusTone(s: ThreadStatus) {
  if (s === "open")   return { text: "#3dd68c", bg: "rgba(61,214,140,0.12)",  label: "Open" };
  if (s === "closed") return { text: "#fbbf24", bg: "rgba(251,191,36,0.12)",  label: "Closed" };
  return                      { text: "#9BA3BE", bg: "rgba(155,163,190,0.12)", label: "Archived" };
}

function wasEdited(createdAt: string, updatedAt: string): boolean {
  const created = new Date(createdAt).getTime();
  const updated = new Date(updatedAt).getTime();
  if (Number.isNaN(created) || Number.isNaN(updated)) return createdAt !== updatedAt;
  return updated - created > 1000;
}

function shortId(id: string): string {
  if (/^[a-f0-9]{24}$/i.test(id)) return `Member ${id.slice(-4).toUpperCase()}`;
  return id.replace(/[_-]+/g, " ");
}

function userProfileHref(authorId: string, authorUsername?: string | null): string {
  if (authorUsername?.trim()) return profilePathFromUsername(authorUsername);
  return toProfilePath(authorId);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ThreadHeaderProps {
  thread: ThreadOut;
  userCache: Map<string, UserBrief>;
  currentUserId: string | null;
  canEditThread: boolean;
  isThreadOwner: boolean;
  onBack: () => void;
  onLike: () => void;
  onEditOpen: () => void;
  onReport: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ThreadHeader({
  thread,
  userCache,
  currentUserId,
  canEditThread,
  isThreadOwner,
  onBack,
  onLike,
  onEditOpen,
  onReport,
}: ThreadHeaderProps) {
  const router = useRouter();
  const [av1, av2] = avatarSeed(thread.author_id);
  const tone = statusTone(thread.status);
  const threadWasEdited = wasEdited(thread.created_at, thread.updated_at);

  const cachedAuthor = userCache.get(thread.author_id);
  const authorDisplay = cachedAuthor?.display_name ?? thread.author_display_name ?? shortId(thread.author_id);
  const authorUsername = cachedAuthor?.username ?? thread.author_username ?? undefined;
  const authorProfileHref = userProfileHref(thread.author_id, authorUsername);

  return (
    <>
      {/* Top bar — back + title breadcrumb + status */}
      <header className="flex items-center gap-2.5 px-4 py-3 border-b border-[#1c1f2e] flex-shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex-shrink-0 inline-flex items-center gap-1.5 border border-[#1c1f2e] bg-[#151821] text-[#9ba3be] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-150 hover:text-[#e4e8f4] hover:border-[#2d3450] cursor-pointer"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <span className="flex-1 text-[13px] font-semibold text-[#9ba3be] overflow-hidden text-ellipsis whitespace-nowrap">
          {thread.title}
        </span>
        <span
          className="flex-shrink-0 rounded-[7px] text-[10px] font-bold uppercase tracking-[0.08em] px-2.5 py-[3px]"
          style={{ color: tone.text, background: tone.bg }}
        >
          {tone.label}
        </span>
      </header>

      {/* Thread body block */}
      <div className="px-5 py-[18px] border-b border-[#1c1f2e] flex-shrink-0">
        <div className="flex gap-3.5">
          <UserHoverCard
            userId={thread.author_id}
            username={authorUsername || ""}
            displayName={authorDisplay}
            bio={null}
          >
            <Link
              href={authorProfileHref}
              className="inline-flex no-underline rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(14,165,233,0.45)] focus-visible:outline-offset-1"
              aria-label={`Open profile of ${authorDisplay}`}
            >
              <div
                className="w-10 h-10 rounded-full grid place-items-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: `linear-gradient(135deg,${av1},${av2})` }}
              >
                {initials(authorDisplay)}
              </div>
            </Link>
          </UserHoverCard>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              {/* Meta: author + time */}
              <div className="flex items-center gap-2 flex-wrap">
                <UserHoverCard
                  userId={thread.author_id}
                  username={authorUsername || ""}
                  displayName={authorDisplay}
                  bio={null}
                >
                  <Link
                    href={authorProfileHref}
                    className="flex items-center gap-1.5 no-underline rounded-md px-1.5 py-0.5 transition-all duration-150 hover:bg-[rgba(14,165,233,0.12)] cursor-pointer"
                  >
                    <span className="text-[13px] font-semibold text-[#e4e8f4]">{authorDisplay}</span>
                    {authorUsername && (
                      <span className="text-[11px] text-[#9ba3be]">@{authorUsername}</span>
                    )}
                  </Link>
                </UserHoverCard>
                <span className="text-[11px] text-[#9ba3be]">{relativeTime(thread.created_at)}</span>
                {threadWasEdited && (
                  <span className="text-[10px] text-[#9ba3be] border border-[#1c1f2e] bg-[#181b27] rounded-full px-[7px] py-px font-semibold">
                    Edited {relativeTime(thread.updated_at)}
                  </span>
                )}
              </div>

              {/* Head actions: like + menu */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={onLike}
                  title={currentUserId ? (thread.liked_by_me ? "Unlike" : "Like this thread") : "Sign in to like"}
                  className={[
                    "inline-flex items-center gap-1 border-none bg-transparent text-xs px-2 py-[3px] rounded-md transition-all duration-150 cursor-pointer font-[inherit]",
                    thread.liked_by_me
                      ? "text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)]"
                      : "text-[#9ba3be] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)]",
                  ].join(" ")}
                >
                  <Heart size={13} fill={thread.liked_by_me ? "currentColor" : "none"} />
                  {thread.like_count > 0 ? thread.like_count : "Like"}
                </button>
                {currentUserId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="border border-[#1c1f2e] bg-[#151821] text-[#9ba3be] rounded-lg w-[30px] h-[30px] grid place-items-center cursor-pointer transition-all duration-150 flex-shrink-0 hover:text-[#e4e8f4] hover:border-[#2d3450] hover:bg-[#1a1f30]"
                        aria-label="Thread options"
                        title="Thread options"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      sideOffset={6}
                      className="w-40 border-[#1c1f2e] bg-[#0f1117] text-[#e4e8f4]"
                    >
                      {canEditThread && (
                        <DropdownMenuItem onClick={onEditOpen}>
                          <Pencil size={12} /> Edit thread
                        </DropdownMenuItem>
                      )}
                      {!isThreadOwner && (
                        <DropdownMenuItem
                          onClick={onReport}
                          className="text-[#0EA5E9] focus:text-[#0EA5E9] focus:bg-sky-500/10"
                        >
                          <Flag size={12} /> Report thread
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Title */}
            <h1 className="font-serif text-[22px] leading-[1.25] mb-2.5 mt-0 text-[#e4e8f4]">
              {thread.title}
            </h1>

            {/* Body */}
            <RichText content={thread.body} variant="full" className="mb-3" />

            {/* Tags */}
            {thread.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {thread.tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => router.push(`/threads?tag=${encodeURIComponent(t)}`)}
                    className="border border-[rgba(129,140,248,0.25)] text-[#818CF8] bg-[rgba(129,140,248,0.1)] rounded-full text-[10px] font-semibold px-2 py-0.5 cursor-pointer transition-all duration-150 font-[inherit] hover:bg-[rgba(129,140,248,0.2)] hover:border-[rgba(129,140,248,0.4)]"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="flex gap-3.5 text-[#9ba3be] text-xs items-center">
              <span className="inline-flex items-center gap-[5px]">
                <MessageSquare size={13} />
                {thread.post_count} {thread.post_count === 1 ? "reply" : "replies"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
