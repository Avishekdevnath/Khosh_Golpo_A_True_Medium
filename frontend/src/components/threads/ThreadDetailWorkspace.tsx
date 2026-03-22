"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, CornerDownRight, Flag, Heart, MessageSquare, MoreHorizontal, Pencil,
  Send, Share2, Trash2, X,
} from "lucide-react";

import { useFollow } from "@/hooks/useFollow";
import MoreFromAuthor from "@/components/threads/article/MoreFromAuthor";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { profilePathFromUsername, toProfilePath } from "@/lib/profileRouting";
import { shareThread } from "@/lib/shareThread";
import { useAuthStore } from "@/store/authStore";
import { useMentionSuggest } from "@/hooks/useMentionSuggest";
import { avatarSeed, initials, relativeTime, wasEdited } from "@/lib/workspaceUtils";
import RichText from "@/components/shared/RichText";
import ReportModal from "@/components/shared/ReportModal";
import UserHoverCard from "@/components/shared/UserHoverCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types ────────────────────────────────────────────────────────────────────

type ThreadStatus = "open" | "closed" | "archived";

type ThreadOut = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  author_id: string;
  author_username?: string | null;
  author_display_name?: string | null;
  post_count: number;
  like_count: number;
  liked_by_me: boolean;
  status: ThreadStatus;
  created_at: string;
  updated_at: string;
  image_url?: string | null;
};

type PostNode = {
  id: string;
  author_id: string;
  author_username?: string | null;
  author_is_bot?: boolean;
  parent_post_id: string | null;
  content: string;
  mentions: string[];
  ai_score: number | null;
  is_flagged: boolean;
  like_count: number;
  liked_by_me: boolean;
  children: PostNode[];
  created_at: string;
};

type PostTreeResponse = { data: PostNode[] };

type UserBrief = { id: string; username: string; display_name: string };

type Toast = { id: number; message: string; type: "success" | "error" };

