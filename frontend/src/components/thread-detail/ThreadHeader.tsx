// frontend/src/components/thread-detail/ThreadHeader.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bookmark, Flag, Heart, MessageSquare, MoreHorizontal, Pencil, Share2 } from "lucide-react";

import { profilePathFromUsername, toProfilePath } from "@/lib/profileRouting";
import { avatarSeed, initials, relativeTime, wasEdited } from "@/lib/workspaceUtils";
import RichText from "@/components/shared/RichText";
import UserHoverCard from "@/components/shared/UserHoverCard";
import { useFollow } from "@/hooks/useFollow";
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

function shortId(id: string): string {
  if (/^[a-f0-9]{24}$/i.test(id)) return `Member ${id.slice(-4).toUpperCase()}`;
  return id.replace(/[_-]+/g, " ");
}

function userProfileHref(authorId: string, authorUsername?: string | null): string {
  if (authorUsername?.trim()) return profilePathFromUsername(authorUsername);
  return toProfilePath(authorId);
}

// ─── FollowButton ─────────────────────────────────────────────────────────────

function FollowButton({ authorId, size = "sm" }: { authorId: string; size?: "sm" | "md" }) {
  const { isFollowing, loading, follow, unfollow } = useFollow(authorId);
  const base =
    size === "md"
      ? "px-4 py-1.5 text-[13px] rounded-full font-medium border transition-colors duration-150 cursor-pointer"
      : "px-3 py-1 text-[12px] rounded-full font-medium border transition-colors duration-150 cursor-pointer";
  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void (isFollowing ? unfollow() : follow())}
      className={`${base} ${
        isFollowing
          ? "border-border text-text-secondary hover:border-red-400 hover:text-red-400"
          : "border-primary text-primary hover:bg-primary hover:text-white"
      } disabled:opacity-50`}
    >
      {loading ? "…" : isFollowing ? "Following" : "Follow"}
    </button>
  );
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
  onSave: () => void;
  onShare: () => void;
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
  onSave,
  onShare,
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

  const reactionBar = (
    <div className="flex items-center justify-between border-t border-b border-border py-2.5">
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={onLike}
          title={currentUserId ? (thread.liked_by_me ? "Unlike" : "Like") : "Sign in to like"}
          className={`flex items-center gap-1.5 text-[13px] transition-colors duration-150 cursor-pointer ${
            thread.liked_by_me ? "text-red-400" : "text-text-secondary hover:text-foreground"
          }`}
        >
          <Heart size={15} fill={thread.liked_by_me ? "currentColor" : "none"} />
          <span>{thread.like_count > 0 ? thread.like_count : "Like"}</span>
        </button>
        <a
          href="#responses"
          className="flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-foreground transition-colors duration-150"
        >
          <MessageSquare size={15} />
          <span>{thread.post_count}</span>
        </a>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          title={currentUserId ? (thread.saved_by_me ? "Unsave" : "Save") : "Sign in to save"}
          aria-label={currentUserId ? (thread.saved_by_me ? "Remove thread from saved" : "Save thread") : "Sign in to save thread"}
          className={`flex size-8 items-center justify-center rounded-full transition-colors duration-150 cursor-pointer ${
            thread.saved_by_me
              ? "text-primary hover:bg-primary/10"
              : "text-text-tertiary hover:bg-card-hover hover:text-foreground"
          }`}
        >
          <Bookmark size={14} fill={thread.saved_by_me ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          onClick={onShare}
          title="Share thread"
          aria-label="Share thread"
          className="flex size-8 items-center justify-center rounded-full text-text-tertiary hover:bg-card-hover hover:text-foreground transition-colors duration-150 cursor-pointer"
        >
          <Share2 size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Sticky back bar ───────────────────────────────────────────────── */}
      <div className="shrink-0 sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border flex items-center gap-3 px-4 h-[49px]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-foreground transition-colors duration-150 shrink-0 cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>
        <span className="flex-1 min-w-0 text-[13px] text-text-secondary truncate hidden sm:block">
          {thread.title}
        </span>
        <span
          className="shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
          style={{ color: tone.text, background: tone.bg }}
        >
          {tone.label}
        </span>
      </div>

      {/* ── Article header ────────────────────────────────────────────────── */}
      <div className="max-w-[680px] mx-auto w-full px-5 sm:px-8 pt-10 pb-8">

        {/* Title */}
        <h1
          className="text-[2.25rem] sm:text-[2.75rem] font-bold leading-[1.12] text-foreground mb-6 tracking-tight"
          style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
        >
          {thread.title}
        </h1>

        {/* Hero image */}
        {thread.image_url && (
          <div className="mb-8 -mx-5 sm:-mx-8 overflow-hidden rounded-sm">
            <img
              src={thread.image_url}
              alt=""
              className="w-full object-cover max-h-[420px]"
            />
          </div>
        )}

        {/* Body */}
        <div
          className="mb-6 text-[19px] leading-[1.8] text-foreground [&_p]:mb-5 [&_p:last-child]:mb-0 [&_blockquote]:border-l-[3px] [&_blockquote]:border-border [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-text-secondary [&_code]:text-[0.85em] [&_pre]:overflow-x-auto [&_h2]:text-[1.5em] [&_h3]:text-[1.25em] [&_h2]:font-bold [&_h3]:font-bold [&_h2]:mt-8 [&_h3]:mt-6"
          style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
        >
          <RichText content={thread.body} variant="full" />
        </div>

        {/* Tags */}
        {thread.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {thread.tags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => router.push(`/threads?tag=${encodeURIComponent(t)}`)}
                className="text-[12px] text-text-secondary bg-card-hover border border-border rounded-full px-3 py-1 hover:text-foreground hover:border-border-strong transition-colors duration-150 cursor-pointer"
              >
                #{t}
              </button>
            ))}
          </div>
        )}

        {/* Author row */}
        <div className="flex items-center gap-3 mb-5">
          <UserHoverCard
            userId={thread.author_id}
            username={authorUsername || ""}
            displayName={authorDisplay}
            bio={null}
          >
            <Link
              href={authorProfileHref}
              aria-label={`Profile of ${authorDisplay}`}
              className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/50 focus-visible:outline-offset-1"
            >
              <div
                className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-[13px] font-bold text-white"
                style={{ background: `linear-gradient(135deg,${av1},${av2})` }}
              >
                {initials(authorDisplay)}
              </div>
            </Link>
          </UserHoverCard>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <UserHoverCard
                userId={thread.author_id}
                username={authorUsername || ""}
                displayName={authorDisplay}
                bio={null}
              >
                <Link
                  href={authorProfileHref}
                  className="text-[14px] font-semibold text-foreground hover:underline"
                >
                  {authorDisplay}
                </Link>
              </UserHoverCard>
              {authorUsername && (
                <span className="text-[12px] text-text-tertiary">@{authorUsername}</span>
              )}
            </div>
            <p className="text-[12px] text-text-tertiary mt-0.5 m-0">
              {relativeTime(thread.created_at)}
              {threadWasEdited && (
                <span className="ml-2 italic">· edited {relativeTime(thread.updated_at)}</span>
              )}
              {" · "}
              {thread.post_count}{" "}
              {thread.post_count === 1 ? "reply" : "replies"}
            </p>
          </div>

          {currentUserId && currentUserId !== thread.author_id && (
            <FollowButton authorId={thread.author_id} />
          )}

          {currentUserId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-full text-text-tertiary hover:bg-card-hover hover:text-foreground transition-colors duration-150 cursor-pointer"
                  aria-label="Thread options"
                >
                  <MoreHorizontal size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={6}
                className="w-44 border-[#1c1f2e] bg-[#0f1117] text-[#e4e8f4]"
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

        {/* Top reaction bar */}
        <div className="mb-8">{reactionBar}</div>

      </div>
    </>
  );
}
