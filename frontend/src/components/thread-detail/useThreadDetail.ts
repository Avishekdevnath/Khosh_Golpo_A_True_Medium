// frontend/src/components/thread-detail/useThreadDetail.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import {
  saveThread as saveThreadForProfile,
  unsaveThread as unsaveThreadFromProfile,
} from "@/lib/profileApi";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThreadStatus = "open" | "closed" | "archived";

export type ThreadOut = {
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
  saved_by_me: boolean;
  status: ThreadStatus;
  created_at: string;
  updated_at: string;
};

export type PostNode = {
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

export type PostTreeResponse = { data: PostNode[] };

export type UserBrief = { id: string; username: string; display_name: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function extractMentions(c: string): string[] {
  const m = c.match(/@([a-zA-Z0-9_-]+)/g) ?? [];
  return [...new Set(m.map((x) => x.slice(1).toLowerCase()))];
}

export function normalizeTagsInput(raw: string): string[] {
  const clean = raw
    .split(",")
    .map((tag) => tag.trim().replace(/^#/, "").toLowerCase())
    .filter(Boolean);
  const deduped: string[] = [];
  for (const tag of clean) {
    if (!deduped.includes(tag)) deduped.push(tag);
  }
  return deduped.slice(0, 10);
}

function toggleLikeInTree(nodes: PostNode[], postId: string): PostNode[] {
  return nodes.map((n) => {
    if (n.id === postId) {
      const wasLiked = n.liked_by_me;
      return { ...n, liked_by_me: !wasLiked, like_count: n.like_count + (wasLiked ? -1 : 1) };
    }
    if (n.children.length > 0) return { ...n, children: toggleLikeInTree(n.children, postId) };
    return n;
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseThreadDetailReturn {
  thread: ThreadOut;
  posts: PostNode[];
  userCache: Map<string, UserBrief>;
  refreshPosts: () => Promise<void>;
  handleThreadLike: () => Promise<void>;
  handleThreadSave: () => Promise<void>;
  handleLike: (postId: string) => Promise<void>;
  saveThreadEdit: (
    title: string,
    body: string,
    tags: string,
    canEditBody: boolean,
  ) => Promise<void>;
  saveEdit: (editId: string, content: string) => Promise<void>;
  confirmDelete: (deleteId: string) => Promise<void>;
  submitReply: (
    content: string,
    parentPostId: string | null,
  ) => Promise<void>;
  submitReport: (reason: string, detail: string, targetId: string, targetType: "thread" | "post") => Promise<void>;
  replyErr: string | null;
  setReplyErr: (e: string | null) => void;
  setThread: React.Dispatch<React.SetStateAction<ThreadOut>>;
  setPosts: React.Dispatch<React.SetStateAction<PostNode[]>>;
}

export function useThreadDetail(
  initialThread: ThreadOut,
  initialPosts: PostNode[],
  showToast: (message: string, type?: "success" | "error") => void,
): UseThreadDetailReturn {
  const [thread, setThread] = useState(initialThread);
  const [posts, setPosts] = useState(initialPosts);
  const [replyErr, setReplyErr] = useState<string | null>(null);

  // user identity cache
  const fetchedIds = useRef(new Set<string>());
  const [userCache, setUserCache] = useState<Map<string, UserBrief>>(new Map());

  // ── Fetch display names for all author IDs ─────────────────────────────────
  useEffect(() => {
    const ids = new Set<string>([thread.author_id]);
    function walk(ps: PostNode[]) {
      for (const p of ps) {
        ids.add(p.author_id);
        if (p.children.length > 0) walk(p.children);
      }
    }
    walk(posts);

    const toFetch = [...ids].filter((id) => !fetchedIds.current.has(id));
    if (toFetch.length === 0) return;
    toFetch.forEach((id) => fetchedIds.current.add(id));

    Promise.allSettled(
      toFetch.map((id) => apiGet<UserBrief>(`users/${id}`).then((u) => [id, u] as const)),
    ).then((results) => {
      setUserCache((prev) => {
        const map = new Map(prev);
        for (const r of results) {
          if (r.status === "fulfilled") map.set(r.value[0], r.value[1]);
        }
        return map;
      });
    });
  }, [posts, thread.author_id]);

  // ── Actions ────────────────────────────────────────────────────────────────

  async function refreshPosts() {
    try {
      const d = await apiGet<PostTreeResponse>(`threads/${thread.id}/posts?page=1&limit=50`);
      setPosts(d.data);
    } catch {
      setReplyErr("Failed to refresh replies");
    }
  }

  async function handleThreadLike() {
    const wasLiked = thread.liked_by_me;
    setThread((prev) => ({
      ...prev,
      liked_by_me: !wasLiked,
      like_count: prev.like_count + (wasLiked ? -1 : 1),
    }));
    try {
      await apiPost(`threads/${thread.id}/like`, {});
    } catch {
      setThread((prev) => ({
        ...prev,
        liked_by_me: wasLiked,
        like_count: prev.like_count + (wasLiked ? 1 : -1),
      }));
      showToast("Could not update like", "error");
    }
  }

  async function handleThreadSave() {
    const wasSaved = thread.saved_by_me;
    setThread((prev) => ({
      ...prev,
      saved_by_me: !wasSaved,
    }));
    try {
      if (wasSaved) {
        await unsaveThreadFromProfile(thread.id);
        showToast("Thread removed from saved");
      } else {
        await saveThreadForProfile(thread.id);
        showToast("Thread saved");
      }
    } catch {
      setThread((prev) => ({
        ...prev,
        saved_by_me: wasSaved,
      }));
      showToast(wasSaved ? "Could not remove saved thread" : "Could not save thread", "error");
    }
  }

  async function handleLike(postId: string) {
    setPosts((prev) => toggleLikeInTree(prev, postId));
    try {
      await apiPost(`threads/${thread.id}/posts/${postId}/like`, {});
    } catch {
      setPosts((prev) => toggleLikeInTree(prev, postId));
      showToast("Could not update like", "error");
    }
  }

  async function saveThreadEdit(
    title: string,
    body: string,
    tags: string,
    canEditBody: boolean,
  ) {
    const nextTitle = title.trim();
    const nextBody = body.trim();
    const nextTags = normalizeTagsInput(tags);

    if (!nextTitle || !nextBody) return;

    const payload: { title?: string; body?: string; tags?: string[] } = {};
    if (nextTitle !== thread.title) payload.title = nextTitle;
    if (canEditBody && nextBody !== thread.body) payload.body = nextBody;
    if (JSON.stringify(nextTags) !== JSON.stringify(thread.tags)) payload.tags = nextTags;

    if (Object.keys(payload).length === 0) return;

    const updated = await apiPatch<ThreadOut>(`threads/${thread.id}`, payload);
    setThread(updated);
    showToast("Thread updated");
  }

  async function saveEdit(editId: string, content: string) {
    await apiPatch(`posts/${editId}`, { content: content.trim() });
    await refreshPosts();
    showToast("Reply updated");
  }

  async function confirmDelete(deleteId: string) {
    await apiDelete(`posts/${deleteId}`);
    await refreshPosts();
    showToast("Reply deleted");
  }

  async function submitReply(content: string, parentPostId: string | null) {
    setReplyErr(null);
    await apiPost(`threads/${thread.id}/posts`, {
      content: content.trim(),
      mentions: extractMentions(content),
      parent_post_id: parentPostId ?? null,
    });
    await refreshPosts();
    showToast("Reply posted!");
  }

  async function submitReport(
    reason: string,
    detail: string,
    targetId: string,
    targetType: "thread" | "post",
  ) {
    if (targetType === "thread") {
      await apiPost(`threads/${thread.id}/report`, { reason, detail });
    } else {
      await apiPost(`threads/${thread.id}/posts/${targetId}/report`, { reason, detail });
    }
    showToast("Report submitted — thank you");
  }

  return {
    thread,
    posts,
    userCache,
    refreshPosts,
    handleThreadLike,
    handleThreadSave,
    handleLike,
    saveThreadEdit,
    saveEdit,
    confirmDelete,
    submitReply,
    submitReport,
    replyErr,
    setReplyErr,
    setThread,
    setPosts,
  };
}
