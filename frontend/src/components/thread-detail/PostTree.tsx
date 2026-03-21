// frontend/src/components/thread-detail/PostTree.tsx
"use client";

import Link from "next/link";
import { CornerDownRight, Flag, Heart, MessageSquare, Pencil, Trash2 } from "lucide-react";

import { profilePathFromUsername, toProfilePath } from "@/lib/profileRouting";
import { avatarSeed, initials, relativeTime } from "@/lib/workspaceUtils";
import RichText from "@/components/shared/RichText";
import UserHoverCard from "@/components/shared/UserHoverCard";
import type { PostNode, UserBrief } from "./useThreadDetail";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortId(id: string): string {
  if (/^[a-f0-9]{24}$/i.test(id)) return `Member ${id.slice(-4).toUpperCase()}`;
  return id.replace(/[_-]+/g, " ");
}

function userProfileHref(authorId: string, authorUsername?: string | null): string {
  if (authorUsername?.trim()) return profilePathFromUsername(authorUsername);
  return toProfilePath(authorId);
}

// ─── PostItem ─────────────────────────────────────────────────────────────────

interface PostItemProps {
  post: PostNode;
  currentUserId: string | null;
  currentUsername: string | null;
  userCache: Map<string, UserBrief>;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onReply: (post: PostNode) => void;
  onReport: (postId: string) => void;
  onLike: (postId: string) => void;
}

