"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Bot,
  Eye,
  Flag,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";

import {
  deletePostByAdmin,
  deleteThreadByAdmin,
  editAdminContentItem,
  getAdminContentItem,
  notifyAdminContentAuthor,
  rereportAdminContentItem,
  updateAdminContentFlag,
  updateThreadPinByAdmin,
  updateThreadStatusByAdmin,
} from "@/lib/adminApi";
import RichText from "@/components/shared/RichText";
import { relativeTime } from "@/lib/workspaceUtils";
import type { AdminContentItem, ThreadStatus } from "@/types/admin";

type AdminContentDetailPageProps = {
  contentType: "thread" | "post";
  contentId: string;
};

function aiSummary(score: number | null): string {
  if (score === null) return "AI report is missing. Re-report is recommended.";
  if (score >= 0.8) return `High risk (score ${score.toFixed(2)}). Auto-flag range.`;
  if (score >= 0.6) return `Warning range (score ${score.toFixed(2)}). Needs review.`;
  if (score >= 0.3) return `Medium risk (score ${score.toFixed(2)}). Review context.`;
  return `Likely safe (score ${score.toFixed(2)}).`;
}

const chipBase = "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide";
const btn = (variant: "neutral" | "ok" | "warn") => {
  const base = "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold cursor-pointer font-[inherit] disabled:opacity-50 disabled:cursor-not-allowed";
  if (variant === "ok") return `${base} border-accent-green/30 bg-accent-green/15 text-green-300`;
  if (variant === "warn") return `${base} border-accent-red/30 bg-accent-red/15 text-red-300`;
  return `${base} border-app-border bg-app-input text-foreground/80`;
};

