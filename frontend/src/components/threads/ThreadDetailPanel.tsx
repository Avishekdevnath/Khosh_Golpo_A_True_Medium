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
  if (status === "open")     return { text: "#3dd68c", bg: "rgba(34,211,160,0.12)",  border: "rgba(34,211,160,0.2)",   label: "Open" };
  if (status === "closed")   return { text: "var(--muted, #636f8d)", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.1)",  label: "Closed" };
  return                            { text: "var(--muted, #636f8d)", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.1)",  label: "Archived" };
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
      <div key={post.id} className={`comment-thread ${depth > 0 ? "is-child" : ""}`}>
        <div className="comment">
          <Link
            href={postProfileHref}
            className="comment-author-link"
            aria-label={`Open profile of ${postAuthor}`}
          >
            <span className="comment-av" style={{ background: `linear-gradient(135deg,${pa1},${pa2})` }}>
              {initials(postAuthor)}
            </span>
          </Link>
          <div className="comment-body">
            <div className="comment-name-row">
              <Link
                href={postProfileHref}
                className="comment-name-link"
                aria-label={`Open profile of ${postAuthor}`}
              >
                <span className="comment-name">{postAuthor}</span>
                {postHandle && <span className="comment-username">{postHandle}</span>}
              </Link>
              <span className="comment-sep" aria-hidden="true">|</span>
              <span className="comment-time">{relativeTime(post.created_at)}</span>
              {isPostOwner && (
                <div className="comment-owner-actions">
                  <button type="button" onClick={() => openPostEdit(post)}>Edit</button>
                  <button type="button" className="danger" onClick={() => setPostDeleteId(post.id)}>Delete</button>
                </div>
              )}
            </div>
            <RichText content={post.content} variant="compact" className="comment-text" />
            <div className="comment-footer">
              <button
                type="button"
                className={post.liked_by_me ? "comment-like liked" : "comment-like"}
                onClick={() => handlePostLike(post.id)}
                title={user ? (post.liked_by_me ? "Unlike" : "Like") : "Sign in to like"}
              >
                <Heart size={11} fill={post.liked_by_me ? "currentColor" : "none"} />
                {post.like_count > 0 ? post.like_count : "Like"}
              </button>
              {user && (
                <button
                  type="button"
                  className="comment-reply-btn"
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
            <div className="comment-children">
              {post.children?.map(child => renderReplyChain(child, depth + 1))}
            </div>
          ) : (
            <div className="comment-children-flat">
              {post.children?.map(child => renderReplyChain(child, 2))}
            </div>
          )
        )}
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="right-panel right-panel-empty">
        <div className="empty-hint">
          <div className="empty-icon">
            <MessageSquare size={22} strokeWidth={1.5} />
          </div>
          <p>Select a thread to preview</p>
        </div>
        <style jsx>{panelStyles}</style>
      </div>
    );
  }

  const tone = statusTone(thread.status);
  const authorLabel = thread.author_display_name ?? thread.author_username ?? shortId(thread.author_id);
  const authorProfileHref = userProfileHref(thread.author_id, thread.author_username);
  const [av1, av2] = avatarSeed(thread.author_id);

  return (
    <div className="rp-layout">
      <div className="rp-scroll">
        <button type="button" className="rp-close" onClick={onClose} aria-label="Close thread preview">
          <X size={14} />
        </button>

        <div className="preview-status-row">
          <span className="status-pill" style={{ color: tone.text, background: tone.bg, border: `1px solid ${tone.border}` }}>
            {tone.label}
          </span>
          <span className="rp-time">{relativeTime(thread.created_at)}</span>
          {canManageThread && (
            <div className="preview-actions">
              <button type="button" className="preview-action-btn" onClick={openThreadEdit}>
                <Pencil size={12} />
                <span>Edit</span>
              </button>
              <button
                type="button"
                className="preview-action-btn danger"
                onClick={() => setThreadDeleteOpen(true)}
              >
                <Trash2 size={12} />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>

        <h2 className="preview-title" onClick={() => router.push(`/threads/${thread.id}`)}>
          {thread.title}
        </h2>

        <RichText content={thread.body} variant="full" className="preview-body-rt" />
        <hr className="preview-divider" />

        {thread.tags.length > 0 && (
          <div className="preview-tags">
            {thread.tags.map(tag => (
              <span key={tag} className="rp-tag">#{tag}</span>
            ))}
          </div>
        )}

        <div className="preview-author-row">
          <Link
            href={authorProfileHref}
            className="rp-author-link"
            aria-label={`Open profile of ${authorLabel}`}
          >
            <span className="rp-avatar" style={{ background: `linear-gradient(135deg,${av1},${av2})` }}>
              {initials(authorLabel)}
            </span>
            <div className="rp-author-name">{authorLabel}</div>
          </Link>
          <button
            type="button"
            className={thread.liked_by_me ? "rp-like liked" : "rp-like"}
            onClick={handlePanelThreadLike}
            title={user ? (thread.liked_by_me ? "Unlike" : "Like") : "Sign in to like"}
          >
            <Heart size={13} fill={thread.liked_by_me ? "currentColor" : "none"} />
            {thread.like_count > 0 ? thread.like_count : "Like"}
          </button>
        </div>

        <div className="comment-section">
          {postsLoading ? (
            <div className="no-replies">Loading replies...</div>
          ) : posts.length > 0 ? (
            <>
              <div className="comment-label">
                {replyCount} {replyCount === 1 ? "reply" : "replies"}
              </div>
              <div className="comment-tree">
                {posts.map(post => renderReplyChain(post))}
              </div>
            </>
          ) : (
            <div className="no-replies">No replies yet. Be the first to reply.</div>
          )}
        </div>
      </div>

      {actionError && <div className="action-error">{actionError}</div>}

      {replyingTo && (
        <div className="reply-to-bar">
          <span>Replying to <strong>{replyingTo.author}</strong></span>
          <button type="button" className="reply-to-cancel" onClick={() => setReplyingTo(null)} aria-label="Cancel reply">x</button>
        </div>
      )}

      <div className="reply-input-row">
        <div className="reply-input-wrap">
          <input
            ref={replyInputRef}
            className="reply-input"
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
          {mention.isOpen && (
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
                  {mention.query === "" ? "Type a username to search..." : "No users found"}
                </p>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          className="send-btn"
          onClick={() => void handleReply()}
          disabled={!user || !replyText.trim() || replying}
          aria-label="Send reply"
        >
          <Send size={15} />
          <span>Post</span>
        </button>
      </div>

      {threadEditOpen && (
        <div className="modal-overlay" onClick={() => setThreadEditOpen(false)} role="presentation">
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="thread-edit-modal-title">
            <h3 id="thread-edit-modal-title">Edit thread</h3>
            <label htmlFor="thread-edit-title">Title</label>
            <input
              id="thread-edit-title"
              value={threadEditTitle}
              onChange={e => setThreadEditTitle(e.target.value)}
              maxLength={160}
            />
            <label htmlFor="thread-edit-body">Body</label>
            <textarea
              id="thread-edit-body"
              value={threadEditBody}
              onChange={e => setThreadEditBody(e.target.value)}
              rows={6}
              disabled={!canEditThreadBody}
            />
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
              <button type="button" className="modal-btn modal-btn-ghost" onClick={() => setThreadEditOpen(false)}>Cancel</button>
              <button
                type="button"
                className="modal-btn modal-btn-primary"
                disabled={threadEditSaving || !threadEditTitle.trim() || (canEditThreadBody && !threadEditBody.trim())}
                onClick={() => void saveThreadEdit()}
              >
                {threadEditSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {postEditId && (
        <div className="modal-overlay" onClick={() => setPostEditId(null)} role="presentation">
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="comment-edit-modal-title">
            <h3 id="comment-edit-modal-title">Edit comment</h3>
            <div className="modal-input-wrap">
              <textarea
                ref={postEditInputRef}
                value={postEditText}
                onChange={handlePostEditChange}
                rows={5}
                onKeyDown={e => {
                  if (editMention.onKeyDown(e, insertPostEditMention)) return;
                }}
                onBlur={() => setTimeout(editMention.close, 150)}
              />
              {editMention.isOpen && (
                <div className="mention-dropdown">
                  {editMention.suggestions.length > 0 ? (
                    editMention.suggestions.map((s, i) => (
                      <button
                        key={s.username}
                        type="button"
                        className={`mention-item${i === editMention.selectedIdx ? " selected" : ""}`}
                        onMouseDown={e => { e.preventDefault(); insertPostEditMention(i); }}
                      >
                        <span className="mention-dn">{s.display_name}</span>
                        <span className="mention-un">@{s.username}</span>
                      </button>
                    ))
                  ) : (
                    <p className="mention-hint">
                      {editMention.query === "" ? "Type a username to search..." : "No users found"}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="modal-btn modal-btn-ghost" onClick={() => setPostEditId(null)}>Cancel</button>
              <button
                type="button"
                className="modal-btn modal-btn-primary"
                disabled={postEditSaving || !postEditText.trim()}
                onClick={() => void savePostEdit()}
              >
                {postEditSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {postDeleteId && (
        <div className="modal-overlay" onClick={() => setPostDeleteId(null)} role="presentation">
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="comment-delete-modal-title">
            <h3 id="comment-delete-modal-title">Delete comment</h3>
            <p className="modal-note">Are you sure you want to delete this comment? This action cannot be undone.</p>
            <div className="modal-actions">
              <button type="button" className="modal-btn modal-btn-ghost" onClick={() => setPostDeleteId(null)}>Cancel</button>
              <button type="button" className="modal-btn modal-btn-danger" onClick={() => void confirmPostDelete()}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {threadDeleteOpen && (
        <div className="modal-overlay" onClick={() => setThreadDeleteOpen(false)} role="presentation">
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="thread-delete-modal-title">
            <h3 id="thread-delete-modal-title">Delete thread</h3>
            <p className="modal-note">Are you sure you want to delete this thread? This action cannot be undone.</p>
            <div className="modal-actions">
              <button type="button" className="modal-btn modal-btn-ghost" onClick={() => setThreadDeleteOpen(false)}>Cancel</button>
              <button type="button" className="modal-btn modal-btn-danger" onClick={() => void confirmThreadDelete()}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{panelStyles}</style>
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
    <div className="right-panel create-panel">
      {/* Header */}
      <div className="rp-header">
        <span className="rp-eyebrow">New Thread</span>
        <button type="button" className="icon-btn" onClick={onClose} title="Cancel" aria-label="Cancel creating thread">
          <X size={14} />
        </button>
      </div>

      <h2 className="rp-title" style={{ fontSize: 22, marginBottom: 20 }}>Start a Discussion</h2>

      {/* Form */}
      <div className="cf-group">
        <label className="cf-label" htmlFor={titleInputId}>Title</label>
        <input
          id={titleInputId}
          className="cf-input"
          placeholder="What do you want to discuss?"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={160}
        />
        <span className="cf-hint">{title.length}/160</span>
      </div>

      <div className="cf-group">
        <label className="cf-label" htmlFor={tagsInputId}>Tags</label>
        <input
          id={tagsInputId}
          className="cf-input"
          placeholder="fastapi, backend, career"
          value={tagsInput}
          onChange={e => setTagsInput(e.target.value)}
        />
        {parsedTags.length > 0 && (
          <div className="cf-tags">
            {parsedTags.map(t => <span key={t} className="cf-tag">#{t}</span>)}
          </div>
        )}
      </div>

      <div className="cf-group" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="cf-label-row">
          <label className="cf-label" htmlFor={bodyInputId}>Body</label>
          <div className="cf-composer-tabs">
            <button type="button" className={`cf-composer-tab${!bodyPreview ? " active" : ""}`} onClick={() => setBodyPreview(false)}>Write</button>
            <button type="button" className={`cf-composer-tab${bodyPreview ? " active" : ""}`} onClick={() => setBodyPreview(true)} disabled={!body.trim()}>Preview</button>
          </div>
        </div>
        {bodyPreview ? (
          <div className="cf-preview">
            <RichText content={body} variant="full" />
          </div>
        ) : (
          <textarea
            id={bodyInputId}
            className="cf-textarea"
            placeholder={"Share context, ask for feedback…\n\n**bold** *italic* `code`\n> blockquote\n- list item"}
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={2400}
            aria-describedby={bodyCountId}
          />
        )}
        <div className="cf-footer-row">
          <span className="tone-chip">
            <Sparkles size={11} />
            {toneResult
              ? `Tone ${toneResult.score.toFixed(2)} ${toneResult.warning ? "· warning" : "· clear"}`
              : "No tone check yet"}
          </span>
          <span id={bodyCountId} className={`cf-count ${bodyCount > 1800 ? "warn" : ""}`}>{bodyCount}/2400</span>
        </div>
      </div>

      {/* Tone warning */}
      {showToneWarning && toneResult && (
        <div className="tone-warning">
          <p className="tw-title">Tone Warning</p>
          <p className="tw-body">{toneResult.reason ?? "Your draft may read as harsh."}</p>
          {toneResult.suggestion && <p className="tw-suggestion">{toneResult.suggestion}</p>}
          <div className="tw-actions">
            <button type="button" className="cf-btn-ghost" onClick={() => setShowToneWarning(false)}>
              Edit Draft
            </button>
            <button
              type="button"
              className="cf-btn-primary"
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

      {error && <div className="cf-error">{error}</div>}

      <div className="cf-actions">
        <button
          type="button"
          className="cf-btn-ghost"
          disabled={!body.trim() || isSubmitting}
          onClick={async () => { try { setError(null); await runToneCheck(); } catch { setError("Tone check failed"); } }}
        >
          <Sparkles size={13} /> Check Tone
        </button>
        <button
          type="button"
          className="cf-btn-primary"
          disabled={isSubmitting || !title.trim() || !body.trim()}
          onClick={() => handleSubmit(false)}
        >
          {isSubmitting ? "Creating…" : "Create Thread"}
        </button>
      </div>

      <style jsx>{panelStyles}</style>
    </div>
  );
}

// ─── Shared panel styles ───────────────────────────────────────────────────────

const panelStyles = `
  .right-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 24px 20px;
    overflow-y: auto;
    position: relative;
    padding-top: 20px;
  }
  .right-panel::-webkit-scrollbar { width: 4px; }
  .right-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 99px; }
  .right-panel-empty {
    align-items: center;
    justify-content: center;
  }
  .empty-hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: var(--muted, #636f8d);
    font-size: 13px;
  }
  .empty-icon {
    width: 52px; height: 52px; border-radius: 16px;
    background: var(--app-card-hover, #181b27); border: 1px solid var(--app-border, #1c1f2e);
    display: flex; align-items: center; justify-content: center;
    color: var(--muted, #636f8d);
  }
  .rp-close {
    position: absolute; top: 16px; right: 16px;
    width: 28px; height: 28px; border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04); color: var(--muted, #636f8d);
    display: grid; place-items: center; cursor: pointer; transition: all 0.15s;
    flex-shrink: 0;
  }
  .rp-close:hover { color: var(--text, #e4e8f4); border-color: rgba(255,255,255,0.18); }
  .status-pill {
    border-radius: 4px; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.6px; padding: 2px 8px;
  }
  .preview-status-row {
    display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-shrink: 0;
    padding-right: 40px;
  }
  .rp-time { margin-left: auto; font-size: 12px; color: var(--muted, #636f8d); white-space: nowrap; }
  .preview-actions { display: inline-flex; align-items: center; gap: 6px; }
  .preview-action-btn {
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
    color: #636f8d;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    cursor: pointer;
    transition: all 0.15s;
    font-family: var(--sans), sans-serif;
  }
  .preview-action-btn:hover { color: var(--text, #e4e8f4); border-color: rgba(255,255,255,0.2); }
  .preview-action-btn.danger:hover {
    color: #fca5a5;
    border-color: rgba(252,165,165,0.35);
    background: rgba(240,107,107,0.12);
  }
  .preview-title {
    font-family: var(--serif), sans-serif;
    font-size: 19px; font-weight: 700; line-height: 1.3; letter-spacing: -0.4px;
    margin: 0 0 12px; color: var(--text, #e4e8f4); flex-shrink: 0;
    cursor: pointer; border: none; background: transparent; text-align: left;
    padding: 0; font-family: var(--serif), sans-serif;
  }
  .preview-title:hover { color: #38BDF8; }
  .preview-body-rt { margin-bottom: 0; }
  .preview-divider {
    border: none; border-top: 1px solid var(--app-border, #1c1f2e); margin: 20px 0;
  }
  .preview-tags {
    display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; flex-shrink: 0;
  }
  .rp-tag {
    border: 1px solid var(--app-border, #1c1f2e); color: var(--muted, #636f8d);
    background: rgba(255,255,255,0.05); border-radius: 4px;
    font-size: 11px; font-weight: 500; padding: 2px 8px; transition: all 0.15s;
  }
  .rp-tag:hover { background: rgba(129,140,248,0.12); color: #a5b4fc; border-color: rgba(129,140,248,0.25); }
  .preview-author-row { display: flex; align-items: center; gap: 8px; margin-top: 16px; flex-shrink: 0; justify-content: space-between; }
  .rp-author-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    border-radius: 8px;
    padding: 2px 4px;
    transition: background 0.12s ease;
  }
  .rp-author-link:hover { background: rgba(255,255,255,0.05); }
  .rp-author-link:focus-visible { outline: 2px solid rgba(14,165,233,0.45); outline-offset: 1px; }
  .rp-avatar {
    width: 26px; height: 26px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 700; color: #fff; flex-shrink: 0;
  }
  .rp-author-name { font-size: 12.5px; font-weight: 600; color: var(--text, #e4e8f4); }
  .rp-meta { font-size: 11px; color: var(--muted, #636f8d); margin-top: 1px; }
  /* Detail panel layout */
  .rp-layout {
    height: 100%; display: flex; flex-direction: column;
  }
  .rp-scroll {
    flex: 1; overflow-y: auto; padding: 52px 20px 24px; position: relative;
  }
  .rp-scroll::-webkit-scrollbar { width: 4px; }
  .rp-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 99px; }
  /* Inline replies */
  .comment-section {
    margin-top: 24px;
    border-top: 1px solid var(--app-border, #1c1f2e);
    padding-top: 16px;
  }
  .comment-label {
    font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: none;
    color: var(--muted, #636f8d); margin-bottom: 12px;
  }
  .comment-tree { display: flex; flex-direction: column; gap: 10px; }
  .comment-thread { position: relative; }
  .comment-thread.is-child::before {
    content: "";
    position: absolute;
    left: -12px;
    top: 16px;
    width: 8px;
    border-top: 1px solid rgba(255,255,255,0.14);
  }
  .comment-children {
    margin-top: 8px;
    margin-left: 18px;
    padding-left: 12px;
    border-left: 1px solid rgba(255,255,255,0.10);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .comment-children-flat {
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .comment-children-flat .comment-thread.is-child::before { display: none; }
  .comment { display: flex; gap: 10px; }
  .comment-author-link {
    display: inline-flex;
    text-decoration: none;
    border-radius: 999px;
  }
  .comment-author-link:focus-visible { outline: 2px solid rgba(14,165,233,0.45); outline-offset: 1px; }
  .comment-av {
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0;
    margin-top: 6px;
  }
  .comment-body {
    flex: 1; min-width: 0;
    border: 1px solid rgba(255,255,255,0.08);
    background: var(--app-card-hover, #181b27);
    border-radius: 10px;
    padding: 8px 10px;
  }
  .comment-name-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; flex-wrap: wrap; }
  .comment-name-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    text-decoration: none;
    border-radius: 6px;
    padding: 2px 4px;
    transition: background 0.12s ease;
  }
  .comment-name-link:hover { background: rgba(255,255,255,0.05); }
  .comment-name-link:focus-visible { outline: 2px solid rgba(14,165,233,0.45); outline-offset: 1px; }
  .comment-name { font-size: 12px; font-weight: 700; color: var(--text, #e4e8f4); }
  .comment-username { font-size: 10.5px; color: var(--muted, #636f8d); }
  .comment-sep { font-size: 10px; color: var(--muted, #636f8d); }
  .comment-time { font-size: 10.5px; color: var(--muted, #636f8d); font-weight: 500; }
  .comment-owner-actions {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .comment-owner-actions button {
    border: none;
    background: transparent;
    color: #8f97af;
    font-size: 10.5px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
    font-family: var(--sans), sans-serif;
    transition: all 0.12s;
  }
  .comment-owner-actions button:hover { color: #d7deee; background: rgba(255,255,255,0.06); }
  .comment-owner-actions button.danger:hover {
    color: #fca5a5;
    background: rgba(240,107,107,0.12);
  }
  .comment-text { font-size: 12.5px; }
  .no-replies { font-size: 13px; color: var(--muted, #636f8d); padding: 14px 0; }
  .rp-like {
    border: none; background: transparent; color: var(--muted, #636f8d); font-size: 11px;
    display: inline-flex; align-items: center; gap: 4px; cursor: pointer;
    padding: 2px 7px; border-radius: 5px; transition: all 0.15s;
    font-family: var(--sans), sans-serif;
  }
  .rp-like:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
  .rp-like.liked { color: #ef4444; }
  .comment-footer { display: flex; align-items: center; gap: 4px; margin-top: 4px; }
  .comment-like {
    border: none; background: transparent; color: var(--muted, #636f8d); font-size: 11px;
    display: inline-flex; align-items: center; gap: 4px; cursor: pointer;
    padding: 2px 6px; border-radius: 4px; transition: all 0.12s;
    font-family: var(--sans), sans-serif;
  }
  .comment-like:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
  .comment-like.liked { color: #ef4444; }
  .comment-reply-btn {
    border: none; background: transparent; color: var(--muted, #636f8d);
    font-size: 11px; cursor: pointer; padding: 3px 6px; border-radius: 4px;
    font-family: var(--sans), sans-serif; font-weight: 500;
    transition: all 0.12s; margin-top: 4px; display: inline-block;
  }
  .comment-reply-btn:hover { color: #818cf8; background: rgba(99,102,241,0.1); }
  .action-error {
    margin: 0 20px;
    border: 1px solid rgba(239,68,68,0.35);
    background: rgba(239,68,68,0.1);
    color: #fca5a5;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.35;
  }
  /* Reply-to indicator */
  .reply-to-bar {
    padding: 6px 20px; background: rgba(99,102,241,0.08);
    border-top: 1px solid rgba(99,102,241,0.2);
    font-size: 12px; color: var(--muted, #636f8d);
    display: flex; align-items: center; gap: 6px; flex-shrink: 0;
  }
  .reply-to-bar strong { color: #a5b4fc; font-weight: 600; }
  .reply-to-cancel {
    margin-left: auto; border: none; background: transparent;
    color: var(--muted, #636f8d); cursor: pointer; font-size: 16px; line-height: 1;
    padding: 0 2px; transition: color 0.12s;
  }
  .reply-to-cancel:hover { color: var(--text, #e4e8f4); }
  /* Reply input row */
  .reply-input-row {
    padding: 14px 20px; border-top: 1px solid var(--app-border, #1c1f2e);
    background: var(--app-card, #13151f); display: flex; gap: 10px; align-items: center; flex-shrink: 0;
  }
  .reply-input {
    flex: 1; background: var(--app-card-hover, #181b27); border: 1px solid var(--app-border, #1c1f2e);
    border-radius: 9px; padding: 9px 14px;
    color: var(--text, #e4e8f4); font-family: var(--sans), sans-serif; font-size: 13px;
    outline: none; transition: all 0.2s;
  }
  .reply-input::placeholder { color: var(--muted, #636f8d); }
  .reply-input:focus { border-color: #0EA5E9; box-shadow: 0 0 0 3px rgba(14,165,233,0.15); }
  .reply-input:disabled { opacity: 0.5; cursor: not-allowed; }
  .reply-input-wrap { position: relative; flex: 1; }
  .reply-input-wrap .reply-input { width: 100%; box-sizing: border-box; }
  .mention-dropdown {
    position: absolute; bottom: calc(100% + 6px); left: 0; right: 0;
    background: #10131d; border: 1px solid #1e2235; border-radius: 10px;
    overflow: hidden; z-index: 60; box-shadow: 0 4px 20px rgba(0,0,0,0.45);
  }
  .mention-item {
    width: 100%; display: flex; align-items: center; gap: 8px;
    padding: 8px 12px; background: transparent; border: none; border-bottom: 1px solid #151927;
    text-align: left; cursor: pointer; transition: background 0.1s;
  }
  .mention-item:last-child { border-bottom: none; }
  .mention-item:hover, .mention-item.selected { background: #151927; }
  .mention-dn { font-size: 13px; color: #e4e8f4; font-weight: 500; font-family: var(--sans), sans-serif; }
  .mention-un { font-size: 11px; color: #5a6480; margin-left: auto; font-family: var(--sans), sans-serif; }
  .mention-hint { margin: 0; padding: 10px 12px; font-size: 12px; color: #5a6480; font-style: italic; }
  .send-btn {
    height: 36px; border-radius: 9px;
    background: #0EA5E9; border: none; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 0 12px;
    color: #fff; transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(14,165,233,0.25); flex-shrink: 0;
    font-size: 12px; font-weight: 700; font-family: var(--sans), sans-serif;
  }
  .send-btn:hover:not(:disabled) { background: #38BDF8; transform: scale(1.05); }
  .send-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(5, 7, 12, 0.72);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1200;
    padding: 16px;
  }
  .modal {
    width: min(460px, 100%);
    border: 1px solid #252b40;
    background: #10131d;
    border-radius: 12px;
    padding: 14px;
    box-shadow: 0 16px 44px rgba(0,0,0,0.5);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .modal h3 {
    margin: 0 0 4px;
    font-size: 15px;
    color: #e4e8f4;
    font-weight: 700;
  }
  .modal label {
    font-size: 11px;
    font-weight: 600;
    color: #8f97af;
  }
  .modal input,
  .modal textarea {
    border: 1px solid #252b40;
    border-radius: 8px;
    background: #0b0f1b;
    color: #e4e8f4;
    padding: 8px 10px;
    font-size: 13px;
    font-family: var(--sans), sans-serif;
    outline: none;
  }
  .modal input:focus,
  .modal textarea:focus {
    border-color: #0EA5E9;
    box-shadow: 0 0 0 3px rgba(14,165,233,0.15);
  }
  .modal textarea {
    resize: vertical;
    min-height: 92px;
    line-height: 1.5;
  }
  .modal-input-wrap {
    position: relative;
  }
  .modal-input-wrap textarea {
    width: 100%;
    box-sizing: border-box;
  }
  .modal-input-wrap .mention-dropdown {
    position: absolute;
    left: 0;
    right: 0;
    bottom: calc(100% + 6px);
  }
  .modal textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .modal-note {
    margin: 2px 0 0;
    font-size: 12px;
    color: #636f8d;
    line-height: 1.5;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 6px;
  }
  .modal-btn {
    border: none;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    font-family: var(--sans), sans-serif;
    transition: all 0.12s;
  }
  .modal-btn-ghost {
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.03);
    color: #636f8d;
  }
  .modal-btn-ghost:hover { color: #e4e8f4; border-color: rgba(255,255,255,0.2); }
  .modal-btn-primary {
    background: #0EA5E9;
    color: #fff;
  }
  .modal-btn-primary:hover:not(:disabled) { background: #38BDF8; }
  .modal-btn-danger {
    background: #ef4444;
    color: #fff;
  }
  .modal-btn-danger:hover { background: #f87171; }
  .modal-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  /* Create form */
  .create-panel { gap: 14px; }
  .cf-group { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
  .cf-label-row { display: flex; align-items: center; justify-content: space-between; }
  .cf-composer-tabs { display: flex; gap: 2px; }
  .cf-composer-tab {
    border: none; background: transparent; cursor: pointer;
    font-size: 11px; font-weight: 600; color: var(--muted, #636f8d);
    padding: 3px 9px; border-radius: 5px;
    transition: color 0.15s, background 0.15s; font-family: var(--sans), sans-serif;
  }
  .cf-composer-tab:hover:not(:disabled) { color: var(--muted, #636f8d); background: rgba(255,255,255,0.05); }
  .cf-composer-tab.active { color: #0EA5E9; background: rgba(14,165,233,0.10); }
  .cf-composer-tab:disabled { opacity: 0.3; cursor: not-allowed; }
  .cf-preview {
    flex: 1; min-height: 140px; background: var(--app-card-hover, #181b27);
    border: 1.5px solid rgba(255,255,255,0.1); border-radius: 9px;
    padding: 10px 12px; overflow-y: auto;
  }
  .cf-label {
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--muted, #636f8d);
  }
  .cf-input {
    background: var(--app-card-hover, #181b27);
    border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 9px;
    color: var(--text, #e4e8f4);
    font-size: 13px;
    padding: 9px 12px;
    outline: none;
    font-family: inherit;
    transition: border-color 0.15s;
  }
  .cf-input:focus { border-color: #0EA5E9; box-shadow: 0 0 0 3px rgba(14,165,233,0.15); }
  .cf-hint { font-size: 10px; color: var(--muted, #636f8d); text-align: right; margin-top: -2px; }
  .cf-tags { display: flex; flex-wrap: wrap; gap: 5px; }
  .cf-tag {
    background: rgba(129,140,248,0.12);
    border: 1px solid rgba(129,140,248,0.25);
    color: #a5b4fc;
    border-radius: 999px;
    font-size: 11px; font-weight: 600;
    padding: 2px 8px;
  }
  .cf-textarea {
    flex: 1;
    min-height: 140px;
    background: var(--app-card-hover, #181b27);
    border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 9px;
    color: var(--text, #e4e8f4);
    font-size: 13px;
    padding: 10px 12px;
    outline: none;
    font-family: inherit;
    line-height: 1.65;
    resize: vertical;
    transition: border-color 0.15s;
  }
  .cf-textarea:focus { border-color: #0EA5E9; box-shadow: 0 0 0 3px rgba(14,165,233,0.15); }
  .cf-footer-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 5px;
  }
  .tone-chip {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; color: var(--muted, #636f8d);
  }
  .cf-count { font-size: 11px; color: var(--muted, #636f8d); }
  .cf-count.warn { color: #f5c642; }
  .cf-error {
    border: 1px solid rgba(239,68,68,0.35);
    background: rgba(239,68,68,0.1);
    color: #fca5a5;
    border-radius: 9px;
    padding: 8px 12px;
    font-size: 12px;
    flex-shrink: 0;
  }
  .tone-warning {
    border: 1px solid rgba(245,198,66,0.35);
    background: rgba(245,198,66,0.08);
    border-radius: 11px;
    padding: 12px 14px;
    flex-shrink: 0;
  }
  .tw-title { font-size: 13px; font-weight: 700; color: #f5c642; margin-bottom: 5px; }
  .tw-body { font-size: 12px; color: var(--muted, #636f8d); margin-bottom: 6px; }
  .tw-suggestion {
    font-size: 12px; color: #7dd3fc;
    border-left: 2px solid rgba(14,165,233,0.5);
    padding-left: 8px; margin-bottom: 10px;
  }
  .tw-actions { display: flex; gap: 8px; justify-content: flex-end; }
  .cf-actions {
    display: flex; gap: 8px;
    padding-top: 12px;
    border-top: 1px solid var(--app-border, #1c1f2e);
    flex-shrink: 0;
  }
  .cf-btn-ghost {
    flex: 1; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04);
    color: var(--muted, #636f8d); border-radius: 9px; padding: 9px;
    font-size: 12px; font-weight: 600; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 5px;
    transition: all 0.15s; font-family: var(--sans), sans-serif;
  }
  .cf-btn-ghost:hover:not(:disabled) { color: var(--text, #e4e8f4); border-color: rgba(255,255,255,0.18); }
  .cf-btn-ghost:disabled { opacity: 0.45; cursor: not-allowed; }
  .cf-btn-primary {
    flex: 1.4; background: #0EA5E9; color: #fff;
    border: none; border-radius: 9px; padding: 9px;
    font-size: 12px; font-weight: 700; cursor: pointer;
    box-shadow: 0 4px 14px rgba(14,165,233,0.3);
    transition: all 0.15s; font-family: var(--sans), sans-serif;
  }
  .cf-btn-primary:hover:not(:disabled) { background: #38BDF8; }
  .cf-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
`;