type ThreadDetailWorkspaceProps = {
  thread: ThreadOut;
  initialPosts: PostNode[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  if (authorUsername?.trim()) {
    return profilePathFromUsername(authorUsername);
  }
  return toProfilePath(authorId);
}

function extractMentions(c: string): string[] {
  const m = c.match(/@([a-zA-Z0-9_-]+)/g) ?? [];
  return [...new Set(m.map(x => x.slice(1).toLowerCase()))];
}

function normalizeTagsInput(raw: string): string[] {
  const clean = raw
    .split(",")
    .map(tag => tag.trim().replace(/^#/, "").toLowerCase())
    .filter(Boolean);
  const deduped: string[] = [];
  for (const tag of clean) {
    if (!deduped.includes(tag)) deduped.push(tag);
  }
  return deduped.slice(0, 10);
}

// ─── Follow button ────────────────────────────────────────────────────────────

function FollowButton({ authorId, size = "sm" }: { authorId: string; size?: "sm" | "md" }) {
  const { isFollowing, loading, follow, unfollow } = useFollow(authorId);
  const base = size === "md"
    ? "px-4 py-1.5 text-[13px] rounded-full font-medium border transition-colors"
    : "px-3 py-1 text-[12px] rounded-full font-medium border transition-colors";
  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void (isFollowing ? unfollow() : follow())}
      className={`${base} ${isFollowing
        ? "border-border text-text-secondary hover:border-destructive hover:text-destructive"
        : "border-primary text-primary hover:bg-primary hover:text-white"
      } disabled:opacity-50`}
    >
      {loading ? "…" : isFollowing ? "Following" : "Follow"}
    </button>
  );
}

// ─── Post item ────────────────────────────────────────────────────────────────

function PostItem({
  post, currentUserId, currentUsername, userCache, onEdit, onDelete, onReply, onReport, onLike,
}: {
  post: PostNode;
  currentUserId: string | null;
  currentUsername: string | null;
  userCache: Map<string, UserBrief>;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onReply: (post: PostNode) => void;
  onReport: (postId: string) => void;
  onLike: (postId: string) => void;
}) {
  const [a1, a2] = avatarSeed(post.author_id);
  const cached = userCache.get(post.author_id);
  const displayName = cached?.display_name ?? shortId(post.author_id);
  const username = cached?.username ?? post.author_username ?? undefined;
  const profileHref = userProfileHref(post.author_id, username);
  const isOwner =
    (currentUserId !== null && currentUserId === post.author_id) ||
    (currentUsername !== null && post.author_username === currentUsername);

  return (
    <div className="flex gap-3 py-5 group">
      {/* Avatar */}
      <UserHoverCard
        userId={post.author_id}
        username={username || ""}
        displayName={displayName}
        bio={null}
        isBot={post.author_is_bot}
      >
        <Link href={profileHref} aria-label={`Profile of ${displayName}`}>
          <div
            className="w-8 h-8 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-[11px] font-bold text-white"
            style={{ background: `linear-gradient(135deg,${a1},${a2})` }}
          >
            {initials(displayName)}
          </div>
        </Link>
      </UserHoverCard>

      {/* Body */}
      <div className="flex-1 min-w-0">
        {/* Head */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mb-2">
          <UserHoverCard
            userId={post.author_id}
            username={username || ""}
            displayName={displayName}
            bio={null}
            isBot={post.author_is_bot}
          >
            <Link
              href={profileHref}
              className="flex items-center gap-1.5 rounded px-1 -ml-1 hover:bg-primary/10 transition-colors"
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
        <div className="text-[14px] leading-relaxed text-foreground">
          <RichText content={post.content} variant="full" />
        </div>

        {/* Actions — visible on hover */}
        <div className="flex items-center gap-0.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            title={currentUserId ? (post.liked_by_me ? "Unlike" : "Like") : "Sign in to like"}
            onClick={() => currentUserId && onLike(post.id)}
            className={`flex items-center gap-1 text-[12px] px-2 py-1 rounded-md transition-colors ${
              post.liked_by_me
                ? "text-red-400"
                : "text-text-tertiary hover:text-foreground hover:bg-card-hover"
            }`}
          >
            <Heart size={11} fill={post.liked_by_me ? "currentColor" : "none"} />
            {post.like_count > 0 ? post.like_count : "Like"}
          </button>

          {currentUserId && (
            <button
              type="button"
              onClick={() => onReply(post)}
              className="flex items-center gap-1 text-[12px] px-2 py-1 rounded-md text-text-tertiary hover:text-foreground hover:bg-card-hover transition-colors"
            >
              <CornerDownRight size={11} /> Reply
            </button>
          )}

          {isOwner && (
            <>
              <button
                type="button"
                onClick={() => onEdit(post.id, post.content)}
                className="flex items-center gap-1 text-[12px] px-2 py-1 rounded-md text-text-tertiary hover:text-foreground hover:bg-card-hover transition-colors"
              >
                <Pencil size={11} /> Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(post.id)}
                className="flex items-center gap-1 text-[12px] px-2 py-1 rounded-md text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={11} /> Delete
              </button>
            </>
          )}

          {currentUserId && !isOwner && (
            <button
              type="button"
              onClick={() => onReport(post.id)}
              className="flex items-center gap-1 text-[12px] px-2 py-1 rounded-md text-text-tertiary hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Flag size={11} /> Report
            </button>
          )}
        </div>

        {/* Children (nested replies) */}
        {post.children.length > 0 && (
          <div className="mt-4 pl-4 border-l-2 border-border">
            {post.children.map(child => (
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ThreadDetailWorkspace({
  thread: initial, initialPosts,
}: ThreadDetailWorkspaceProps) {
  const router = useRouter();
  const { user } = useAuthStore();

  const [thread, setThread] = useState(initial);
  const [posts, setPosts]   = useState(initialPosts);
  const [reply, setReply]   = useState("");
  const [posting, setPosting] = useState(false);
  const [replyErr, setReplyErr] = useState<string | null>(null);
  const [replyPreview, setReplyPreview] = useState(false);
  const [threadEditPreview, setThreadEditPreview] = useState(false);
  const [editPreview, setEditPreview] = useState(false);

  // thread edit modal
  const [threadEditOpen, setThreadEditOpen] = useState(false);
  const [threadEditTitle, setThreadEditTitle] = useState("");
  const [threadEditBody, setThreadEditBody] = useState("");
  const [threadEditTags, setThreadEditTags] = useState("");
  const [threadEditSaving, setThreadEditSaving] = useState(false);

  // reply-to-post
  const [replyToPost, setReplyToPost] = useState<PostNode | null>(null);

  // edit modal
  const [editId, setEditId]       = useState<string | null>(null);
  const [editText, setEditText]   = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // report modal
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportTargetType, setReportTargetType] = useState<"thread" | "post">("post");

  // user identity cache
  const fetchedIds = useRef(new Set<string>());
  const [userCache, setUserCache] = useState<Map<string, UserBrief>>(new Map());

  // mention autocomplete
  const mention = useMentionSuggest();

  // auto-grow textarea
  const replyRef = useRef<HTMLTextAreaElement>(null);

  // toasts
  const toastIdRef = useRef(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [av1, av2] = avatarSeed(thread.author_id);
  const tone = statusTone(thread.status);
  const sidebarName = user?.display_name ?? user?.username ?? "Guest";
  const [sav1, sav2] = avatarSeed(user?.id ?? "guest");
  const isAdmin = user?.role === "admin";
  const isThreadOwner = user?.id === thread.author_id;
  const canEditThread = Boolean(user && (isAdmin || (isThreadOwner && thread.status !== "archived")));
  const canEditThreadBody = Boolean(isAdmin || thread.post_count === 0);
  const threadWasEdited = wasEdited(thread.created_at, thread.updated_at);

  const cachedAuthor = userCache.get(thread.author_id);
  const authorDisplay = cachedAuthor?.display_name ?? thread.author_display_name ?? shortId(thread.author_id);
  const authorUsername = cachedAuthor?.username ?? thread.author_username ?? undefined;
  const authorProfileHref = userProfileHref(thread.author_id, authorUsername);

  // ── Fetch display names for all author IDs ──────────────────────────────────
  useEffect(() => {
    const ids = new Set<string>([thread.author_id]);
    function walk(ps: PostNode[]) {
      for (const p of ps) {
        ids.add(p.author_id);
        if (p.children.length > 0) walk(p.children);
      }
    }
    walk(posts);

    const toFetch = [...ids].filter(id => !fetchedIds.current.has(id));
    if (toFetch.length === 0) return;
    toFetch.forEach(id => fetchedIds.current.add(id));

    Promise.allSettled(
      toFetch.map(id => apiGet<UserBrief>(`users/${id}`).then(u => [id, u] as const))
    ).then(results => {
      setUserCache(prev => {
        const map = new Map(prev);
        for (const r of results) {
          if (r.status === "fulfilled") map.set(r.value[0], r.value[1]);
        }
        return map;
      });
    });
  }, [posts, thread.author_id]);

  // ── Escape key closes modals ────────────────────────────────────────────────
  useEffect(() => {
    if (!editId && !deleteConfirmId && !threadEditOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setEditId(null);
        setDeleteConfirmId(null);
        setThreadEditOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [editId, deleteConfirmId, threadEditOpen]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function showToast(message: string, type: "success" | "error" = "success") {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }

  async function handleShareThread() {
    const result = await shareThread({
      title: thread.title,
      text: thread.body.slice(0, 180),
      url: typeof window !== "undefined" ? window.location.href : `/threads/${thread.id}`,
    });
    if (result.kind === "error") {
      showToast(result.message, "error");
      return;
    }
    if (result.kind !== "cancelled") {
      showToast(result.message);
      if (user?.id) {
        void apiPost(`threads/${thread.id}/share`, {}).catch(() => undefined);
      }
    }
  }

  function handleBackNavigation() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/threads");
  }

  function openThreadEdit() {
    setThreadEditTitle(thread.title);
    setThreadEditBody(thread.body);
    setThreadEditTags(thread.tags.join(", "));
    setThreadEditPreview(false);
    setThreadEditOpen(true);
  }

  async function saveThreadEdit() {
    const nextTitle = threadEditTitle.trim();
    const nextBody = threadEditBody.trim();
    const nextTags = normalizeTagsInput(threadEditTags);

    if (!nextTitle || !nextBody) return;

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
      setThread(updated);
      setThreadEditOpen(false);
      showToast("Thread updated");
    } catch {
      showToast("Failed to update thread", "error");
    } finally {
      setThreadEditSaving(false);
    }
  }

  async function refreshPosts() {
    try {
      const d = await apiGet<PostTreeResponse>(`threads/${thread.id}/posts?page=1&limit=50`);
      setPosts(d.data);
    } catch {
      setReplyErr("Failed to refresh replies");
    }
  }

  function handleReplyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setReply(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    mention.check(e.target.value, e.target.selectionStart ?? 0);
  }

  function insertMention(idx: number) {
    const username = mention.suggestions[idx]?.username;
    if (!username || !replyRef.current) return;
    const el = replyRef.current;
    const { newText, newCursor } = mention.buildInsert(reply, el.selectionStart ?? 0, username);
    setReply(newText);
    mention.close();
    // restore cursor after React re-render
    requestAnimationFrame(() => {
      el.selectionStart = newCursor;
      el.selectionEnd   = newCursor;
      el.focus();
    });
  }

  async function submitReply() {
    if (!reply.trim()) return;
    setPosting(true); setReplyErr(null);
    try {
      await apiPost(`threads/${thread.id}/posts`, {
        content: reply.trim(),
        mentions: extractMentions(reply),
        parent_post_id: replyToPost?.id ?? null,
      });
      setReply("");
      setReplyPreview(false);
      if (replyRef.current) replyRef.current.style.height = "auto";
      setReplyToPost(null);
      await refreshPosts();
      showToast("Reply posted!");
    } catch (e) {
      setReplyErr(e instanceof Error ? e.message : "Failed to post");
    } finally { setPosting(false); }
  }

  function handleEdit(id: string, content: string) { setEditId(id); setEditText(content); setEditPreview(false); }

  async function saveEdit() {
    if (!editId || !editText.trim()) return;
    setEditSaving(true);
    try {
      await apiPatch(`posts/${editId}`, { content: editText.trim() });
      setEditId(null);
      await refreshPosts();
      showToast("Reply updated");
    } catch {
      setReplyErr("Failed to save edit");
    } finally { setEditSaving(false); }
  }

  function handleDelete(id: string) { setDeleteConfirmId(id); }

  async function confirmDelete() {
    if (!deleteConfirmId) return;
    try {
      await apiDelete(`posts/${deleteConfirmId}`);
      setDeleteConfirmId(null);
      await refreshPosts();
      showToast("Reply deleted");
    } catch {
      setReplyErr("Failed to delete post");
      setDeleteConfirmId(null);
    }
  }

  function handleReply(post: PostNode) { setReplyToPost(post); }

  async function handleThreadLike() {
    if (!user) return;
    const wasLiked = thread.liked_by_me;
    setThread(prev => ({ ...prev, liked_by_me: !wasLiked, like_count: prev.like_count + (wasLiked ? -1 : 1) }));
    try {
      await apiPost(`threads/${thread.id}/like`, {});
    } catch {
      setThread(prev => ({ ...prev, liked_by_me: wasLiked, like_count: prev.like_count + (wasLiked ? 1 : -1) }));
      showToast("Could not update like", "error");
    }
  }

  function toggleLikeInTree(nodes: PostNode[], postId: string): PostNode[] {
    return nodes.map(n => {
      if (n.id === postId) {
        const wasLiked = n.liked_by_me;
        return { ...n, liked_by_me: !wasLiked, like_count: n.like_count + (wasLiked ? -1 : 1) };
      }
      if (n.children.length > 0) return { ...n, children: toggleLikeInTree(n.children, postId) };
      return n;
    });
  }

  async function handleLike(postId: string) {
    setPosts(prev => toggleLikeInTree(prev, postId));
    try {
      await apiPost(`threads/${thread.id}/posts/${postId}/like`, {});
    } catch {
      setPosts(prev => toggleLikeInTree(prev, postId)); // revert on failure
      showToast("Could not update like", "error");
    }
  }

  function openPostReport(postId: string) {
    setReportTargetId(postId);
    setReportTargetType("post");
  }

  function openThreadReport() {
    setReportTargetId(thread.id);
    setReportTargetType("thread");
  }

  async function submitReport(reason: string, detail: string) {
    if (!reportTargetId) return;
    if (reportTargetType === "thread") {
      await apiPost(`threads/${thread.id}/report`, { reason, detail });
    } else {
      await apiPost(`threads/${thread.id}/posts/${reportTargetId}/report`, { reason, detail });
    }
    showToast("Report submitted — thank you");
  }

  const replyToName = replyToPost
    ? (userCache.get(replyToPost.author_id)?.display_name ?? shortId(replyToPost.author_id))
    : "";

  return (
    <>
      {/* ── Article page — standalone layout ── */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

        {/* Sticky back bar */}
        <div className="shrink-0 sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border flex items-center gap-3 px-4 h-[49px]">
          <button
            type="button"
            onClick={handleBackNavigation}
            className="flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
          <span className="flex-1 min-w-0 text-[13px] text-text-secondary truncate hidden sm:block">
            {thread.title}
          </span>
          <span
            className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: tone.text, background: tone.bg }}
          >
            {tone.label}
          </span>
        </div>

        {/* Scrollable article */}
        <div className="flex-1 overflow-y-auto ws-scroll">
          <article className="max-w-[720px] mx-auto px-5 sm:px-8 pt-10 pb-16">

            {/* ── Title ── */}
            <h1
              className="text-[2.25rem] sm:text-[2.75rem] font-bold leading-[1.15] text-foreground mb-4 tracking-tight"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              {thread.title}
            </h1>

            {/* ── Tags ── */}
            {thread.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {thread.tags.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => router.push(`/threads?tag=${encodeURIComponent(t)}`)}
                    className="text-[12px] text-text-secondary bg-card-hover border border-border rounded-full px-3 py-1 hover:text-foreground hover:border-border-strong transition-colors"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}

            {/* ── Author row ── */}
            <div className="flex items-center gap-3 mb-5">
              <UserHoverCard
                userId={thread.author_id}
                username={authorUsername || ""}
                displayName={authorDisplay}
                bio={null}
              >
                <Link href={authorProfileHref} aria-label={`Profile of ${authorDisplay}`}>
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
                  <Link href={authorProfileHref} className="text-[14px] font-semibold text-foreground hover:underline">
                    {authorDisplay}
                  </Link>
                  {authorUsername && (
                    <span className="text-[12px] text-text-tertiary">@{authorUsername}</span>
                  )}
                </div>
                <p className="text-[12px] text-text-tertiary mt-0.5">
                  {relativeTime(thread.created_at)}
                  {threadWasEdited && (
                    <span className="ml-2 italic">· edited {relativeTime(thread.updated_at)}</span>
                  )}
                  {" · "}
                  {thread.post_count}{" "}
                  {thread.post_count === 1 ? "reply" : "replies"}
                </p>
              </div>

              {user && user.id !== thread.author_id && (
                <FollowButton authorId={thread.author_id} />
              )}

              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex size-7 items-center justify-center rounded-full text-text-tertiary hover:bg-card-hover hover:text-foreground transition-colors"
                      aria-label="Thread options"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={6} className="w-44 border-[#1c1f2e] bg-[#0f1117] text-[#e4e8f4]">
                    {canEditThread && (
                      <DropdownMenuItem onClick={openThreadEdit}>
                        <Pencil size={12} /> Edit thread
                      </DropdownMenuItem>
                    )}
                    {!isThreadOwner && (
                      <DropdownMenuItem onClick={openThreadReport} className="text-[#0EA5E9] focus:text-[#0EA5E9] focus:bg-sky-500/10">
                        <Flag size={12} /> Report thread
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* ── Top reaction bar ── */}
            <div className="flex items-center justify-between border-t border-b border-border py-2.5 mb-8">
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={handleThreadLike}
                  title={user ? (thread.liked_by_me ? "Unlike" : "Like") : "Sign in to like"}
                  className={`flex items-center gap-1.5 text-[13px] transition-colors ${
                    thread.liked_by_me ? "text-red-400" : "text-text-secondary hover:text-foreground"
                  }`}
                >
                  <Heart size={15} fill={thread.liked_by_me ? "currentColor" : "none"} />
                  <span>{thread.like_count > 0 ? thread.like_count : "Like"}</span>
                </button>
                <a
                  href="#responses"
                  className="flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-foreground transition-colors"
                >
                  <MessageSquare size={15} />
                  <span>{thread.post_count}</span>
                </a>
              </div>
              <div className="flex items-center gap-2 text-text-tertiary">
                <button
                  type="button"
                  title="Share"
                  onClick={() => void handleShareThread()}
                  className="flex size-7 items-center justify-center rounded-full hover:bg-card-hover hover:text-foreground transition-colors"
                >
                  <Share2 size={14} />
                </button>
              </div>
            </div>

            {/* ── Hero image (only if image_url exists) ── */}
            {thread.image_url && (
              <div className="mb-8 -mx-5 sm:-mx-8 overflow-hidden rounded-sm">
                <img
                  src={thread.image_url}
                  alt=""
                  className="w-full object-cover max-h-[420px]"
                />
              </div>
            )}

            {/* ── Article body ── */}
            <div
              className="mb-10 text-[19px] leading-[1.75] text-foreground [&_p]:mb-5 [&_p:last-child]:mb-0 [&_blockquote]:border-l-[3px] [&_blockquote]:border-border [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-text-secondary [&_code]:text-[0.85em] [&_pre]:overflow-x-auto"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              <RichText content={thread.body} variant="full" className="thread-body-rt" />
            </div>

            {/* ── Bottom reaction bar ── */}
            <div className="flex items-center justify-between border-t border-b border-border py-2.5 mb-10">
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={handleThreadLike}
                  title={user ? (thread.liked_by_me ? "Unlike" : "Like") : "Sign in to like"}
                  className={`flex items-center gap-1.5 text-[13px] transition-colors ${
                    thread.liked_by_me ? "text-red-400" : "text-text-secondary hover:text-foreground"
                  }`}
                >
                  <Heart size={15} fill={thread.liked_by_me ? "currentColor" : "none"} />
                  <span>{thread.like_count > 0 ? thread.like_count : "Like"}</span>
                </button>
                <a
                  href="#responses"
                  className="flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-foreground transition-colors"
                >
                  <MessageSquare size={15} />
                  <span>{thread.post_count}</span>
                </a>
              </div>
              <div className="flex items-center gap-2 text-text-tertiary">
                <button
                  type="button"
                  title="Share"
                  onClick={() => void handleShareThread()}
                  className="flex size-7 items-center justify-center rounded-full hover:bg-card-hover hover:text-foreground transition-colors"
                >
                  <Share2 size={14} />
                </button>
              </div>
            </div>

            {/* ── Author bio card ── */}
            <div className="border border-border rounded-xl p-6 mb-12">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Link href={authorProfileHref}>
                    <div
                      className="w-14 h-14 rounded-full shrink-0 flex items-center justify-center text-[16px] font-bold text-white"
                      style={{ background: `linear-gradient(135deg,${av1},${av2})` }}
                    >
                      {initials(authorDisplay)}
                    </div>
                  </Link>
                  <div>
                    <Link href={authorProfileHref} className="text-[15px] font-bold text-foreground hover:underline block">
                      {authorDisplay}
                    </Link>
                    {authorUsername && (
                      <span className="text-[12.5px] text-text-tertiary">@{authorUsername}</span>
                    )}
                  </div>
                </div>
                {user && user.id !== thread.author_id && (
                  <FollowButton authorId={thread.author_id} size="md" />
                )}
              </div>
            </div>

        </article>

          {/* ── Responses ── */}
          <div id="responses" className="max-w-[720px] mx-auto px-5 sm:px-8 mb-10">
            <h2
              className="text-2xl font-bold text-foreground mb-6"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            >
              Responses ({thread.post_count})
            </h2>

            {/* Inline compose box */}
            {user ? (
              <div className="mb-8">
                {replyErr && (
                  <p className="text-[12px] text-red-400 mb-2">{replyErr}</p>
                )}
                {replyToPost && (
                  <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-card-hover border border-border text-[12px] text-text-secondary">
                    <CornerDownRight size={11} className="shrink-0" />
                    <span>Replying to <strong className="text-foreground">{replyToName}</strong></span>
                    <span className="truncate flex-1 opacity-60">{replyToPost.content.slice(0, 60)}{replyToPost.content.length > 60 ? "…" : ""}</span>
                    <button type="button" onClick={() => setReplyToPost(null)} className="shrink-0 text-text-tertiary hover:text-foreground transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full shrink-0 mt-1 flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ background: `linear-gradient(135deg,${sav1},${sav2})` }}
                  >
                    {initials(sidebarName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Write / Preview tabs */}
                    <div className="flex gap-3 mb-2 border-b border-border">
                      <button
                        type="button"
                        onClick={() => setReplyPreview(false)}
                        className={`pb-1.5 text-[12px] font-medium border-b-2 -mb-px transition-colors ${!replyPreview ? "border-foreground text-foreground" : "border-transparent text-text-tertiary hover:text-foreground"}`}
                      >
                        Write
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyPreview(true)}
                        disabled={!reply.trim()}
                        className={`pb-1.5 text-[12px] font-medium border-b-2 -mb-px transition-colors disabled:opacity-40 ${replyPreview ? "border-foreground text-foreground" : "border-transparent text-text-tertiary hover:text-foreground"}`}
                      >
                        Preview
                      </button>
                    </div>
                    {replyPreview ? (
                      <div className="min-h-[80px] text-[14px] leading-relaxed text-foreground">
                        <RichText content={reply} variant="full" />
                      </div>
                    ) : (
                      <div className="relative">
                        <textarea
                          ref={replyRef}
                          className="w-full bg-transparent border-b border-border resize-none text-[14px] text-foreground placeholder:text-text-tertiary outline-none py-1 leading-relaxed min-h-[60px]"
                          placeholder={replyToPost ? `Reply to ${replyToName}…` : "What are your thoughts?"}
                          value={reply}
                          onChange={handleReplyChange}
                          rows={3}
                          maxLength={2000}
                          onKeyDown={e => {
                            if (mention.onKeyDown(e, insertMention)) return;
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitReply();
                          }}
                          onBlur={() => setTimeout(mention.close, 150)}
                        />
                        {mention.isOpen && (
                          <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-border bg-[#0f1117] shadow-xl overflow-hidden">
                            {mention.suggestions.length > 0 ? (
                              mention.suggestions.map((s, i) => (
                                <button
                                  key={s.username}
                                  type="button"
                                  className={`w-full text-left flex items-center gap-2 px-3 py-2 text-[13px] transition-colors ${i === mention.selectedIdx ? "bg-primary/10 text-primary" : "text-foreground hover:bg-card-hover"}`}
                                  onMouseDown={e => { e.preventDefault(); insertMention(i); }}
                                >
                                  <span className="font-medium">{s.display_name}</span>
                                  <span className="text-text-tertiary text-[11px]">@{s.username}</span>
                                </button>
                              ))
                            ) : (
                              <p className="px-3 py-2 text-[12px] text-text-tertiary">
                                {mention.query === "" ? "Type a username…" : "No users found"}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-text-tertiary opacity-60">
                        **bold** *italic* `code` · Ctrl+Enter
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-text-tertiary">{reply.length}/2000</span>
                        <button
                          type="button"
                          disabled={posting || !reply.trim()}
                          onClick={submitReply}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white text-[12px] font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors"
                        >
                          <Send size={11} />
                          {posting ? "Sending…" : "Reply"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mb-8 text-[14px] text-text-secondary">
                <Link href="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
                {" to join the conversation"}
              </p>
            )}

            {/* Posts list */}
            {posts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-text-tertiary">
                <MessageSquare size={28} strokeWidth={1.2} />
                <p className="text-[13px]">No replies yet — start the conversation!</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {posts.map(p => (
                  <PostItem
                    key={p.id}
                    post={p}
                    currentUserId={user?.id ?? null}
                    currentUsername={user?.username ?? null}
                    userCache={userCache}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onReply={handleReply}
                    onReport={openPostReport}
                    onLike={handleLike}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── More from this author ── */}
          <div className="max-w-[720px] mx-auto px-5 sm:px-8 pb-16">
            <MoreFromAuthor
              authorId={thread.author_id}
              authorName={authorDisplay}
              currentThreadId={thread.id}
            />
          </div>
        </div>
      </div>

      {/* Thread edit modal */}
      {threadEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setThreadEditOpen(false)} role="presentation">
          <div className="w-full max-w-[480px] bg-[#0f1117] border border-[#1c1f2e] rounded-xl p-6 shadow-2xl flex flex-col gap-4" onClick={e => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby="thread-edit-modal-title">
            <h3 id="thread-edit-modal-title" className="text-[16px] font-semibold text-foreground m-0">Edit thread</h3>
            <label htmlFor="thread-edit-title" className="text-[12px] font-medium text-text-secondary">Title</label>
            <input
              id="thread-edit-title"
              value={threadEditTitle}
              onChange={e => setThreadEditTitle(e.target.value)}
              maxLength={160}
              className="w-full bg-[#151927] border border-[#1c1f2e] rounded-lg px-3 py-2 text-[14px] text-foreground outline-none focus:border-primary/50 transition-colors"
            />
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="thread-edit-body" className="text-[12px] font-medium text-text-secondary">Body</label>
              {canEditThreadBody && (
                <div className="flex gap-3 border-b border-border">
                  <button type="button" onClick={() => setThreadEditPreview(false)} className={`pb-1.5 text-[12px] font-medium border-b-2 -mb-px transition-colors ${!threadEditPreview ? "border-foreground text-foreground" : "border-transparent text-text-tertiary hover:text-foreground"}`}>Write</button>
                  <button type="button" onClick={() => setThreadEditPreview(true)} disabled={!threadEditBody.trim()} className={`pb-1.5 text-[12px] font-medium border-b-2 -mb-px transition-colors disabled:opacity-40 ${threadEditPreview ? "border-foreground text-foreground" : "border-transparent text-text-tertiary hover:text-foreground"}`}>Preview</button>
                </div>
              )}
            </div>
            {threadEditPreview && canEditThreadBody ? (
              <div className="min-h-[120px] bg-[#151927] border border-[#1c1f2e] rounded-lg px-3 py-2 text-[14px] leading-relaxed text-foreground">
                <RichText content={threadEditBody} variant="full" />
              </div>
            ) : (
              <textarea
                id="thread-edit-body"
                value={threadEditBody}
                onChange={e => setThreadEditBody(e.target.value)}
                rows={6}
                disabled={!canEditThreadBody}
                className="w-full bg-[#151927] border border-[#1c1f2e] rounded-lg px-3 py-2 text-[14px] text-foreground outline-none focus:border-primary/50 transition-colors resize-none disabled:opacity-60"
              />
            )}
            {!canEditThreadBody && (
              <p className="text-[12px] text-text-tertiary">Body is locked after the first reply. You can still update title and tags.</p>
            )}
            <label htmlFor="thread-edit-tags" className="text-[12px] font-medium text-text-secondary">Tags</label>
            <input
              id="thread-edit-tags"
              value={threadEditTags}
              onChange={e => setThreadEditTags(e.target.value)}
              placeholder="career, fastapi, interview"
              className="w-full bg-[#151927] border border-[#1c1f2e] rounded-lg px-3 py-2 text-[14px] text-foreground outline-none focus:border-primary/50 transition-colors"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" className="px-4 py-2 rounded-lg text-[13px] text-text-secondary hover:bg-card-hover transition-colors" onClick={() => setThreadEditOpen(false)}>Cancel</button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-[13px] bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
                disabled={threadEditSaving || !threadEditTitle.trim() || !threadEditBody.trim()}
                onClick={saveThreadEdit}
              >
                {threadEditSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditId(null)} role="presentation">
          <div className="w-full max-w-[480px] bg-[#0f1117] border border-[#1c1f2e] rounded-xl p-6 shadow-2xl flex flex-col gap-4" onClick={e => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
            <div className="flex items-center justify-between gap-3">
              <h3 id="edit-modal-title" className="text-[16px] font-semibold text-foreground m-0">Edit reply</h3>
              <div className="flex gap-3 border-b border-border">
                <button type="button" onClick={() => setEditPreview(false)} className={`pb-1.5 text-[12px] font-medium border-b-2 -mb-px transition-colors ${!editPreview ? "border-foreground text-foreground" : "border-transparent text-text-tertiary hover:text-foreground"}`}>Write</button>
                <button type="button" onClick={() => setEditPreview(true)} disabled={!editText.trim()} className={`pb-1.5 text-[12px] font-medium border-b-2 -mb-px transition-colors disabled:opacity-40 ${editPreview ? "border-foreground text-foreground" : "border-transparent text-text-tertiary hover:text-foreground"}`}>Preview</button>
              </div>
            </div>
            {editPreview ? (
              <div className="min-h-[120px] bg-[#151927] border border-[#1c1f2e] rounded-lg px-3 py-2 text-[14px] leading-relaxed text-foreground">
                <RichText content={editText} variant="full" />
              </div>
            ) : (
              <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={5} className="w-full bg-[#151927] border border-[#1c1f2e] rounded-lg px-3 py-2 text-[14px] text-foreground outline-none focus:border-primary/50 transition-colors resize-none" />
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" className="px-4 py-2 rounded-lg text-[13px] text-text-secondary hover:bg-card-hover transition-colors" onClick={() => setEditId(null)}>Cancel</button>
              <button type="button" className="px-4 py-2 rounded-lg text-[13px] bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors" disabled={editSaving || !editText.trim()} onClick={saveEdit}>
                {editSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDeleteConfirmId(null)} role="presentation">
          <div className="w-full max-w-[480px] bg-[#0f1117] border border-[#1c1f2e] rounded-xl p-6 shadow-2xl flex flex-col gap-4" onClick={e => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
            <h3 id="delete-modal-title" className="text-[16px] font-semibold text-foreground m-0">Delete reply</h3>
            <p className="text-[13px] text-text-secondary leading-relaxed">
              Are you sure you want to delete this reply? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" className="px-4 py-2 rounded-lg text-[13px] text-text-secondary hover:bg-card-hover transition-colors" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
              <button type="button" className="px-4 py-2 rounded-lg text-[13px] bg-red-500/15 text-red-400 border border-red-500/30 font-medium hover:bg-red-500/25 transition-colors" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      {reportTargetId && (
        <ReportModal
          targetType={reportTargetType}
          onClose={() => setReportTargetId(null)}
          onSubmit={submitReport}
        />
      )}

      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none" aria-live="polite">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-2.5 rounded-lg text-[13px] font-medium shadow-xl border ${
              t.type === "success"
                ? "bg-green-500/15 border-green-500/30 text-green-400"
                : "bg-red-500/15 border-red-500/30 text-red-400"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

    </>
  );
}