function PostItem({
  post,
  currentUserId,
  currentUsername,
  userCache,
  onEdit,
  onDelete,
  onReply,
  onReport,
  onLike,
}: PostItemProps) {
  const [a1, a2] = avatarSeed(post.author_id);
  const cached = userCache.get(post.author_id);
  const displayName = cached?.display_name ?? shortId(post.author_id);
  const username = cached?.username ?? post.author_username ?? undefined;
  const profileHref = userProfileHref(post.author_id, username);
  const isOwner =
    (currentUserId !== null && currentUserId === post.author_id) ||
    (currentUsername !== null && post.author_username === currentUsername);

  return (
    <div className="group flex gap-2.5 p-2.5 rounded-[10px] transition-colors duration-150 hover:bg-[rgba(21,25,39,0.6)]">
      <UserHoverCard
        userId={post.author_id}
        username={username || ""}
        displayName={displayName}
        bio={null}
        isBot={post.author_is_bot}
      >
        <Link
          href={profileHref}
          className="inline-flex no-underline rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(14,165,233,0.45)] focus-visible:outline-offset-1"
          aria-label={`Open profile of ${displayName}`}
        >
          <div
            className="w-8 h-8 rounded-full grid place-items-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5"
            style={{ background: `linear-gradient(135deg,${a1},${a2})` }}
          >
            {initials(displayName)}
          </div>
        </Link>
      </UserHoverCard>

      <div className="flex-1 min-w-0">
        {/* Head */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <UserHoverCard
            userId={post.author_id}
            username={username || ""}
            displayName={displayName}
            bio={null}
            isBot={post.author_is_bot}
          >
            <Link
              href={profileHref}
              className="flex items-center gap-1.5 no-underline cursor-pointer rounded-md px-1.5 py-0.5 transition-all duration-150 hover:bg-[rgba(14,165,233,0.12)]"
            >
              <span className="text-[13px] font-semibold text-[#e4e8f4]">{displayName}</span>
              {username && <span className="text-[11px] text-[#9ba3be]">@{username}</span>}
              {post.author_is_bot && (
                <span className="text-[10px] font-bold px-[5px] py-0.5 rounded border border-[rgba(129,140,248,0.5)] text-[#a5b4fc] bg-[rgba(129,140,248,0.1)] tracking-[0.04em]">
                  BOT
                </span>
              )}
            </Link>
          </UserHoverCard>
          <span className="text-[11px] text-[#9ba3be]">{relativeTime(post.created_at)}</span>
          {post.is_flagged && (
            <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-[#ef4444] bg-[rgba(239,68,68,0.12)] rounded-[5px] px-1.5 py-0.5">
              flagged
            </span>
          )}
        </div>

        <RichText content={post.content} variant="full" />

        {/* Actions */}
        <div className="flex gap-1.5 mt-1.5">
          <button
            type="button"
            onClick={() => currentUserId && onLike(post.id)}
            title={currentUserId ? (post.liked_by_me ? "Unlike" : "Like") : "Sign in to like"}
            className={[
              "border-none bg-transparent text-[11px] inline-flex items-center gap-1 cursor-pointer px-1.5 py-[3px] rounded-[5px] transition-all duration-150 font-[inherit]",
              post.liked_by_me
                ? "text-[#ef4444] hover:bg-[rgba(239,68,68,0.12)]"
                : "text-[rgba(99,111,141,0.5)] group-hover:text-[#9ba3be] hover:text-[#e4e8f4] hover:bg-[#1a1d2a]",
            ].join(" ")}
          >
            <Heart size={11} fill={post.liked_by_me ? "currentColor" : "none"} />
            {post.like_count > 0 ? post.like_count : "Like"}
          </button>

          {currentUserId && (
            <button
              type="button"
              onClick={() => onReply(post)}
              className="border-none bg-transparent text-[rgba(99,111,141,0.5)] group-hover:text-[#9ba3be] text-[11px] inline-flex items-center gap-1 cursor-pointer px-1.5 py-[3px] rounded-[5px] transition-all duration-150 hover:text-[#e4e8f4] hover:bg-[#1a1d2a] font-[inherit]"
            >
              <CornerDownRight size={11} /> Reply
            </button>
          )}

          {isOwner && (
            <>
              <button
                type="button"
                onClick={() => onEdit(post.id, post.content)}
                className="border-none bg-transparent text-[rgba(99,111,141,0.5)] group-hover:text-[#9ba3be] text-[11px] inline-flex items-center gap-1 cursor-pointer px-1.5 py-[3px] rounded-[5px] transition-all duration-150 hover:text-[#e4e8f4] hover:bg-[#1a1d2a] font-[inherit]"
              >
                <Pencil size={11} /> Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(post.id)}
                className="border-none bg-transparent text-[rgba(99,111,141,0.5)] group-hover:text-[#9ba3be] text-[11px] inline-flex items-center gap-1 cursor-pointer px-1.5 py-[3px] rounded-[5px] transition-all duration-150 hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.12)] font-[inherit]"
              >
                <Trash2 size={11} /> Delete
              </button>
            </>
          )}

          {currentUserId && !isOwner && (
            <button
              type="button"
              onClick={() => onReport(post.id)}
              className="border-none bg-transparent text-[rgba(99,111,141,0.5)] group-hover:text-[#9ba3be] text-[11px] inline-flex items-center gap-1 cursor-pointer px-1.5 py-[3px] rounded-[5px] transition-all duration-150 hover:text-[#0EA5E9] hover:bg-[rgba(14,165,233,0.12)] font-[inherit]"
            >
              <Flag size={11} /> Report
            </button>
          )}
        </div>

        {/* Children */}
        {post.children.length > 0 && (
          <div className="ml-2 pl-3.5 border-l-2 border-[#1c1f2e] mt-1">
            {post.children.map((child) => (
              <PostItem
                key={child.id}
                post={child}
                currentUserId={currentUserId}
                currentUsername={currentUsername}
                userCache={userCache}
                onEdit={onEdit}
                onDelete={onDelete}
                onReply={onReply}
                onReport={onReport}
                onLike={onLike}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PostTree ─────────────────────────────────────────────────────────────────

interface PostTreeProps {
  posts: PostNode[];
  currentUserId: string | null;
  currentUsername: string | null;
  userCache: Map<string, UserBrief>;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onReply: (post: PostNode) => void;
  onReport: (postId: string) => void;
  onLike: (postId: string) => void;
}

export default function PostTree({
  posts,
  currentUserId,
  currentUsername,
  userCache,
  onEdit,
  onDelete,
  onReply,
  onReport,
  onLike,
}: PostTreeProps) {
  return (
    <>
      {/* Replies section header */}
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#545c7a] mb-3.5">
        <span>Replies</span>
        <span className="bg-[#181b27] border border-[#1c1f2e] rounded-[99px] text-[10px] px-[7px] py-px text-[#9ba3be] normal-case tracking-normal font-semibold">
          {posts.length}
        </span>
      </div>

      {posts.length === 0 && (
        <div className="border border-dashed border-[#2a3150] rounded-[11px] text-[#9ba3be] text-[13px] text-center px-4 py-7 flex flex-col items-center gap-2.5">
          <MessageSquare size={24} strokeWidth={1.2} />
          <span>No replies yet — start the conversation!</span>
        </div>
      )}

      <div className="flex flex-col gap-0.5">
        {posts.map((p) => (
          <PostItem
            key={p.id}
            post={p}
            currentUserId={currentUserId}
            currentUsername={currentUsername}
            userCache={userCache}
            onEdit={onEdit}
            onDelete={onDelete}
            onReply={onReply}
            onReport={onReport}
            onLike={onLike}
          />
        ))}
      </div>
    </>
  );
}
