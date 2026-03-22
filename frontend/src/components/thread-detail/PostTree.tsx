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
    <div className="group flex gap-3 py-5">
      {/* Avatar */}
      <UserHoverCard
        userId={post.author_id}
        username={username || ""}
        displayName={displayName}
        bio={null}
        isBot={post.author_is_bot}
      >
        <Link
          href={profileHref}
          aria-label={`Profile of ${displayName}`}
          className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/50 focus-visible:outline-offset-1 shrink-0 mt-0.5"
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
            style={{ background: `linear-gradient(135deg,${a1},${a2})` }}
          >
            {initials(displayName)}
          </div>
        </Link>
      </UserHoverCard>

      {/* Body */}
      <div className="flex-1 min-w-0">
        {/* Head */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <UserHoverCard
            userId={post.author_id}
            username={username || ""}
            displayName={displayName}
            bio={null}
            isBot={post.author_is_bot}
          >
            <Link
              href={profileHref}
              className="flex items-center gap-1.5 rounded px-1 -ml-1 hover:bg-primary/10 transition-colors duration-150"
            >
              <span className="text-[13px] font-semibold text-foreground">{displayName}</span>
              {username && (
                <span className="text-[11px] text-text-tertiary">@{username}</span>
              )}
              {post.author_is_bot && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-purple-500/40 text-purple-400 bg-purple-500/10 tracking-wide">
                  BOT
                </span>
              )}
            </Link>
          </UserHoverCard>
          <span className="text-[11px] text-text-tertiary">{relativeTime(post.created_at)}</span>
          {post.is_flagged && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 uppercase tracking-wide">
              flagged
            </span>
          )}
        </div>

        {/* Content */}
        <div className="text-[14.5px] leading-[1.7] text-foreground">
          <RichText content={post.content} variant="full" />
        </div>

        {/* Actions — revealed on hover */}
        <div className="flex items-center gap-0.5 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            type="button"
            onClick={() => currentUserId && onLike(post.id)}
            title={currentUserId ? (post.liked_by_me ? "Unlike" : "Like") : "Sign in to like"}
            className={`flex items-center gap-1 text-[12px] px-2 py-1.5 min-h-[36px] rounded-md transition-colors duration-150 cursor-pointer ${
              post.liked_by_me
                ? "text-red-400 hover:bg-red-500/10"
                : "text-text-tertiary hover:text-foreground hover:bg-card-hover"
            }`}
          >
            <Heart size={12} fill={post.liked_by_me ? "currentColor" : "none"} />
            <span>{post.like_count > 0 ? post.like_count : "Like"}</span>
          </button>

          {currentUserId && (
            <button
              type="button"
              onClick={() => onReply(post)}
              className="flex items-center gap-1 text-[12px] px-2 py-1.5 min-h-[36px] rounded-md text-text-tertiary hover:text-foreground hover:bg-card-hover transition-colors duration-150 cursor-pointer"
            >
              <CornerDownRight size={12} />
              <span>Reply</span>
            </button>
          )}

          {isOwner && (
            <>
              <button
                type="button"
                onClick={() => onEdit(post.id, post.content)}
                className="flex items-center gap-1 text-[12px] px-2 py-1.5 min-h-[36px] rounded-md text-text-tertiary hover:text-foreground hover:bg-card-hover transition-colors duration-150 cursor-pointer"
              >
                <Pencil size={12} />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(post.id)}
                className="flex items-center gap-1 text-[12px] px-2 py-1.5 min-h-[36px] rounded-md text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors duration-150 cursor-pointer"
              >
                <Trash2 size={12} />
                <span>Delete</span>
              </button>
            </>
          )}

          {currentUserId && !isOwner && (
            <button
              type="button"
              onClick={() => onReport(post.id)}
              className="flex items-center gap-1 text-[12px] px-2 py-1.5 min-h-[36px] rounded-md text-text-tertiary hover:text-primary hover:bg-primary/10 transition-colors duration-150 cursor-pointer"
            >
              <Flag size={12} />
              <span>Report</span>
            </button>
          )}
        </div>

        {/* Nested replies */}
        {post.children.length > 0 && (
          <div className="mt-3 pl-4 border-l-2 border-border">
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
    <section id="responses">
      <h2
        className="text-[1.5rem] font-bold text-foreground mb-6"
        style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
      >
        Responses ({posts.length})
      </h2>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-text-tertiary border border-dashed border-border rounded-xl">
          <MessageSquare size={26} strokeWidth={1.2} />
          <p className="text-[13px] m-0">No replies yet — start the conversation!</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
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
      )}
    </section>
  );
}
