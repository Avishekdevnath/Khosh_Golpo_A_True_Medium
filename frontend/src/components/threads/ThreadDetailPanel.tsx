"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageSquare,
  Pencil,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { profilePathFromUsername, toProfilePath } from "@/lib/profileRouting";
import { useAuthStore } from "@/store/authStore";
import { useMentionSuggest } from "@/hooks/useMentionSuggest";
import { avatarSeed, initials, relativeTime } from "@/lib/workspaceUtils";
import RichText from "@/components/shared/RichText";
import type { ThreadOut, ThreadStatus } from "@/components/threads/useThreadsPage";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToneCheckResponse = {
  score: number;
  warning: boolean;
  flagged: boolean;
  suggestion: string | null;
  reason: string | null;
};

type PostOut = {
  id: string;
  thread_id: string;
  author_id: string;
  author_username?: string | null;
  author_display_name?: string | null;
  parent_post_id?: string | null;
  content: string;
  like_count: number;
  liked_by_me: boolean;
  created_at: string;
};

type PostNode = PostOut & {
  children?: PostNode[];
};

type PostListResponse = {
  data: PostNode[];
  total: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusTone(status: ThreadStatus) {
  if (status === "open")   return { className: "border-success/20 bg-success/12 text-success", label: "Open" };
  if (status === "closed") return { className: "border-border bg-secondary text-text-tertiary", label: "Closed" };
  return                        { className: "border-border bg-secondary text-text-tertiary", label: "Archived" };
}

function shortId(id: string): string {
  if (/^[a-f0-9]{24}$/i.test(id)) return `Member ${id.slice(-4).toUpperCase()}`;
  return id.replace(/[_-]+/g, " ");
}

function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw.split(",")) {
    const tag = t.trim().toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out.slice(0, 8);
}

