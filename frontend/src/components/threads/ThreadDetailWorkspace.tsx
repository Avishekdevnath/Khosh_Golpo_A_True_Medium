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
import { useAuthStore } from "@/store/authStore";
import { useMentionSuggest } from "@/hooks/useMentionSuggest";
import { avatarSeed, initials, relativeTime } from "@/lib/workspaceUtils";
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

function wasEdited(createdAt: string, updatedAt: string): boolean {
  const created = new Date(createdAt).getTime();
  const updated = new Date(updatedAt).getTime();
  if (Number.isNaN(created) || Number.isNaN(updated)) return createdAt !== updatedAt;
  return updated - created > 1000;
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

  // DEBUG — remove after fix
  return (
    <div className="post-item">
      <UserHoverCard
        userId={post.author_id}
        username={username || ""}
        displayName={displayName}
        bio={null}
        isBot={post.author_is_bot}
      >
        <Link href={profileHref} className="post-av-link" aria-label={`Open profile of ${displayName}`}>
          <div className="post-av" style={{ background: `linear-gradient(135deg,${a1},${a2})` }}>
            {initials(displayName)}
          </div>
        </Link>
      </UserHoverCard>
      <div className="post-body">
        <div className="post-head">
          <UserHoverCard
            userId={post.author_id}
            username={username || ""}
            displayName={displayName}
            bio={null}
            isBot={post.author_is_bot}
          >
            <Link href={profileHref} className="post-author-link">
              <span className="post-author">{displayName}</span>
              {username && <span className="post-username">@{username}</span>}
              {post.author_is_bot && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 5px", borderRadius: 4, border: "1px solid rgba(129,140,248,0.5)", color: "#a5b4fc", background: "rgba(129,140,248,0.1)", letterSpacing: "0.04em" }}>BOT</span>
              )}
            </Link>
          </UserHoverCard>
          <span className="post-time">{relativeTime(post.created_at)}</span>
          {post.is_flagged && <span className="post-flag">flagged</span>}
        </div>
        <RichText content={post.content} variant="full" />
        <div className="post-actions">
          <button
            type="button"
            className={post.liked_by_me ? "like liked" : "like"}
            onClick={() => currentUserId && onLike(post.id)}
            title={currentUserId ? (post.liked_by_me ? "Unlike" : "Like") : "Sign in to like"}
          >
            <Heart size={11} fill={post.liked_by_me ? "currentColor" : "none"} />
            {post.like_count > 0 ? post.like_count : "Like"}
          </button>
          {currentUserId && (
            <button type="button" onClick={() => onReply(post)}>
              <CornerDownRight size={11} /> Reply
            </button>
          )}
          {isOwner && (
            <>
              <button type="button" onClick={() => onEdit(post.id, post.content)}>
                <Pencil size={11} /> Edit
              </button>
              <button type="button" className="danger" onClick={() => onDelete(post.id)}>
                <Trash2 size={11} /> Delete
              </button>
            </>
          )}
          {currentUserId && !isOwner && (
            <button type="button" className="report" onClick={() => onReport(post.id)}>
              <Flag size={11} /> Report
            </button>
          )}
        </div>
        {post.children.length > 0 && (
          <div className="post-children">
            {post.children.map(child => (
              <PostItem key={child.id} post={child} currentUserId={currentUserId}
                currentUsername={currentUsername}
                userCache={userCache} onEdit={onEdit} onDelete={onDelete} onReply={onReply} onReport={onReport} onLike={onLike} />
            ))}
          </div>
        )}
      </div>
      <style jsx>{`
        .post-item { display: flex; gap: 10px; padding: 10px; border-radius: 10px; transition: background 0.15s; }
        .post-item:hover { background: rgba(21,25,39,0.6); }
        .post-av-link { display: inline-flex; text-decoration: none; border-radius: 999px; }
        .post-av-link:focus-visible { outline: 2px solid rgba(14,165,233,0.45); outline-offset: 1px; }
        .post-av { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0; margin-top: 2px; }
        .post-body { flex: 1; min-width: 0; }
        .post-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
        .post-author-link { display: flex; align-items: center; gap: 6px; text-decoration: none; cursor: pointer; border-radius: 6px; padding: 2px 6px; transition: all 0.15s; }
        .post-author-link:hover { background: rgba(14, 165, 233, 0.12); }
        .post-author { font-size: 13px; font-weight: 600; color: var(--text, #e4e8f4); }
        .post-username { font-size: 11px; color: var(--muted, #9ba3be); }
        .post-time { font-size: 11px; color: var(--muted, #9ba3be); }
        .post-flag { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #ef4444; background: rgba(239,68,68,0.12); border-radius: 5px; padding: 2px 6px; }
        .post-actions { display: flex; gap: 6px; margin-top: 6px; }
        .post-actions button { border: none; background: transparent; color: rgba(99,111,141,0.5); font-size: 11px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; padding: 3px 6px; border-radius: 5px; transition: all 0.15s; font-family: inherit; }
        .post-item:hover .post-actions button { color: var(--muted, #9ba3be); }
        .post-actions button:hover { color: var(--text, #e4e8f4); background: #1a1d2a; }
        .post-actions button.danger:hover { color: #ef4444; background: rgba(239,68,68,0.12); }
        .post-actions button.report:hover { color: #0EA5E9; background: rgba(14,165,233,0.12); }
        .post-actions button.liked { color: #ef4444; }
        .post-actions button.liked:hover { color: #ef4444; background: rgba(239,68,68,0.12); }
        .post-children { margin-left: 8px; padding-left: 14px; border-left: 2px solid var(--app-border, #1c1f2e); margin-top: 4px; }
      `}</style>
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
                  onClick={() => { void navigator.clipboard?.writeText(window.location.href); showToast("Link copied!"); }}
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
                  onClick={() => { void navigator.clipboard?.writeText(window.location.href); showToast("Link copied!"); }}
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

        {/* Replies */}
        <div className="replies-section ws-scroll">
          <div className="replies-header">
            <span>Replies</span>
            <span className="replies-count">{posts.length}</span>
          </div>

          {posts.length === 0 && (
            <div className="empty">
              <MessageSquare size={24} strokeWidth={1.2} />
              <span>No replies yet — start the conversation!</span>
            </div>
          )}

          <div className="posts-list">
            {posts.map(p => (
              <PostItem key={p.id} post={p} currentUserId={user?.id ?? null}
                currentUsername={user?.username ?? null}
                userCache={userCache} onEdit={handleEdit} onDelete={handleDelete} onReply={handleReply} onReport={openPostReport} onLike={handleLike} />
            ))}
          </div>
        </div>

        {/* Reply composer */}
        <div className="reply-bar">
          {replyErr && <div className="reply-err">{replyErr}</div>}
          {replyToPost && (
            <div className="reply-to-banner">
              <CornerDownRight size={12} />
              <span>Replying to <strong>{replyToName}</strong></span>
              <span className="reply-to-preview">{replyToPost.content.slice(0, 60)}{replyToPost.content.length > 60 ? "…" : ""}</span>
              <button type="button" className="reply-to-cancel" onClick={() => setReplyToPost(null)}>
                <X size={12} />
              </button>
            </div>
          )}
          {user ? (
            <>
              <div className="reply-row">
                <div className="reply-user-av" style={{ background: `linear-gradient(135deg,${sav1},${sav2})` }}>
                  {initials(sidebarName)}
                </div>
                <div className="reply-input-wrap">
                  <div className="composer-tabs">
                    <button type="button" className={`composer-tab${!replyPreview ? " active" : ""}`} onClick={() => setReplyPreview(false)}>Write</button>
                    <button type="button" className={`composer-tab${replyPreview ? " active" : ""}`} onClick={() => setReplyPreview(true)} disabled={!reply.trim()}>Preview</button>
                  </div>
                  {replyPreview ? (
                    <div className="composer-preview">
                      <RichText content={reply} variant="full" />
                    </div>
                  ) : (
                    <textarea
                      ref={replyRef}
                      className="reply-input"
                      placeholder={replyToPost ? `Reply to ${replyToName}…` : "Write a reply…"}
                      value={reply}
                      onChange={handleReplyChange}
                      rows={2}
                      maxLength={2000}
                      onKeyDown={e => {
                        if (mention.onKeyDown(e, insertMention)) return;
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitReply();
                      }}
                      onBlur={() => setTimeout(mention.close, 150)}
                    />
                  )}
                  {!replyPreview && mention.isOpen && (
                    <div className="mention-dropdown">
                      {mention.suggestions.length > 0 ? (
                        mention.suggestions.map((s, i) => (
                          <button
                            key={s.username}
                            type="button"
                            className={`mention-item${i === mention.selectedIdx ? " selected" : ""}`}
                            onMouseDown={e => { e.preventDefault(); insertMention(i); }}
                          >
                            <span className="mention-dn">{s.display_name}</span>
                            <span className="mention-un">@{s.username}</span>
                          </button>
                        ))
                      ) : (
                        <p className="mention-hint">
                          {mention.query === "" ? "Type a username to search…" : "No users found"}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="reply-footer-row">
                    <span className="reply-fmt">**bold** *italic* `code` &gt; quote</span>
                    <span className="reply-hint">{reply.length}/2000 · Ctrl+Enter</span>
                  </div>
                </div>
                <button type="button" className="send-btn" disabled={posting || !reply.trim()} onClick={submitReply}>
                  <Send size={14} />
                </button>
              </div>
            </>
          ) : (
            <div className="sign-in-prompt">
              <Link href="/login" style={{ color: "#0EA5E9", textDecoration: "none", fontWeight: 700 }}>Sign in</Link>
              <span> to join the conversation</span>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Thread edit modal */}
      {threadEditOpen && (
        <div className="modal-overlay" onClick={() => setThreadEditOpen(false)} role="presentation">
          <div className="modal" onClick={e => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby="thread-edit-modal-title">
            <h3 id="thread-edit-modal-title">Edit thread</h3>
            <label htmlFor="thread-edit-title">Title</label>
            <input
              id="thread-edit-title"
              value={threadEditTitle}
              onChange={e => setThreadEditTitle(e.target.value)}
              maxLength={160}
            />
            <div className="modal-label-row">
              <label htmlFor="thread-edit-body">Body</label>
              {canEditThreadBody && (
                <div className="composer-tabs composer-tabs-sm">
                  <button type="button" className={`composer-tab${!threadEditPreview ? " active" : ""}`} onClick={() => setThreadEditPreview(false)}>Write</button>
                  <button type="button" className={`composer-tab${threadEditPreview ? " active" : ""}`} onClick={() => setThreadEditPreview(true)} disabled={!threadEditBody.trim()}>Preview</button>
                </div>
              )}
            </div>
            {threadEditPreview && canEditThreadBody ? (
              <div className="composer-preview composer-preview-modal">
                <RichText content={threadEditBody} variant="full" />
              </div>
            ) : (
              <textarea
                id="thread-edit-body"
                value={threadEditBody}
                onChange={e => setThreadEditBody(e.target.value)}
                rows={6}
                disabled={!canEditThreadBody}
              />
            )}
            {!canEditThreadBody && (
              <p className="modal-note">Body is locked after the first reply. You can still update title and tags.</p>
            )}
            <label htmlFor="thread-edit-tags">Tags</label>
            <input
              id="thread-edit-tags"
              value={threadEditTags}
              onChange={e => setThreadEditTags(e.target.value)}
              placeholder="career, fastapi, interview"
            />
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setThreadEditOpen(false)}>Cancel</button>
              <button
                type="button"
                className="btn-primary"
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
        <div className="modal-overlay" onClick={() => setEditId(null)} role="presentation">
          <div className="modal" onClick={e => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
            <div className="modal-label-row" style={{ marginBottom: 10 }}>
              <h3 id="edit-modal-title" style={{ margin: 0 }}>Edit reply</h3>
              <div className="composer-tabs composer-tabs-sm">
                <button type="button" className={`composer-tab${!editPreview ? " active" : ""}`} onClick={() => setEditPreview(false)}>Write</button>
                <button type="button" className={`composer-tab${editPreview ? " active" : ""}`} onClick={() => setEditPreview(true)} disabled={!editText.trim()}>Preview</button>
              </div>
            </div>
            {editPreview ? (
              <div className="composer-preview composer-preview-modal">
                <RichText content={editText} variant="full" />
              </div>
            ) : (
              <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={5} />
            )}
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setEditId(null)}>Cancel</button>
              <button type="button" className="btn-primary" disabled={editSaving || !editText.trim()} onClick={saveEdit}>
                {editSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)} role="presentation">
          <div className="modal" onClick={e => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
            <h3 id="delete-modal-title">Delete reply</h3>
            <p style={{ fontSize: 13, color: "var(--muted, #9ba3be)", margin: "0 0 16px", lineHeight: 1.6 }}>
              Are you sure you want to delete this reply? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
              <button type="button" className="btn-danger" onClick={confirmDelete}>Delete</button>
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
      <div className="toast-container" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
        ))}
      </div>

      <style jsx>{`
        /* ── Root ── */
        /* ── Content ── */
        .content {
          position: relative;
          display: flex;
          flex-direction: column;
        }

        /* Top bar */
        .top-bar {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; border-bottom: 1px solid var(--app-border, #1c1f2e); flex-shrink: 0;
        }
        .back-btn {
          border: 1px solid var(--app-border, #1c1f2e); background: var(--app-input, #151821); color: var(--muted, #9ba3be);
          border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 600;
          display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
          transition: all 0.15s; flex-shrink: 0;
        }
        .back-btn:hover { color: var(--text, #e4e8f4); border-color: #2d3450; }
        .top-bar-title {
          flex: 1; font-size: 13px; font-weight: 600; color: var(--muted, #9ba3be);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .status-pill { border-radius: 7px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 3px 10px; flex-shrink: 0; }

        /* Thread block */
        .thread-block { padding: 18px 20px; border-bottom: 1px solid var(--app-border, #1c1f2e); flex-shrink: 0; }
        .thread-row { display: flex; gap: 14px; }
        .thread-av-link { display: inline-flex; text-decoration: none; border-radius: 999px; }
        .thread-av-link:focus-visible { outline: 2px solid rgba(14,165,233,0.45); outline-offset: 1px; }
        .thread-av { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0; }
        .thread-info { flex: 1; min-width: 0; }
        .thread-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
        .thread-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .thread-author-link { display: flex; align-items: center; gap: 6px; text-decoration: none; cursor: pointer; border-radius: 6px; padding: 2px 6px; transition: all 0.15s; }
        .thread-author-link:hover { background: rgba(14, 165, 233, 0.12); }
        .thread-author { font-size: 13px; font-weight: 600; color: var(--text, #e4e8f4); }
        .thread-username { font-size: 11px; color: var(--muted, #9ba3be); }
        .thread-time { font-size: 11px; color: var(--muted, #9ba3be); }
        .thread-edited { font-size: 10px; color: var(--muted, #9ba3be); border: 1px solid var(--app-border, #1c1f2e); background: var(--app-card-hover, #181b27); border-radius: 999px; padding: 1px 7px; font-weight: 600; }
        .thread-head-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .thread-menu-btn {
          border: 1px solid var(--app-border, #1c1f2e); background: var(--app-input, #151821); color: var(--muted, #9ba3be);
          border-radius: 8px; width: 30px; height: 30px; display: grid; place-items: center;
          cursor: pointer; transition: all 0.15s; flex-shrink: 0;
        }
        .thread-menu-btn:hover { color: var(--text, #e4e8f4); border-color: #2d3450; background: #1a1f30; }
        .thread-title { font-family: var(--serif),serif; font-size: 22px; line-height: 1.25; margin: 0 0 10px; color: var(--text, #e4e8f4); }
        .thread-body { font-size: 13px; line-height: 1.75; color: var(--text, #e4e8f4); white-space: pre-wrap; margin: 0 0 12px; }
        .thread-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
        .tag {
          border: 1px solid rgba(129,140,248,0.25); color: #818CF8;
          background: rgba(129,140,248,0.1); border-radius: 999px;
          font-size: 10px; font-weight: 600; padding: 2px 8px;
          cursor: pointer; transition: all 0.15s; font-family: inherit;
        }
        .tag:hover { background: rgba(129,140,248,0.2); border-color: rgba(129,140,248,0.4); }
        .thread-stats { display: flex; gap: 14px; color: var(--muted, #9ba3be); font-size: 12px; align-items: center; }
        .thread-stats span { display: inline-flex; align-items: center; gap: 5px; }
        .thread-like { border: none; background: transparent; color: var(--muted, #9ba3be); font-size: 12px; display: inline-flex; align-items: center; gap: 5px; cursor: pointer; padding: 3px 8px; border-radius: 6px; transition: all 0.15s; font-family: inherit; }
        .thread-like:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
        .thread-like.liked { color: #ef4444; }
        .thread-like.liked:hover { background: rgba(239,68,68,0.1); }

        /* Replies section */
        .replies-section { flex: 1; padding: 14px 20px; }
        .replies-header {
          display: flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: #545c7a; margin-bottom: 14px;
        }
        .replies-count {
          background: var(--app-card-hover, #181b27); border: 1px solid var(--app-border, #1c1f2e); border-radius: 99px;
          font-size: 10px; padding: 1px 7px; color: var(--muted, #9ba3be);
          text-transform: none; letter-spacing: 0; font-weight: 600;
        }
        .empty {
          border: 1px dashed #2a3150; border-radius: 11px; color: var(--muted, #9ba3be);
          font-size: 13px; text-align: center; padding: 28px 16px;
          display: flex; flex-direction: column; align-items: center; gap: 10px;
        }
        .posts-list { display: flex; flex-direction: column; gap: 2px; }

        /* Post item */
        .post-item {
          display: flex; gap: 10px; padding: 10px;
          border-radius: 10px; transition: background 0.15s;
        }
        .post-item:hover { background: rgba(21,25,39,0.6); }
        .post-av-link { display: inline-flex; text-decoration: none; border-radius: 999px; }
        .post-av-link:focus-visible { outline: 2px solid rgba(14,165,233,0.45); outline-offset: 1px; }
        .post-av { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0; margin-top: 2px; }
        .post-body { flex: 1; min-width: 0; }
        .post-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
        .post-author-link { display: flex; align-items: center; gap: 6px; text-decoration: none; cursor: pointer; border-radius: 6px; padding: 2px 6px; transition: all 0.15s; }
        .post-author-link:hover { background: rgba(14, 165, 233, 0.12); }
        .post-author { font-size: 13px; font-weight: 600; color: var(--text, #e4e8f4); }
        .post-username { font-size: 11px; color: var(--muted, #9ba3be); }
        .post-time { font-size: 11px; color: var(--muted, #9ba3be); }
        .post-flag { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #ef4444; background: rgba(239,68,68,0.12); border-radius: 5px; padding: 2px 6px; }
        .thread-body-rt { margin: 0 0 12px; }
        .post-actions { display: flex; gap: 6px; margin-top: 6px; }
        .post-actions button { border: none; background: transparent; color: rgba(99,111,141,0.5); font-size: 11px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; padding: 3px 6px; border-radius: 5px; transition: all 0.15s; font-family: inherit; }
        .post-item:hover .post-actions button { color: var(--muted, #9ba3be); }
        .post-actions button:hover { color: var(--text, #e4e8f4); background: #1a1d2a; }
        .post-actions button.danger:hover { color: #ef4444; background: rgba(239,68,68,0.12); }
        .post-actions button.report:hover { color: #0EA5E9; background: rgba(14,165,233,0.12); }
        .post-actions button.liked { color: #ef4444; }
        .post-actions button.liked:hover { color: #ef4444; background: rgba(239,68,68,0.12); }
        .post-children { margin-left: 8px; padding-left: 14px; border-left: 2px solid var(--app-border, #1c1f2e); margin-top: 4px; }

        /* Reply bar */
        .reply-bar { border-top: 1px solid var(--app-border, #1c1f2e); padding: 14px 20px 16px; flex-shrink: 0; background: var(--app-panel, #0f1117); }
        .reply-err { border: 1px solid rgba(239,68,68,0.35); background: rgba(239,68,68,0.1); color: #fca5a5; border-radius: 8px; padding: 6px 10px; font-size: 12px; margin-bottom: 8px; }
        .reply-to-banner {
          display: flex; align-items: center; gap: 8px;
          background: rgba(129,140,248,0.08); border: 1px solid rgba(129,140,248,0.2);
          border-radius: 8px; padding: 6px 10px; margin-bottom: 8px;
          font-size: 12px; color: #a5b4fc;
        }
        .reply-to-preview { color: var(--muted, #9ba3be); font-size: 11px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .reply-to-cancel { border: none; background: transparent; color: var(--muted, #9ba3be); cursor: pointer; display: flex; padding: 2px; border-radius: 4px; transition: all 0.15s; flex-shrink: 0; }
        .reply-to-cancel:hover { color: var(--text, #e4e8f4); background: #1a1d2a; }
        .reply-row { display: flex; gap: 10px; align-items: flex-start; }
        .reply-user-av { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0; margin-top: 2px; }
        .reply-input-wrap { position: relative; flex: 1; border: 1.5px solid var(--app-border, #1c1f2e); border-radius: 12px; background: var(--app-input, #151821); transition: border-color 0.15s; }
        .reply-input-wrap:focus-within { border-color: #0EA5E9; }
        .reply-input {
          width: 100%; box-sizing: border-box;
          background: transparent; border: none; outline: none;
          color: var(--text, #e4e8f4); font-size: 13px; padding: 10px 12px;
          font-family: inherit; line-height: 1.6; resize: none;
          min-height: 64px; overflow: hidden;
        }
        .reply-input::placeholder { color: #3d4460; }
        .reply-footer-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px 8px; border-top: 1px solid #1a1f2e; }
        .reply-hint { font-size: 10px; color: #2e3450; }
        .reply-fmt { font-size: 10px; color: #2e3450; font-family: 'Courier New', monospace; letter-spacing: 0.02em; }
        .send-btn {
          width: 34px; height: 34px; border-radius: 9px; border: none;
          background: #0EA5E9; color: #fff; display: grid; place-items: center;
          cursor: pointer; flex-shrink: 0; margin-top: 2px;
          box-shadow: 0 3px 10px rgba(14,165,233,0.28); transition: opacity 0.15s, transform 0.1s;
        }
        .send-btn:hover:not(:disabled) { opacity: 0.88; transform: scale(1.05); }
        .send-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }
        .sign-in-prompt { text-align: center; padding: 14px; font-size: 13px; color: var(--muted, #9ba3be); border: 1px dashed var(--app-border, #1c1f2e); border-radius: 10px; }
        .mention-dropdown {
          position: absolute; bottom: calc(100% + 6px); left: 0; right: 0;
          background: var(--app-panel, #0f1117); border: 1px solid var(--app-border, #1c1f2e); border-radius: 10px;
          overflow: hidden; z-index: 60; box-shadow: 0 4px 20px rgba(0,0,0,0.45);
        }
        .mention-item {
          width: 100%; display: flex; align-items: center; gap: 8px;
          padding: 8px 12px; background: transparent; border: none; border-bottom: 1px solid var(--app-input, #151821);
          text-align: left; cursor: pointer; transition: background 0.1s;
        }
        .mention-item:last-child { border-bottom: none; }
        .mention-item:hover, .mention-item.selected { background: var(--app-input, #151821); }
        .mention-dn { font-size: 13px; color: var(--text, #e4e8f4); font-weight: 500; font-family: inherit; }
        .mention-un { font-size: 11px; color: #5a6480; margin-left: auto; font-family: inherit; }
        .mention-hint { margin: 0; padding: 10px 12px; font-size: 12px; color: #5a6480; font-style: italic; }

        /* Composer Write/Preview toggle */
        .composer-tabs {
          display: flex; align-items: center; gap: 0;
          border-bottom: 1px solid #1a1f2e; padding: 0 4px;
          background: transparent;
        }
        .composer-tab {
          border: none; background: transparent; cursor: pointer;
          font-size: 11px; font-weight: 600; color: #3d4460;
          padding: 7px 10px;
          transition: color 0.15s; font-family: inherit;
          border-bottom: 2px solid transparent; margin-bottom: -1px;
        }
        .composer-tab:hover:not(:disabled) { color: #7a849e; }
        .composer-tab.active { color: #0EA5E9; border-bottom-color: #0EA5E9; }
        .composer-tab:disabled { opacity: 0.3; cursor: not-allowed; }
        .composer-fmt { display: none; }
        .composer-preview {
          min-height: 64px; background: transparent; padding: 10px 12px;
          width: 100%; box-sizing: border-box;
        }
        .composer-tabs-sm { margin-left: auto; }
        .modal-label-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .modal-label-row label { margin-bottom: 0 !important; }
        .composer-preview-modal {
          min-height: 120px; background: var(--app-input, #151821); border: 1.5px solid var(--app-border, #1c1f2e);
          border-radius: 10px; padding: 10px 12px; margin-bottom: 10px;
          width: 100%; box-sizing: border-box;
        }

        /* Modal */
        .modal-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); }
        .modal { width: 90%; max-width: 480px; background: var(--app-panel, #0f1117); border: 1px solid var(--app-border, #1c1f2e); border-radius: 14px; padding: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
        .modal h3 { font-family: var(--serif),serif; font-size: 18px; margin: 0 0 14px; }
        .modal label { display: block; font-size: 11px; color: var(--muted, #9ba3be); font-weight: 700; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.06em; }
        .modal input { width: 100%; box-sizing: border-box; background: var(--app-input, #151821); border: 1.5px solid var(--app-border, #1c1f2e); border-radius: 10px; color: var(--text, #e4e8f4); font-size: 13px; padding: 10px 12px; outline: none; font-family: inherit; line-height: 1.5; transition: border-color 0.15s; margin-bottom: 10px; }
        .modal input:focus { border-color: #0EA5E9; }
        .modal textarea { width: 100%; box-sizing: border-box; background: var(--app-input, #151821); border: 1.5px solid var(--app-border, #1c1f2e); border-radius: 10px; color: var(--text, #e4e8f4); font-size: 13px; padding: 10px 12px; outline: none; font-family: inherit; line-height: 1.5; resize: vertical; transition: border-color 0.15s; }
        .modal textarea:focus { border-color: #0EA5E9; }
        .modal textarea:disabled { opacity: 0.6; cursor: not-allowed; }
        .modal-note { font-size: 11px; color: var(--muted, #9ba3be); margin: 8px 0 12px; line-height: 1.5; }
        .modal-actions { display: flex; gap: 8px; margin-top: 14px; justify-content: flex-end; }
        .btn-ghost { border: 1px solid var(--app-border, #1c1f2e); background: var(--app-input, #151821); color: var(--muted, #9ba3be); border-radius: 8px; padding: 7px 14px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .btn-ghost:hover { color: var(--text, #e4e8f4); border-color: #2d3450; }
        .btn-primary { border: none; background: #0EA5E9; color: #fff; border-radius: 8px; padding: 7px 14px; font-size: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 14px rgba(14,165,233,0.3); transition: opacity 0.15s; }
        .btn-primary:hover:not(:disabled) { opacity: 0.88; }
        .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-danger { border: none; background: #ef4444; color: #fff; border-radius: 8px; padding: 7px 14px; font-size: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 14px rgba(239,68,68,0.3); transition: opacity 0.15s; }
        .btn-danger:hover { opacity: 0.88; }

        /* Toasts */
        .toast-container {
          position: fixed; bottom: 24px; right: 24px; z-index: 100;
          display: flex; flex-direction: column; gap: 8px; pointer-events: none;
        }
        .toast {
          padding: 10px 16px; border-radius: 10px; font-size: 13px; font-weight: 600;
          box-shadow: 0 8px 24px rgba(0,0,0,0.35); animation: toast-in 0.2s ease;
        }
        .toast-success { background: rgba(61,214,140,0.12); border: 1px solid rgba(61,214,140,0.3); color: #3dd68c; }
        .toast-error { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; }
        @keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

        /* ── Responsive ── */
        @media (max-width: 860px) {
          .content { min-height: calc(100vh - 56px); }
          .replies-section { flex: 1; }
          .reply-bar { position: sticky; bottom: 0; background: var(--app-panel, #0f1117); z-index: 5; }
          .post-actions { opacity: 1; }
        }
      `}</style>
    </>
  );
}
