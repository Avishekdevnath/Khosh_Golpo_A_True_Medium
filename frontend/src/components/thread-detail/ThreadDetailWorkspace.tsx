// frontend/src/components/thread-detail/ThreadDetailWorkspace.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { markThreadRead } from "@/lib/profileApi";
import { apiPost } from "@/lib/api";
import { shareThread } from "@/lib/shareThread";

import RichText from "@/components/shared/RichText";
import ReportModal from "@/components/shared/ReportModal";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/ui/toast";
import { useThreadDetail, type PostNode, type ThreadOut } from "./useThreadDetail";
import ThreadHeader from "./ThreadHeader";
import PostTree from "./PostTree";
import ReplyComposer from "./ReplyComposer";
import MoreFromAuthor from "@/components/threads/article/MoreFromAuthor";

// ─── Types ────────────────────────────────────────────────────────────────────

type ThreadDetailWorkspaceProps = {
  thread: ThreadOut;
  initialPosts: PostNode[];
  onThreadUpdate?: (thread: ThreadOut) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeTagsInput(raw: string): string[] {
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

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export default function ThreadDetailWorkspace({
  thread: initial,
  initialPosts,
  onThreadUpdate,
}: ThreadDetailWorkspaceProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToast();

  function showToast(message: string, type: "success" | "error" = "success") {
    if (type === "error") toast.error(message);
    else toast.success(message);
  }

  const {
    thread,
    posts,
    userCache,
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
  } = useThreadDetail(initial, initialPosts, showToast, onThreadUpdate);

  // ── Reply composer state ───────────────────────────────────────────────────
  const [reply, setReply] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyPreview, setReplyPreview] = useState(false);
  const [replyToPost, setReplyToPost] = useState<PostNode | null>(null);

  // ── Thread edit modal ──────────────────────────────────────────────────────
  const [threadEditOpen, setThreadEditOpen] = useState(false);
  const [threadEditTitle, setThreadEditTitle] = useState("");
  const [threadEditBody, setThreadEditBody] = useState("");
  const [threadEditTags, setThreadEditTags] = useState("");
  const [threadEditSaving, setThreadEditSaving] = useState(false);
  const [threadEditPreview, setThreadEditPreview] = useState(false);

  // ── Post edit modal ────────────────────────────────────────────────────────
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editPreview, setEditPreview] = useState(false);

  // ── Delete confirmation ────────────────────────────────────────────────────
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Report modal ───────────────────────────────────────────────────────────
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportTargetType, setReportTargetType] = useState<"thread" | "post">("post");

  // ── Derived ───────────────────────────────────────────────────────────────
  const isAdmin = user?.role === "admin";
  const isThreadOwner = user?.id === thread.author_id;
  const canEditThread = Boolean(user && (isAdmin || (isThreadOwner && thread.status !== "archived")));
  const canEditThreadBody = Boolean(isAdmin || thread.post_count === 0);

  // ── Fire-and-forget mark-read on mount ────────────────────────────────────
  useEffect(() => {
    if (initial.id) void markThreadRead(initial.id);
  }, [initial.id]);

  // ── Escape key closes modals ───────────────────────────────────────────────
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

  // ── Navigation ─────────────────────────────────────────────────────────────
  function handleBackNavigation() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/threads");
  }

  async function handleSaveToggle() {
    if (!user?.id) {
      showToast("Sign in to save threads", "error");
      return;
    }
    await handleThreadSave();
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

  // ── Thread edit ────────────────────────────────────────────────────────────
  function openThreadEdit() {
    setThreadEditTitle(thread.title);
    setThreadEditBody(thread.body);
    setThreadEditTags(thread.tags.join(", "));
    setThreadEditPreview(false);
    setThreadEditOpen(true);
  }

  async function handleSaveThreadEdit() {
    setThreadEditSaving(true);
    try {
      await saveThreadEdit(threadEditTitle, threadEditBody, threadEditTags, canEditThreadBody);
      setThreadEditOpen(false);
    } catch {
      showToast("Failed to update thread", "error");
    } finally {
      setThreadEditSaving(false);
    }
  }

  // ── Post edit ──────────────────────────────────────────────────────────────
  function handleEdit(id: string, content: string) {
    setEditId(id);
    setEditText(content);
    setEditPreview(false);
  }

  async function handleSaveEdit() {
    if (!editId || !editText.trim()) return;
    setEditSaving(true);
    try {
      await saveEdit(editId, editText);
      setEditId(null);
    } catch {
      showToast("Failed to save edit", "error");
    } finally {
      setEditSaving(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleConfirmDelete() {
    if (!deleteConfirmId) return;
    try {
      await confirmDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch {
      showToast("Failed to delete post", "error");
      setDeleteConfirmId(null);
    }
  }

  // ── Reply submit ───────────────────────────────────────────────────────────
  async function handleSubmitReply() {
    if (!reply.trim()) return;
    setPosting(true);
    setReplyErr(null);
    try {
      await submitReply(reply.trim(), replyToPost?.id ?? null);
      setReply("");
      setReplyPreview(false);
      setReplyToPost(null);
    } catch (e) {
      setReplyErr(e instanceof Error ? e.message : "Failed to post");
    } finally {
      setPosting(false);
    }
  }

  // ── Report ─────────────────────────────────────────────────────────────────
  async function handleSubmitReport(reason: string, detail: string) {
    if (!reportTargetId) return;
    await submitReport(reason, detail, reportTargetId, reportTargetType);
  }

  // ── Author display (for MoreFromAuthor) ────────────────────────────────────
  const cachedAuthor = userCache.get(thread.author_id);
  const authorDisplay =
    cachedAuthor?.display_name ?? thread.author_display_name ?? thread.author_id.slice(-4);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Full-page article layout — no WorkspaceShell ── */}
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto ws-scroll">

        <ThreadHeader
          thread={thread}
          userCache={userCache}
          currentUserId={user?.id ?? null}
          canEditThread={canEditThread}
          isThreadOwner={isThreadOwner}
          onBack={handleBackNavigation}
          onLike={handleThreadLike}
          onSave={handleSaveToggle}
          onShare={handleShareThread}
          onEditOpen={openThreadEdit}
          onReport={() => {
            setReportTargetId(thread.id);
            setReportTargetType("thread");
          }}
        />

        {/* ── Responses section ── */}
        <div className="max-w-[680px] mx-auto w-full px-5 sm:px-8 pb-24">

          {/* Inline reply composer */}
          <ReplyComposer
            reply={reply}
            setReply={setReply}
            posting={posting}
            replyErr={replyErr}
            replyPreview={replyPreview}
            setReplyPreview={setReplyPreview}
            replyToPost={replyToPost}
            setReplyToPost={setReplyToPost}
            userCache={userCache}
            currentUser={user ?? null}
            onSubmit={handleSubmitReply}
          />

          {/* Posts list */}
          <PostTree
            posts={posts}
            currentUserId={user?.id ?? null}
            currentUsername={user?.username ?? null}
            currentUserRole={user?.role}
            userCache={userCache}
            onEdit={handleEdit}
            onDelete={(id) => setDeleteConfirmId(id)}
            onReply={(post) => setReplyToPost(post)}
            onReport={(postId) => {
              setReportTargetId(postId);
              setReportTargetType("post");
            }}
            onLike={handleLike}
          />

          {/* More from this author */}
          <MoreFromAuthor
            authorId={thread.author_id}
            authorName={authorDisplay}
            currentThreadId={thread.id}
          />
        </div>
      </div>

      {/* ── Thread edit modal ── */}
      {threadEditOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm"
          onClick={() => setThreadEditOpen(false)}
          role="presentation"
        >
          <div
            className="w-[90%] max-w-[480px] bg-[#0f1117] border border-[#1c1f2e] rounded-[14px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="thread-edit-modal-title"
          >
            <h3 id="thread-edit-modal-title" className="font-serif text-[18px] m-0 mb-3.5">
              Edit thread
            </h3>

            <label htmlFor="thread-edit-title" className="block text-[11px] text-[#9ba3be] font-bold mb-1.5 uppercase tracking-[0.06em]">
              Title
            </label>
            <input
              id="thread-edit-title"
              value={threadEditTitle}
              onChange={(e) => setThreadEditTitle(e.target.value)}
              maxLength={160}
              className="w-full box-border bg-[#151821] border-[1.5px] border-[#1c1f2e] rounded-[10px] text-[#e4e8f4] text-[13px] px-3 py-2.5 outline-none font-[inherit] leading-snug transition-colors duration-150 mb-2.5 focus:border-[#0EA5E9]"
            />

            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="thread-edit-body" className="text-[11px] text-[#9ba3be] font-bold uppercase tracking-[0.06em]">
                Body
              </label>
              {canEditThreadBody && (
                <div className="flex items-center gap-0 ml-auto">
                  <button
                    type="button"
                    onClick={() => setThreadEditPreview(false)}
                    className={[
                      "border-none bg-transparent cursor-pointer text-[11px] font-semibold px-2.5 py-[7px] transition-colors duration-150 font-[inherit] border-b-2 -mb-px",
                      !threadEditPreview ? "text-[#0EA5E9] border-b-[#0EA5E9]" : "text-[#3d4460] border-b-transparent hover:text-[#7a849e]",
                    ].join(" ")}
                  >
                    Write
                  </button>
                  <button
                    type="button"
                    onClick={() => setThreadEditPreview(true)}
                    disabled={!threadEditBody.trim()}
                    className={[
                      "border-none bg-transparent cursor-pointer text-[11px] font-semibold px-2.5 py-[7px] transition-colors duration-150 font-[inherit] border-b-2 -mb-px disabled:opacity-30 disabled:cursor-not-allowed",
                      threadEditPreview ? "text-[#0EA5E9] border-b-[#0EA5E9]" : "text-[#3d4460] border-b-transparent hover:text-[#7a849e]",
                    ].join(" ")}
                  >
                    Preview
                  </button>
                </div>
              )}
            </div>

            {threadEditPreview && canEditThreadBody ? (
              <div className="min-h-[120px] bg-[#151821] border-[1.5px] border-[#1c1f2e] rounded-[10px] px-3 py-2.5 mb-2.5 w-full box-border">
                <RichText content={threadEditBody} variant="full" />
              </div>
            ) : (
              <textarea
                id="thread-edit-body"
                value={threadEditBody}
                onChange={(e) => setThreadEditBody(e.target.value)}
                rows={6}
                disabled={!canEditThreadBody}
                className="w-full box-border bg-[#151821] border-[1.5px] border-[#1c1f2e] rounded-[10px] text-[#e4e8f4] text-[13px] px-3 py-2.5 outline-none font-[inherit] leading-snug resize-vertical transition-colors duration-150 focus:border-[#0EA5E9] disabled:opacity-60 disabled:cursor-not-allowed"
              />
            )}

            {!canEditThreadBody && (
              <p className="text-[11px] text-[#9ba3be] mt-2 mb-3 leading-snug">
                Body is locked after the first reply. You can still update title and tags.
              </p>
            )}

            <label htmlFor="thread-edit-tags" className="block text-[11px] text-[#9ba3be] font-bold mb-1.5 uppercase tracking-[0.06em]">
              Tags
            </label>
            <input
              id="thread-edit-tags"
              value={threadEditTags}
              onChange={(e) => setThreadEditTags(e.target.value)}
              placeholder="career, fastapi, interview"
              className="w-full box-border bg-[#151821] border-[1.5px] border-[#1c1f2e] rounded-[10px] text-[#e4e8f4] text-[13px] px-3 py-2.5 outline-none font-[inherit] leading-snug transition-colors duration-150 mb-2.5 focus:border-[#0EA5E9]"
            />

            <div className="flex gap-2 mt-3.5 justify-end">
              <button
                type="button"
                onClick={() => setThreadEditOpen(false)}
                className="border border-[#1c1f2e] bg-[#151821] text-[#9ba3be] rounded-lg px-3.5 py-[7px] text-xs font-semibold cursor-pointer transition-all duration-150 hover:text-[#e4e8f4] hover:border-[#2d3450]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={threadEditSaving || !threadEditTitle.trim() || !threadEditBody.trim()}
                onClick={handleSaveThreadEdit}
                className="border-none bg-[#0EA5E9] text-white rounded-lg px-3.5 py-[7px] text-xs font-bold cursor-pointer shadow-[0_4px_14px_rgba(14,165,233,0.3)] transition-opacity duration-150 hover:enabled:opacity-[0.88] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {threadEditSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Post edit modal ── */}
      {editId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm"
          onClick={() => setEditId(null)}
          role="presentation"
        >
          <div
            className="w-[90%] max-w-[480px] bg-[#0f1117] border border-[#1c1f2e] rounded-[14px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-modal-title"
          >
            <div className="flex items-center justify-between mb-2.5">
              <h3 id="edit-modal-title" className="font-serif text-[18px] m-0">
                Edit reply
              </h3>
              <div className="flex items-center gap-0 ml-auto">
                <button
                  type="button"
                  onClick={() => setEditPreview(false)}
                  className={[
                    "border-none bg-transparent cursor-pointer text-[11px] font-semibold px-2.5 py-[7px] transition-colors duration-150 font-[inherit] border-b-2 -mb-px",
                    !editPreview ? "text-[#0EA5E9] border-b-[#0EA5E9]" : "text-[#3d4460] border-b-transparent hover:text-[#7a849e]",
                  ].join(" ")}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setEditPreview(true)}
                  disabled={!editText.trim()}
                  className={[
                    "border-none bg-transparent cursor-pointer text-[11px] font-semibold px-2.5 py-[7px] transition-colors duration-150 font-[inherit] border-b-2 -mb-px disabled:opacity-30 disabled:cursor-not-allowed",
                    editPreview ? "text-[#0EA5E9] border-b-[#0EA5E9]" : "text-[#3d4460] border-b-transparent hover:text-[#7a849e]",
                  ].join(" ")}
                >
                  Preview
                </button>
              </div>
            </div>

            {editPreview ? (
              <div className="min-h-[120px] bg-[#151821] border-[1.5px] border-[#1c1f2e] rounded-[10px] px-3 py-2.5 mb-2.5 w-full box-border">
                <RichText content={editText} variant="full" />
              </div>
            ) : (
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={5}
                className="w-full box-border bg-[#151821] border-[1.5px] border-[#1c1f2e] rounded-[10px] text-[#e4e8f4] text-[13px] px-3 py-2.5 outline-none font-[inherit] leading-snug resize-vertical transition-colors duration-150 focus:border-[#0EA5E9]"
              />
            )}

            <div className="flex gap-2 mt-3.5 justify-end">
              <button
                type="button"
                onClick={() => setEditId(null)}
                className="border border-[#1c1f2e] bg-[#151821] text-[#9ba3be] rounded-lg px-3.5 py-[7px] text-xs font-semibold cursor-pointer transition-all duration-150 hover:text-[#e4e8f4] hover:border-[#2d3450]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editSaving || !editText.trim()}
                onClick={handleSaveEdit}
                className="border-none bg-[#0EA5E9] text-white rounded-lg px-3.5 py-[7px] text-xs font-bold cursor-pointer shadow-[0_4px_14px_rgba(14,165,233,0.3)] transition-opacity duration-150 hover:enabled:opacity-[0.88] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {editSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm"
          onClick={() => setDeleteConfirmId(null)}
          role="presentation"
        >
          <div
            className="w-[90%] max-w-[400px] bg-[#0f1117] border border-[#1c1f2e] rounded-[14px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <h3 id="delete-modal-title" className="font-serif text-[18px] m-0 mb-3.5">
              Delete reply
            </h3>
            <p className="text-[13px] text-[#9ba3be] m-0 mb-4 leading-relaxed">
              Are you sure you want to delete this reply? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="border border-[#1c1f2e] bg-[#151821] text-[#9ba3be] rounded-lg px-3.5 py-[7px] text-xs font-semibold cursor-pointer transition-all duration-150 hover:text-[#e4e8f4] hover:border-[#2d3450]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="border-none bg-[#ef4444] text-white rounded-lg px-3.5 py-[7px] text-xs font-bold cursor-pointer shadow-[0_4px_14px_rgba(239,68,68,0.3)] transition-opacity duration-150 hover:opacity-[0.88]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Report modal ── */}
      {reportTargetId && (
        <ReportModal
          targetType={reportTargetType}
          onClose={() => setReportTargetId(null)}
          onSubmit={handleSubmitReport}
        />
      )}
    </>
  );
}