export default function AdminContentDetailPage({ contentType, contentId }: AdminContentDetailPageProps) {
  const router = useRouter();
  const [item, setItem] = useState<AdminContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const loadItem = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await getAdminContentItem(contentType, contentId);
      setItem(res);
    } catch {
      setError("Failed to load content detail.");
    } finally {
      setLoading(false);
    }
  }, [contentId, contentType]);

  useEffect(() => { void loadItem(); }, [loadItem]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleBackNavigation = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) { router.back(); return; }
    router.push("/admin/content");
  }, [router]);

  const handleRereport = useCallback(async () => {
    if (!item) return;
    setActionLoading("rereport");
    try {
      const updated = await rereportAdminContentItem(item.type, item.id);
      setItem(updated); setToast({ type: "ok", text: "AI report refreshed" });
    } catch { setToast({ type: "err", text: "Failed to re-report with AI" }); }
    finally { setActionLoading(null); }
  }, [item]);

  const handleFlagToggle = useCallback(async () => {
    if (!item) return;
    setActionLoading("flag");
    try {
      const updated = await updateAdminContentFlag(item.type, item.id, !Boolean(item.is_flagged));
      setItem(updated); setToast({ type: "ok", text: updated.is_flagged ? "Item flagged" : "Item unflagged" });
    } catch { setToast({ type: "err", text: "Failed to update flag state" }); }
    finally { setActionLoading(null); }
  }, [item]);

  const handleEdit = useCallback(async () => {
    if (!item) return;
    if (item.type === "thread") {
      const nextTitle = window.prompt("Edit thread title", item.title ?? "");
      if (nextTitle === null) return;
      const nextBody = window.prompt("Edit thread content", item.content ?? "");
      if (nextBody === null) return;
      setActionLoading("edit");
      try {
        const updated = await editAdminContentItem("thread", item.id, { title: nextTitle, content: nextBody });
        setItem(updated); setToast({ type: "ok", text: "Thread updated" });
      } catch { setToast({ type: "err", text: "Failed to edit thread" }); }
      finally { setActionLoading(null); }
      return;
    }
    const nextContent = window.prompt("Edit post content", item.content ?? "");
    if (nextContent === null) return;
    setActionLoading("edit");
    try {
      const updated = await editAdminContentItem("post", item.id, { content: nextContent });
      setItem(updated); setToast({ type: "ok", text: "Post updated" });
    } catch { setToast({ type: "err", text: "Failed to edit post" }); }
    finally { setActionLoading(null); }
  }, [item]);

  const handleNotify = useCallback(async () => {
    if (!item) return;
    const message = window.prompt("Notify the author", `Admin update: action taken on your ${item.type}.`);
    if (message === null) return;
    if (!message.trim()) { setToast({ type: "err", text: "Message cannot be empty" }); return; }
    setActionLoading("notify");
    try {
      await notifyAdminContentAuthor(item.type, item.id, message.trim());
      setToast({ type: "ok", text: "Author notified" });
    } catch { setToast({ type: "err", text: "Failed to notify author" }); }
    finally { setActionLoading(null); }
  }, [item]);

  const handleDelete = useCallback(async () => {
    if (!item || item.is_deleted) return;
    const ok = window.confirm(`Delete this ${item.type}?`);
    if (!ok) return;
    setActionLoading("delete");
    try {
      if (item.type === "thread") await deleteThreadByAdmin(item.id);
      else await deletePostByAdmin(item.id);
      await loadItem(); setToast({ type: "ok", text: `${item.type} deleted` });
    } catch { setToast({ type: "err", text: "Failed to delete item" }); }
    finally { setActionLoading(null); }
  }, [item, loadItem]);

  const handleStatusChange = useCallback(async (status: ThreadStatus) => {
    if (!item || item.type !== "thread") return;
    setActionLoading("status");
    try {
      await updateThreadStatusByAdmin(item.id, status);
      await loadItem(); setToast({ type: "ok", text: "Thread status updated" });
    } catch { setToast({ type: "err", text: "Failed to update status" }); }
    finally { setActionLoading(null); }
  }, [item, loadItem]);

  const handlePinToggle = useCallback(async () => {
    if (!item || item.type !== "thread") return;
    setActionLoading("pin");
    try {
      await updateThreadPinByAdmin(item.id, !Boolean(item.is_pinned));
      await loadItem(); setToast({ type: "ok", text: item.is_pinned ? "Thread unpinned" : "Thread pinned" });
    } catch { setToast({ type: "err", text: "Failed to update pin state" }); }
    finally { setActionLoading(null); }
  }, [item, loadItem]);

  return (
    <div className="min-h-screen bg-app-bg p-4 text-foreground">
      <div className="mx-auto mb-2.5 max-w-[1200px]">
        <button type="button" className={btn("neutral")} onClick={handleBackNavigation}>
          <ArrowLeft size={14} /> Back to Content
        </button>
      </div>

      <main className="mx-auto max-w-[1200px] rounded-2xl border border-app-border bg-app-panel p-5">
        {loading ? (
          <div className="py-14 text-center text-sm text-muted-foreground">Loading content detail...</div>
        ) : error || !item ? (
          <div className="flex items-center gap-2 rounded-xl border border-accent-red/24 bg-accent-red/10 px-4 py-3.5 text-[13px] text-red-300">
            <AlertTriangle size={14} /> {error ?? "Item not found"}
          </div>
        ) : (
          <>
            <h1 className="m-0 font-serif text-[28px] leading-snug text-foreground">
              {item.type === "thread" ? item.title ?? "(untitled thread)" : `Post ${item.id.slice(-6)}`}
            </h1>
            <div className="mt-1.5 text-[13px] text-muted-foreground">
              by {item.author_display_name ?? item.author_username ?? item.author_id.slice(-6)}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className={`${chipBase} ${item.type === "thread" ? "border-accent-orange/35 bg-accent-orange/17 text-orange-200" : "border-accent-purple/35 bg-accent-purple/16 text-purple-200"}`}>
                {item.type}
              </span>
              {item.type === "thread" && item.status && (
                <span className={`${chipBase} border-app-border bg-app-input text-muted-foreground`}>{item.status}</span>
              )}
              <span className={`${chipBase} ${item.ai_score === null ? "border-accent-red/35 bg-accent-red/17 text-red-300" : "border-accent-purple/35 bg-accent-purple/16 text-purple-200"}`}>
                {item.ai_score === null ? "AI pending" : `AI ${item.ai_score.toFixed(2)}`}
              </span>
              {item.is_flagged && <span className={`${chipBase} border-accent-red/35 bg-accent-red/17 text-red-300`}>flagged</span>}
              {item.is_deleted && <span className={`${chipBase} border-accent-red/35 bg-accent-red/17 text-red-300`}>deleted</span>}
              <span className="ml-auto text-[11px] text-muted-foreground/60">{relativeTime(item.created_at)}</span>
            </div>

            <div className="mt-2 text-[13px] text-muted-foreground">{aiSummary(item.ai_score)}</div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <button type="button" className={btn("neutral")} disabled={actionLoading !== null} onClick={handleRereport}>
                <Bot size={13} /> Re-report
              </button>
              <button type="button" className={btn(item.is_flagged ? "warn" : "ok")} disabled={actionLoading !== null} onClick={handleFlagToggle}>
                <Flag size={13} /> {item.is_flagged ? "Unflag" : "Flag"}
              </button>
              <button type="button" className={btn("neutral")} disabled={actionLoading !== null} onClick={handleEdit}>
                <Pencil size={13} /> Edit
              </button>
              <button type="button" className={btn("neutral")} disabled={actionLoading !== null} onClick={handleNotify}>
                <Bell size={13} /> Notify
              </button>
              {!item.is_deleted && (
                <button type="button" className={btn("warn")} disabled={actionLoading !== null} onClick={handleDelete}>
                  <Trash2 size={13} /> Delete
                </button>
              )}
              {item.type === "thread" && (
                <>
                  <select
                    className="rounded-[10px] border border-app-border bg-app-input px-2.5 py-1.5 text-xs text-foreground font-[inherit] outline-none disabled:opacity-50"
                    value={item.status ?? "open"}
                    disabled={actionLoading !== null}
                    onChange={e => void handleStatusChange(e.target.value as ThreadStatus)}
                  >
                    <option value="open">open</option>
                    <option value="closed">closed</option>
                    <option value="archived">archived</option>
                  </select>
                  <button type="button" className={btn("neutral")} disabled={actionLoading !== null} onClick={handlePinToggle}>
                    {item.is_pinned ? <PinOff size={13} /> : <Pin size={13} />}
                    {item.is_pinned ? "Unpin" : "Pin"}
                  </button>
                  <button type="button" className={btn("neutral")} onClick={() => router.push(`/threads/${item.id}`)}>
                    <Eye size={13} /> Open Thread
                  </button>
                </>
              )}
              {item.type === "post" && item.thread_id && (
                <button type="button" className={btn("neutral")} onClick={() => router.push(`/threads/${item.thread_id}`)}>
                  <Eye size={13} /> Open Thread
                </button>
              )}
            </div>

            <div className="mt-3.5 rounded-xl border border-app-border bg-app-bg p-3.5">
              <RichText content={item.content ?? ""} variant="full" />
            </div>
          </>
        )}
      </main>

      {toast && (
        <div className={`fixed bottom-4 right-4 z-20 flex items-center gap-2 rounded-[10px] border px-3 py-2.5 text-xs font-semibold shadow-2xl ${toast.type === "ok" ? "border-accent-green/34 bg-accent-green/16 text-green-300" : "border-accent-red/34 bg-accent-red/16 text-red-300"}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