function userProfileHref(authorId: string, authorUsername?: string | null): string {
  if (authorUsername?.trim()) {
    return profilePathFromUsername(authorUsername);
  }
  return toProfilePath(authorId);
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function MentionDropdown({
  isOpen,
  suggestions,
  selectedIdx,
  query,
  onSelect,
}: {
  isOpen: boolean;
  suggestions: { display_name: string; username: string }[];
  selectedIdx: number;
  query: string | null;
  onSelect: (i: number) => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="absolute bottom-[calc(100%+6px)] left-0 right-0 bg-card border border-border rounded-[10px] overflow-hidden z-[60] shadow-[0_4px_20px_rgba(0,0,0,0.45)]">
      {suggestions.length > 0 ? (
        suggestions.map((s: { display_name: string; username: string }, i: number) => (
          <button
            key={s.username}
            type="button"
            className={`w-full flex items-center gap-2 px-3 py-2 bg-transparent border-none border-b border-border text-left cursor-pointer transition-colors duration-100 font-sans last:border-b-0 ${i === selectedIdx ? "bg-card-hover" : "hover:bg-card-hover"}`}
            onMouseDown={e => { e.preventDefault(); onSelect(i); }}
          >
            <span className="text-[13px] text-foreground font-medium">{s.display_name}</span>
            <span className="text-[11px] text-text-tertiary ml-auto">@{s.username}</span>
          </button>
        ))
      ) : (
        <p className="m-0 px-3 py-2.5 text-[12px] text-text-tertiary italic">
          {query === "" ? "Type a username to search..." : "No users found"}
        </p>
      )}
    </div>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-[rgba(5,7,12,0.72)] flex items-center justify-center z-[1200] p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-[460px] border border-border bg-card rounded-xl p-3.5 shadow-[0_16px_44px_rgba(0,0,0,0.5)] flex flex-col gap-2"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

// ─── DetailPanel ──────────────────────────────────────────────────────────────

export function DetailPanel({
  thread,
  onClose,
  onThreadUpdated,
  onThreadDeleted,
}: {
  thread: ThreadOut | null;
  onClose: () => void;
  onThreadUpdated: (updated: ThreadOut) => void;
  onThreadDeleted: (threadId: string) => void;
}) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<PostNode[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; author: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [threadEditOpen, setThreadEditOpen] = useState(false);
  const [threadEditTitle, setThreadEditTitle] = useState("");
  const [threadEditBody, setThreadEditBody] = useState("");
  const [threadEditTags, setThreadEditTags] = useState("");
  const [threadEditSaving, setThreadEditSaving] = useState(false);
  const [threadDeleteOpen, setThreadDeleteOpen] = useState(false);
  const [postEditId, setPostEditId] = useState<string | null>(null);
  const [postEditText, setPostEditText] = useState("");
  const [postEditSaving, setPostEditSaving] = useState(false);
  const [postDeleteId, setPostDeleteId] = useState<string | null>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const postEditInputRef = useRef<HTMLTextAreaElement>(null);
  const mention = useMentionSuggest();
  const editMention = useMentionSuggest();
  const threadId = thread?.id;

  const replyCount = useMemo(() => {
    const walk = (nodes: PostNode[]): number => (
      nodes.reduce((total, node) => total + 1 + walk(node.children ?? []), 0)
    );
    return walk(posts);
  }, [posts]);

  const canManageThread = Boolean(
    user && thread && (
      user.id === thread.author_id
      || (user.username && thread.author_username && user.username === thread.author_username)
    ),
  );
  const canEditThreadBody = Boolean(thread && thread.post_count === 0);

  function insertReply(nodes: PostNode[], parentId: string, reply: PostNode): PostNode[] {
    return nodes.map(node => {
      if (node.id === parentId) return { ...node, children: [...(node.children ?? []), reply] };
      if ((node.children?.length ?? 0) > 0) return { ...node, children: insertReply(node.children!, parentId, reply) };
      return node;
    });
  }

  async function loadPosts(currentThreadId: string) {
    setPostsLoading(true);
    try {
      const res = await apiGet<PostListResponse>(`threads/${currentThreadId}/posts?limit=20&page=1`);
      setPosts(res.data);
    } catch {
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }

  async function refreshPosts() {
    if (!threadId) return;
    await loadPosts(threadId);
  }

  useEffect(() => {
    if (!threadId) {
      setPosts([]);
      return;
    }
    let cancelled = false;
    setPostsLoading(true);
    apiGet<PostListResponse>(`threads/${threadId}/posts?limit=20&page=1`)
      .then(res => { if (!cancelled) setPosts(res.data); })
      .catch(() => { if (!cancelled) setPosts([]); })
      .finally(() => { if (!cancelled) setPostsLoading(false); });
    return () => { cancelled = true; };
  }, [threadId]);

  useEffect(() => {
    setActionError(null);
    setThreadEditOpen(false);
    setThreadDeleteOpen(false);
    setPostEditId(null);
    setPostDeleteId(null);
    setReplyingTo(null);
  }, [threadId]);

  function openThreadEdit() {
    if (!thread) return;
    setThreadEditTitle(thread.title);
    setThreadEditBody(thread.body);
    setThreadEditTags(thread.tags.join(", "));
    setActionError(null);
    setThreadEditOpen(true);
  }

  async function saveThreadEdit() {
    if (!thread) return;
    const nextTitle = threadEditTitle.trim();
    const nextBody = threadEditBody.trim();
    const nextTags = parseTags(threadEditTags);

    if (!nextTitle) {
      setActionError("Title is required.");
      return;
    }
    if (canEditThreadBody && !nextBody) {
      setActionError("Body is required.");
      return;
    }

    const payload: { title?: string; body?: string; tags?: string[] } = {};
    if (nextTitle !== thread.title) payload.title = nextTitle;
    if (canEditThreadBody && nextBody !== thread.body) payload.body = nextBody;
    if (JSON.stringify(nextTags) !== JSON.stringify(thread.tags)) payload.tags = nextTags;

    if (Object.keys(payload).length === 0) {
      setThreadEditOpen(false);
      return;
    }

    setThreadEditSaving(true);
    try {
      const updated = await apiPatch<ThreadOut>(`threads/${thread.id}`, payload);
      onThreadUpdated(updated);
      setThreadEditOpen(false);
      setActionError(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to update thread.");
    } finally {
      setThreadEditSaving(false);
    }
  }

  async function confirmThreadDelete() {
    if (!thread) return;
    try {
      await apiDelete(`threads/${thread.id}`);
      setThreadDeleteOpen(false);
      onThreadDeleted(thread.id);
      setActionError(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to delete thread.");
      setThreadDeleteOpen(false);
    }
  }

  function openPostEdit(post: PostNode) {
    setPostEditId(post.id);
    setPostEditText(post.content);
    editMention.close();
    setActionError(null);
  }

  async function savePostEdit() {
    if (!postEditId || !postEditText.trim()) return;
    setPostEditSaving(true);
    try {
      await apiPatch(`posts/${postEditId}`, { content: postEditText.trim() });
      setPostEditId(null);
      setActionError(null);
      await refreshPosts();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to update comment.");
    } finally {
      setPostEditSaving(false);
    }
  }

  async function confirmPostDelete() {
    if (!postDeleteId || !thread) return;
    const deletingId = postDeleteId;
    try {
      await apiDelete(`posts/${deletingId}`);
      setPostDeleteId(null);
      setReplyingTo(prev => (prev?.id === deletingId ? null : prev));
      onThreadUpdated({ ...thread, post_count: Math.max(0, thread.post_count - 1) });
      setActionError(null);
      await refreshPosts();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to delete comment.");
      setPostDeleteId(null);
    }
  }

  async function handleReply() {
    if (!replyText.trim() || !thread || replying) return;
    setReplying(true);
    try {
      const payload: { content: string; parent_post_id?: string } = { content: replyText.trim() };
      if (replyingTo) payload.parent_post_id = replyingTo.id;
      const post = await apiPost<PostOut>(`threads/${thread.id}/posts`, payload);
      const newNode: PostNode = { ...post, children: [] };
      if (replyingTo) {
        setPosts(prev => insertReply(prev, replyingTo.id, newNode));
      } else {
        setPosts(prev => [...prev, newNode]);
      }
      onThreadUpdated({ ...thread, post_count: thread.post_count + 1 });
      setReplyText("");
      setReplyingTo(null);
      setActionError(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to post reply.");
    } finally {
      setReplying(false);
    }
  }

  async function handlePanelThreadLike() {
    if (!user || !thread) return;
    const wasLiked = thread.liked_by_me;
    onThreadUpdated({ ...thread, liked_by_me: !wasLiked, like_count: thread.like_count + (wasLiked ? -1 : 1) });
    try {
      await apiPost(`threads/${thread.id}/like`, {});
    } catch {
      onThreadUpdated({ ...thread, liked_by_me: wasLiked, like_count: thread.like_count });
    }
  }

  function togglePostLikeInTree(nodes: PostNode[], postId: string): PostNode[] {
    return nodes.map(n => {
      if (n.id === postId) {
        const wasLiked = n.liked_by_me;
        return { ...n, liked_by_me: !wasLiked, like_count: n.like_count + (wasLiked ? -1 : 1) };
      }
      if (n.children?.length) return { ...n, children: togglePostLikeInTree(n.children, postId) };
      return n;
    });
  }

  async function handlePostLike(postId: string) {
    if (!user || !thread) return;
    setPosts(prev => togglePostLikeInTree(prev, postId));
    try {
      await apiPost(`threads/${thread.id}/posts/${postId}/like`, {});
    } catch {
      setPosts(prev => togglePostLikeInTree(prev, postId));
    }
  }

  function handleReplyChange(e: React.ChangeEvent<HTMLInputElement>) {
    setReplyText(e.target.value);
    mention.check(e.target.value, e.target.selectionStart ?? 0);
  }

  function handlePostEditChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setPostEditText(e.target.value);
    editMention.check(e.target.value, e.target.selectionStart ?? 0);
  }

  function insertMention(idx: number) {
    const username = mention.suggestions[idx]?.username;
    if (!username || !replyInputRef.current) return;
    const el = replyInputRef.current;
    const { newText, newCursor } = mention.buildInsert(replyText, el.selectionStart ?? 0, username);
    setReplyText(newText);
    mention.close();
    requestAnimationFrame(() => {
      el.selectionStart = newCursor;
      el.selectionEnd = newCursor;
      el.focus();
    });
  }

  function insertPostEditMention(idx: number) {
    const username = editMention.suggestions[idx]?.username;
    if (!username || !postEditInputRef.current) return;
    const el = postEditInputRef.current;
    const { newText, newCursor } = editMention.buildInsert(postEditText, el.selectionStart ?? 0, username);
    setPostEditText(newText);
    editMention.close();
    requestAnimationFrame(() => {
      el.selectionStart = newCursor;
      el.selectionEnd = newCursor;
      el.focus();
    });
  }

  function renderReplyChain(post: PostNode, depth = 0) {
    const postAuthor = post.author_display_name ?? post.author_username ?? shortId(post.author_id);
    const postHandle = post.author_username && post.author_display_name ? `@${post.author_username}` : null;
    const postProfileHref = userProfileHref(post.author_id, post.author_username);
    const isPostOwner = Boolean(
      user && (
        user.id === post.author_id
        || (user.username && post.author_username && user.username === post.author_username)
      ),
    );
    const [pa1, pa2] = avatarSeed(post.author_id);

    return (
      <div key={post.id} className={`relative${depth > 0 ? " dp-child-connector" : ""}`}>
        <div className="flex gap-2.5">
          <Link
            href={postProfileHref}
            className="inline-flex no-underline rounded-full focus-visible:outline-2 focus-visible:outline-primary/45"
            aria-label={`Open profile of ${postAuthor}`}
          >
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-1.5"
              style={{ background: `linear-gradient(135deg,${pa1},${pa2})` }}
            >
              {initials(postAuthor)}
            </span>
          </Link>
          <div className="flex-1 min-w-0 border border-border bg-card-hover rounded-[10px] px-2.5 py-2">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <Link
                href={postProfileHref}
                className="inline-flex items-center gap-1.5 no-underline rounded-md px-1 py-0.5 transition-colors duration-150 hover:bg-card-active focus-visible:outline-2 focus-visible:outline-primary/45"
                aria-label={`Open profile of ${postAuthor}`}
              >
                <span className="text-[12px] font-bold text-foreground">{postAuthor}</span>
                {postHandle && <span className="text-[10.5px] text-text-tertiary">{postHandle}</span>}
              </Link>
              <span className="text-[10px] text-text-tertiary" aria-hidden="true">|</span>
              <span className="text-[10.5px] text-text-tertiary font-medium">{relativeTime(post.created_at)}</span>
              {isPostOwner && (
                <div className="ml-auto inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    className="border-none bg-transparent text-text-secondary text-[10.5px] font-semibold px-1.5 py-0.5 rounded cursor-pointer font-sans transition-all duration-150 hover:text-foreground hover:bg-card-active"
                    onClick={() => openPostEdit(post)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="border-none bg-transparent text-text-secondary text-[10.5px] font-semibold px-1.5 py-0.5 rounded cursor-pointer font-sans transition-all duration-150 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setPostDeleteId(post.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
            <RichText content={post.content} variant="compact" className="text-[12.5px]" />
            <div className="flex items-center gap-1 mt-1">
              <button
                type="button"
                className={`border-none bg-transparent text-[11px] inline-flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded transition-all duration-150 font-sans hover:text-destructive hover:bg-destructive/10 ${post.liked_by_me ? "text-destructive" : "text-text-secondary"}`}
                onClick={() => handlePostLike(post.id)}
                title={user ? (post.liked_by_me ? "Unlike" : "Like") : "Sign in to like"}
              >
                <Heart size={11} fill={post.liked_by_me ? "currentColor" : "none"} />
                {post.like_count > 0 ? post.like_count : "Like"}
              </button>
              {user && (
                <button
                  type="button"
                  className="border-none bg-transparent text-text-secondary text-[11px] cursor-pointer px-1.5 py-0.5 rounded font-sans font-medium transition-all duration-150 mt-1 hover:text-primary hover:bg-accent-muted inline-block"
                  onClick={() => setReplyingTo({ id: post.id, author: postAuthor })}
                >
                  Reply
                </button>
              )}
            </div>
          </div>
        </div>
        {(post.children?.length ?? 0) > 0 && (
          depth < 2 ? (
            <div className="mt-2 ml-[18px] pl-3 border-l border-border flex flex-col gap-2">
              {post.children?.map(child => renderReplyChain(child, depth + 1))}
            </div>
          ) : (
            <div className="mt-1.5 flex flex-col gap-1.5">
              {post.children?.map(child => renderReplyChain(child, 2))}
            </div>
          )
        )}
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex flex-col h-full px-5 py-6 overflow-y-auto items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-text-secondary text-[13px]">
          <div className="w-13 h-13 rounded-2xl bg-card-hover border border-border flex items-center justify-center text-text-tertiary">
            <MessageSquare size={22} strokeWidth={1.5} />
          </div>
          <p className="m-0">Select a thread to preview</p>
        </div>
      </div>
    );
  }

  const tone = statusTone(thread.status);
  const authorLabel = thread.author_display_name ?? thread.author_username ?? shortId(thread.author_id);
  const authorProfileHref = userProfileHref(thread.author_id, thread.author_username);
  const [av1, av2] = avatarSeed(thread.author_id);

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 pt-12 relative [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] min-h-0">
        {/* Close button */}
        <button
          type="button"
          className="absolute top-4 right-4 w-7 h-7 rounded-lg border border-border bg-card-hover text-text-tertiary grid place-items-center cursor-pointer transition-all duration-150 hover:text-foreground hover:bg-card-active shrink-0 z-10"
          onClick={onClose}
          aria-label="Close thread preview"
        >
          <X size={14} />
        </button>

        {/* Status + actions row */}
        <div className="flex items-center gap-2 mb-3 shrink-0 pr-10">
          <span className={`inline-flex items-center border-[1px] rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.6px] ${tone.className}`}>
            {tone.label}
          </span>
          <span className="ml-auto text-[12px] text-text-tertiary whitespace-nowrap">{relativeTime(thread.created_at)}</span>
          {canManageThread && (
            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                className="border border-border bg-card-hover text-text-secondary rounded-md text-[11px] font-semibold inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-all duration-150 font-sans hover:text-foreground hover:bg-card-active"
                onClick={openThreadEdit}
              >
                <Pencil size={12} />
                <span>Edit</span>
              </button>
              <button
                type="button"
                className="border border-border bg-card-hover text-text-secondary rounded-md text-[11px] font-semibold inline-flex items-center gap-1 px-2 py-1 cursor-pointer transition-all duration-150 font-sans hover:text-destructive hover:border-destructive/25 hover:bg-destructive/10"
                onClick={() => setThreadDeleteOpen(true)}
              >
                <Trash2 size={12} />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>

        {/* Thread title */}
        <button
          type="button"
          className="font-serif text-[19px] font-bold leading-[1.3] tracking-[-0.4px] m-0 mb-3 text-foreground shrink-0 cursor-pointer border-none bg-transparent text-left p-0 w-full hover:text-primary transition-colors duration-150"
          onClick={() => router.push(`/threads/${thread.id}`)}
        >
          {thread.title}
        </button>

        <RichText content={thread.body} variant="full" className="mb-0" />
        <hr className="border-0 border-t border-border my-5" />

        {/* Tags */}
        {thread.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4 shrink-0">
            {thread.tags.map(tag => (
              <span
                key={tag}
                className="border border-border text-text-secondary bg-card-hover rounded px-2 py-0.5 text-[11px] font-medium transition-all duration-150 hover:bg-card-active hover:text-primary hover:border-primary/20"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Author + like row */}
        <div className="flex items-center gap-2 mt-4 shrink-0 justify-between">
          <Link
            href={authorProfileHref}
            className="inline-flex items-center gap-2 no-underline rounded-lg px-1 py-0.5 transition-colors duration-150 hover:bg-card-active focus-visible:outline-2 focus-visible:outline-primary/45"
            aria-label={`Open profile of ${authorLabel}`}
          >
            <span
              className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ background: `linear-gradient(135deg,${av1},${av2})` }}
            >
              {initials(authorLabel)}
            </span>
            <span className="text-[12.5px] font-semibold text-foreground">{authorLabel}</span>
          </Link>
          <button
            type="button"
            className={`border-none bg-transparent text-[11px] inline-flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded-md transition-all duration-150 font-sans hover:text-destructive hover:bg-destructive/10 ${thread.liked_by_me ? "text-destructive" : "text-text-secondary"}`}
            onClick={handlePanelThreadLike}
            title={user ? (thread.liked_by_me ? "Unlike" : "Like") : "Sign in to like"}
          >
            <Heart size={13} fill={thread.liked_by_me ? "currentColor" : "none"} />
            {thread.like_count > 0 ? thread.like_count : "Like"}
          </button>
        </div>

        {/* Comment section */}
        <div className="mt-6 border-t border-border pt-4">
          {postsLoading ? (
            <p className="text-[13px] text-text-secondary py-3.5 m-0">Loading replies...</p>
          ) : posts.length > 0 ? (
            <>
              <div className="text-[12px] font-bold tracking-[0.04em] text-text-secondary mb-3">
                {replyCount} {replyCount === 1 ? "reply" : "replies"}
              </div>
              <div className="flex flex-col gap-2.5">
                {posts.map(post => renderReplyChain(post))}
              </div>
            </>
          ) : (
            <p className="text-[13px] text-text-secondary py-3.5 m-0">No replies yet. Be the first to reply.</p>
          )}
        </div>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="mx-5 mb-1 border border-destructive/35 bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-[12px] leading-tight">
          {actionError}
        </div>
      )}

      {/* Reply-to bar */}
      {replyingTo && (
        <div className="px-5 py-1.5 bg-accent-muted border-t border-primary/20 text-[12px] text-text-secondary flex items-center gap-1.5 shrink-0">
          <span>Replying to <strong className="text-primary font-semibold">{replyingTo.author}</strong></span>
          <button
            type="button"
            className="ml-auto border-none bg-transparent text-text-tertiary cursor-pointer text-base leading-none px-0.5 transition-colors hover:text-foreground"
            onClick={() => setReplyingTo(null)}
            aria-label="Cancel reply"
          >
            ×
          </button>
        </div>
      )}

      {/* Reply input */}
      <div className="px-5 py-3.5 border-t border-border bg-surface-elevated flex gap-2.5 items-center shrink-0">
        <div className="relative flex-1">
          <input
            ref={replyInputRef}
            className="w-full bg-card-hover border border-border rounded-[9px] px-3.5 py-2.5 text-foreground font-sans text-[13px] outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={user ? (replyingTo ? `Reply to ${replyingTo.author}...` : "Write a reply...") : "Sign in to reply..."}
            value={replyText}
            onChange={handleReplyChange}
            onKeyDown={e => {
              if (mention.onKeyDown(e, insertMention)) return;
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleReply();
              }
            }}
            onBlur={() => setTimeout(mention.close, 150)}
            disabled={!user || replying}
            aria-label="Write a reply"
          />
          <MentionDropdown
            isOpen={mention.isOpen}
            suggestions={mention.suggestions}
            selectedIdx={mention.selectedIdx}
            query={mention.query}
            onSelect={insertMention}
          />
        </div>
        <button
          type="button"
          className="h-9 rounded-[9px] bg-primary border-none cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 text-white transition-all duration-200 shadow-[0_2px_8px_rgba(14,165,233,0.24)] shrink-0 text-[12px] font-bold font-sans hover:enabled:brightness-105 hover:enabled:scale-[1.03] disabled:opacity-45 disabled:cursor-not-allowed"
          onClick={() => void handleReply()}
          disabled={!user || !replyText.trim() || replying}
          aria-label="Send reply"
        >
          <Send size={15} />
          <span>Post</span>
        </button>
      </div>

      {/* Thread edit modal */}
      {threadEditOpen && (
        <ModalOverlay onClose={() => setThreadEditOpen(false)}>
          <div aria-labelledby="thread-edit-modal-title" role="group">
            <h3 id="thread-edit-modal-title" className="m-0 mb-1 text-[15px] text-foreground font-bold">Edit thread</h3>
            <label className="text-[11px] font-semibold text-text-secondary" htmlFor="thread-edit-title">Title</label>
            <input
              id="thread-edit-title"
              className="w-full border border-border rounded-lg bg-card-hover text-foreground px-2.5 py-2 text-[13px] font-sans outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)]"
              value={threadEditTitle}
              onChange={e => setThreadEditTitle(e.target.value)}
              maxLength={160}
            />
            <label className="text-[11px] font-semibold text-text-secondary" htmlFor="thread-edit-body">Body</label>
            <textarea
              id="thread-edit-body"
              className="w-full border border-border rounded-lg bg-card-hover text-foreground px-2.5 py-2 text-[13px] font-sans outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)] resize-y min-h-[92px] leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed"
              value={threadEditBody}
              onChange={e => setThreadEditBody(e.target.value)}
              rows={6}
              disabled={!canEditThreadBody}
            />
            {!canEditThreadBody && (
              <p className="m-0 mt-0.5 text-[12px] text-text-secondary leading-relaxed">Body is locked after the first reply. You can still update title and tags.</p>
            )}
            <label className="text-[11px] font-semibold text-text-secondary" htmlFor="thread-edit-tags">Tags</label>
            <input
              id="thread-edit-tags"
              className="w-full border border-border rounded-lg bg-card-hover text-foreground px-2.5 py-2 text-[13px] font-sans outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)]"
              value={threadEditTags}
              onChange={e => setThreadEditTags(e.target.value)}
              placeholder="career, fastapi, interview"
            />
            <div className="flex justify-end gap-2 mt-1.5">
              <button
                type="button"
                className="border border-border rounded-lg px-3 py-2 text-[12px] font-bold cursor-pointer font-sans transition-all duration-150 bg-card-hover text-text-secondary hover:text-foreground hover:bg-card-active"
                onClick={() => setThreadEditOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="border-none rounded-lg px-3 py-2 text-[12px] font-bold cursor-pointer font-sans transition-all duration-150 bg-primary text-white hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={threadEditSaving || !threadEditTitle.trim() || (canEditThreadBody && !threadEditBody.trim())}
                onClick={() => void saveThreadEdit()}
              >
                {threadEditSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Post edit modal */}
      {postEditId && (
        <ModalOverlay onClose={() => setPostEditId(null)}>
          <div aria-labelledby="comment-edit-modal-title" role="group">
            <h3 id="comment-edit-modal-title" className="m-0 mb-1 text-[15px] text-foreground font-bold">Edit comment</h3>
            <div className="relative">
              <textarea
                ref={postEditInputRef}
                className="w-full border border-border rounded-lg bg-card-hover text-foreground px-2.5 py-2 text-[13px] font-sans outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)] resize-y min-h-[92px] leading-relaxed box-border"
                value={postEditText}
                onChange={handlePostEditChange}
                rows={5}
                onKeyDown={e => { editMention.onKeyDown(e, insertPostEditMention); }}
                onBlur={() => setTimeout(editMention.close, 150)}
              />
              <MentionDropdown
                isOpen={editMention.isOpen}
                suggestions={editMention.suggestions}
                selectedIdx={editMention.selectedIdx}
                query={editMention.query}
                onSelect={insertPostEditMention}
              />
            </div>
            <div className="flex justify-end gap-2 mt-1.5">
              <button
                type="button"
                className="border border-border rounded-lg px-3 py-2 text-[12px] font-bold cursor-pointer font-sans transition-all duration-150 bg-card-hover text-text-secondary hover:text-foreground hover:bg-card-active"
                onClick={() => setPostEditId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="border-none rounded-lg px-3 py-2 text-[12px] font-bold cursor-pointer font-sans transition-all duration-150 bg-primary text-white hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={postEditSaving || !postEditText.trim()}
                onClick={() => void savePostEdit()}
              >
                {postEditSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Post delete confirm */}
      {postDeleteId && (
        <ModalOverlay onClose={() => setPostDeleteId(null)}>
          <div aria-labelledby="comment-delete-modal-title" role="group">
            <h3 id="comment-delete-modal-title" className="m-0 mb-1 text-[15px] text-foreground font-bold">Delete comment</h3>
            <p className="m-0 mt-0.5 text-[12px] text-text-secondary leading-relaxed">Are you sure you want to delete this comment? This action cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-1.5">
              <button
                type="button"
                className="border border-border rounded-lg px-3 py-2 text-[12px] font-bold cursor-pointer font-sans transition-all duration-150 bg-card-hover text-text-secondary hover:text-foreground hover:bg-card-active"
                onClick={() => setPostDeleteId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="border-none rounded-lg px-3 py-2 text-[12px] font-bold cursor-pointer font-sans transition-all duration-150 bg-destructive text-white hover:bg-[#f87171]"
                onClick={() => void confirmPostDelete()}
              >
                Delete
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Thread delete confirm */}
      {threadDeleteOpen && (
        <ModalOverlay onClose={() => setThreadDeleteOpen(false)}>
          <div aria-labelledby="thread-delete-modal-title" role="group">
            <h3 id="thread-delete-modal-title" className="m-0 mb-1 text-[15px] text-foreground font-bold">Delete thread</h3>
            <p className="m-0 mt-0.5 text-[12px] text-text-secondary leading-relaxed">Are you sure you want to delete this thread? This action cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-1.5">
              <button
                type="button"
                className="border border-border rounded-lg px-3 py-2 text-[12px] font-bold cursor-pointer font-sans transition-all duration-150 bg-card-hover text-text-secondary hover:text-foreground hover:bg-card-active"
                onClick={() => setThreadDeleteOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="border-none rounded-lg px-3 py-2 text-[12px] font-bold cursor-pointer font-sans transition-all duration-150 bg-destructive text-white hover:bg-[#f87171]"
                onClick={() => void confirmThreadDelete()}
              >
                Delete
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

// ─── CreatePanel ──────────────────────────────────────────────────────────────

export function CreatePanel({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (thread: ThreadOut) => void;
}) {
  const [title, setTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [body, setBody] = useState("");
  const [bodyPreview, setBodyPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toneResult, setToneResult] = useState<ToneCheckResponse | null>(null);
  const [showToneWarning, setShowToneWarning] = useState(false);
  const [toneApproved, setToneApproved] = useState(false);
  const titleInputId = useId();
  const tagsInputId = useId();
  const bodyInputId = useId();
  const bodyCountId = useId();

  const parsedTags = useMemo(() => parseTags(tagsInput), [tagsInput]);
  const bodyCount = body.length;

  async function runToneCheck(): Promise<ToneCheckResponse> {
    const result = await apiPost<ToneCheckResponse>("ai/tone-check", { content: body });
    setToneResult(result);
    return result;
  }

  async function handleSubmit(skipTone = false) {
    if (!title.trim() || !body.trim()) { setError("Title and body are required."); return; }
    setError(null);
    setIsSubmitting(true);
    try {
      if (!skipTone) {
        const tone = await runToneCheck();
        if (tone.warning) { setShowToneWarning(true); setIsSubmitting(false); return; }
      }
      const created = await apiPost<ThreadOut>("threads", {
        title: title.trim(),
        body: body.trim(),
        tags: parsedTags,
      });
      onCreated(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create thread");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-full px-5 py-5 overflow-y-auto gap-3.5 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent]">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">New Thread</span>
        <button
          type="button"
          className="w-7 h-7 rounded-lg border border-border bg-card-hover text-text-tertiary grid place-items-center cursor-pointer transition-all duration-150 hover:text-foreground hover:bg-card-active"
          onClick={onClose}
          title="Cancel"
          aria-label="Cancel creating thread"
        >
          <X size={14} />
        </button>
      </div>

      <h2 className="font-serif text-[22px] font-bold text-foreground m-0 shrink-0">Start a Discussion</h2>

      {/* Title field */}
      <div className="flex flex-col gap-1.5 shrink-0">
        <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-tertiary" htmlFor={titleInputId}>Title</label>
        <input
          id={titleInputId}
          className="bg-card-hover border border-border rounded-[9px] text-foreground text-[13px] px-3 py-2.5 outline-none font-sans transition-colors duration-150 focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)]"
          placeholder="What do you want to discuss?"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={160}
        />
        <span className="text-[10px] text-text-tertiary text-right -mt-0.5">{title.length}/160</span>
      </div>

      {/* Tags field */}
      <div className="flex flex-col gap-1.5 shrink-0">
        <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-tertiary" htmlFor={tagsInputId}>Tags</label>
        <input
          id={tagsInputId}
          className="bg-card-hover border border-border rounded-[9px] text-foreground text-[13px] px-3 py-2.5 outline-none font-sans transition-colors duration-150 focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)]"
          placeholder="fastapi, backend, career"
          value={tagsInput}
          onChange={e => setTagsInput(e.target.value)}
        />
        {parsedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {parsedTags.map(t => (
              <span key={t} className="bg-info/12 border border-info/25 text-info rounded-full text-[11px] font-semibold px-2 py-0.5">#{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Body field */}
      <div className="flex flex-col gap-1.5 flex-1" style={{ display: "flex", flexDirection: "column" }}>
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-tertiary" htmlFor={bodyInputId}>Body</label>
          <div className="flex gap-0.5">
            <button
              type="button"
              className={`border-none bg-transparent cursor-pointer text-[11px] font-semibold px-2.5 py-0.5 rounded-md transition-colors duration-150 font-sans disabled:opacity-30 disabled:cursor-not-allowed ${!bodyPreview ? "text-primary bg-accent-muted" : "text-text-secondary hover:text-foreground hover:bg-card-hover"}`}
              onClick={() => setBodyPreview(false)}
            >
              Write
            </button>
            <button
              type="button"
              className={`border-none bg-transparent cursor-pointer text-[11px] font-semibold px-2.5 py-0.5 rounded-md transition-colors duration-150 font-sans disabled:opacity-30 disabled:cursor-not-allowed ${bodyPreview ? "text-primary bg-accent-muted" : "text-text-secondary hover:text-foreground hover:bg-card-hover"}`}
              onClick={() => setBodyPreview(true)}
              disabled={!body.trim()}
            >
              Preview
            </button>
          </div>
        </div>
        {bodyPreview ? (
          <div className="flex-1 min-h-[140px] bg-card-hover border border-border rounded-[9px] px-3 py-2.5 overflow-y-auto">
            <RichText content={body} variant="full" />
          </div>
        ) : (
          <textarea
            id={bodyInputId}
            className="flex-1 min-h-[140px] bg-card-hover border border-border rounded-[9px] text-foreground text-[13px] px-3 py-2.5 outline-none font-sans leading-[1.65] resize-y transition-colors duration-150 focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)]"
            placeholder={"Share context, ask for feedback…\n\n**bold** *italic* `code`\n> blockquote\n- list item"}
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={2400}
            aria-describedby={bodyCountId}
          />
        )}
        <div className="flex justify-between items-center mt-1.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary">
            <Sparkles size={11} />
            {toneResult
              ? `Tone ${toneResult.score.toFixed(2)} ${toneResult.warning ? "· warning" : "· clear"}`
              : "No tone check yet"}
          </span>
          <span id={bodyCountId} className={`text-[11px] ${bodyCount > 1800 ? "text-warning" : "text-text-secondary"}`}>{bodyCount}/2400</span>
        </div>
      </div>

      {/* Tone warning */}
      {showToneWarning && toneResult && (
        <div className="border border-warning/35 bg-warning/8 rounded-xl px-3.5 py-3 shrink-0">
          <p className="text-[13px] font-bold text-warning mb-1.5 m-0">Tone Warning</p>
          <p className="text-[12px] text-text-secondary mb-1.5 m-0">{toneResult.reason ?? "Your draft may read as harsh."}</p>
          {toneResult.suggestion && (
            <p className="text-[12px] text-primary border-l-2 border-primary/20 pl-2 mb-2.5 m-0">{toneResult.suggestion}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="flex-1 border border-border bg-card-hover text-text-secondary rounded-[9px] py-2.5 text-[12px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-all duration-150 font-sans hover:text-foreground hover:bg-card-active disabled:opacity-45 disabled:cursor-not-allowed"
              onClick={() => setShowToneWarning(false)}
            >
              Edit Draft
            </button>
            <button
              type="button"
              className="flex-[1.4] bg-primary text-white border-none rounded-[9px] py-2.5 text-[12px] font-bold cursor-pointer shadow-[0_4px_14px_rgba(14,165,233,0.30)] transition-all duration-150 font-sans hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed"
              onClick={async () => {
                if (toneApproved) return;
                setToneApproved(true);
                setShowToneWarning(false);
                await handleSubmit(true);
                setToneApproved(false);
              }}
            >
              Post Anyway
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border border-destructive/35 bg-destructive/10 text-destructive/80 rounded-[9px] px-3 py-2 text-[12px] shrink-0">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-border shrink-0">
        <button
          type="button"
          className="flex-1 border border-border bg-card-hover text-text-secondary rounded-[9px] py-2.5 text-[12px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-all duration-150 font-sans hover:text-foreground hover:bg-card-active disabled:opacity-45 disabled:cursor-not-allowed"
          disabled={!body.trim() || isSubmitting}
          onClick={async () => { try { setError(null); await runToneCheck(); } catch { setError("Tone check failed"); } }}
        >
          <Sparkles size={13} /> Check Tone
        </button>
        <button
          type="button"
          className="flex-[1.4] bg-primary text-white border-none rounded-[9px] py-2.5 text-[12px] font-bold cursor-pointer shadow-[0_4px_14px_rgba(14,165,233,0.30)] transition-all duration-150 font-sans hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed"
          disabled={isSubmitting || !title.trim() || !body.trim()}
          onClick={() => handleSubmit(false)}
        >
          {isSubmitting ? "Creating…" : "Create Thread"}
        </button>
      </div>
    </div>
  );
}
