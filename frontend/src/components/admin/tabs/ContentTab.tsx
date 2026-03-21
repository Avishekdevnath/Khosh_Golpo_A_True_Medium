import { Bell, Bot, Eye, FileText, Flag, Pencil, Pin, PinOff, Search, Trash2, X } from "lucide-react";

import AdminEmptyState from "@/components/admin/shared/AdminEmptyState";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import ScrollArea from "@/components/shared/ScrollArea";
import { relativeTime } from "@/lib/workspaceUtils";
import type { AdminContentItem, ThreadStatus } from "@/types/admin";

type ContentTabProps = {
  items: AdminContentItem[];
  total: number;
  missingAiReports: number;
  loading: boolean;
  title?: string;
  countLabel?: string;
  lockDeletedFilter?: boolean;
  hideBulkAiAction?: boolean;
  search: string;
  contentType: "all" | "thread" | "post";
  statusFilter: "" | ThreadStatus;
  deletedFilter: "" | "true" | "false";
  flaggedFilter: "" | "true" | "false";
  actionLoading: string | null;
  onSearchChange: (value: string) => void;
  onTypeChange: (value: "all" | "thread" | "post") => void;
  onStatusChange: (value: "" | ThreadStatus) => void;
  onDeletedChange: (value: "" | "true" | "false") => void;
  onFlaggedChange: (value: "" | "true" | "false") => void;
  onDeleteItem: (item: AdminContentItem) => void;
  onRereportMissing: () => void;
  onOpenItem: (item: AdminContentItem) => void;
  onRereportItem: (item: AdminContentItem) => void;
  onFlagToggle: (item: AdminContentItem) => void;
  onEditItem: (item: AdminContentItem) => void;
  onNotifyItem: (item: AdminContentItem) => void;
  onThreadStatusChange: (item: AdminContentItem, status: ThreadStatus) => void;
  onThreadPinToggle: (item: AdminContentItem) => void;
  onViewThread: (threadId: string) => void;
};

function aiSummary(score: number | null): { short: string; long: string } {
  if (score === null) return { short: "AI pending", long: "AI report is not generated yet." };
  if (score >= 0.8) return { short: `High risk ${score.toFixed(2)}`, long: `High risk content (score ${score.toFixed(2)}). Usually auto-flag range.` };
  if (score >= 0.6) return { short: `Warning ${score.toFixed(2)}`, long: `Warning range (score ${score.toFixed(2)}). Should be reviewed by admin.` };
  if (score >= 0.3) return { short: `Medium ${score.toFixed(2)}`, long: `Medium risk (score ${score.toFixed(2)}). Check context before action.` };
  return { short: `Safe ${score.toFixed(2)}`, long: `Likely safe content (score ${score.toFixed(2)}).` };
}

function oneLinePreview(value: string | null): string {
  if (!value) return "";
  return value.replace(/\r?\n+/g, " ").replace(/[*_`>#~[\]()]/g, "").replace(/\s+/g, " ").trim();
}

const selectCls = "rounded-[10px] border border-app-border bg-app-input px-2.5 py-2 text-xs text-foreground font-[inherit] outline-none disabled:opacity-50";
const tinyBtn = (variant: "neutral" | "warn" | "ok") => {
  const base = "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer font-[inherit] disabled:opacity-50 disabled:cursor-not-allowed";
  if (variant === "warn") return `${base} border-accent-red/30 bg-accent-red/15 text-red-300`;
  if (variant === "ok") return `${base} border-accent-green/30 bg-accent-green/15 text-green-300`;
  return `${base} border-app-border bg-app-input text-foreground/80`;
};

export default function ContentTab({
  items,
  total,
  missingAiReports,
  loading,
  title,
  countLabel,
  lockDeletedFilter = false,
  hideBulkAiAction = false,
  search,
  contentType,
  statusFilter,
  deletedFilter,
  flaggedFilter,
  actionLoading,
  onSearchChange,
  onTypeChange,
  onStatusChange,
  onDeletedChange,
  onFlaggedChange,
  onDeleteItem,
  onRereportMissing,
  onOpenItem,
  onRereportItem,
  onFlagToggle,
  onEditItem,
  onNotifyItem,
  onThreadStatusChange,
  onThreadPinToggle,
  onViewThread,
}: ContentTabProps) {
  const rereportMissingLoading = actionLoading === "rereport:missing";
  const headerTitle = title ?? "Content Control";
  const headerCountLabel = countLabel ?? `${total} items`;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5">
      {/* Toolbar */}
      <div className="shrink-0 pb-2">
        <AdminSectionHeader title={headerTitle} countLabel={headerCountLabel} />
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative min-w-[180px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search titles, post content..."
              className="w-full rounded-[10px] border border-app-border bg-app-input py-2.5 pl-9 pr-8 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-border-hover"
            />
            {search && (
              <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" onClick={() => onSearchChange("")}>
                <X size={13} />
              </button>
            )}
          </div>

          <select className={selectCls} value={contentType} onChange={e => onTypeChange(e.target.value as "all" | "thread" | "post")}>
            <option value="all">All</option>
            <option value="thread">Threads</option>
            <option value="post">Posts</option>
          </select>
          <select
            className={selectCls}
            value={deletedFilter}
            onChange={e => onDeletedChange(e.target.value as "" | "true" | "false")}
            disabled={lockDeletedFilter}
            title={lockDeletedFilter ? "Removed collection always shows deleted content only" : undefined}
          >
            <option value="">Any state</option>
            <option value="false">Active</option>
            <option value="true">Deleted</option>
          </select>
          <select
            className={selectCls}
            value={statusFilter}
            onChange={e => onStatusChange(e.target.value as "" | ThreadStatus)}
            disabled={contentType === "post"}
          >
            <option value="">Any status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
          </select>
          <select className={selectCls} value={flaggedFilter} onChange={e => onFlaggedChange(e.target.value as "" | "true" | "false")}>
            <option value="">Any flag</option>
            <option value="true">Flagged</option>
            <option value="false">Not flagged</option>
          </select>
          {!hideBulkAiAction && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-accent-purple/45 bg-accent-purple/18 px-3 py-2 text-xs font-semibold text-purple-200 font-[inherit] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={missingAiReports <= 0 || rereportMissingLoading}
              onClick={onRereportMissing}
              title={missingAiReports <= 0 ? "All listed content already has AI reports" : "Run AI re-report for items with missing reports"}
            >
              <Bot size={13} />
              {rereportMissingLoading ? "Running..." : `AI Re-report Missing (${missingAiReports})`}
            </button>
          )}
        </div>
      </div>

      <ScrollArea
        className="min-h-[120px]"
        size="lg"
        tone="strong"
        style={{ flex: 1, minHeight: 0, overflowY: "scroll", paddingRight: 6 }}
      >
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading content...</div>
        ) : items.length === 0 ? (
          <AdminEmptyState icon={FileText} text="No content found for current filters." />
        ) : (
          <div className="flex flex-col gap-2">
            {items.map(item => {
              const deleting = actionLoading === `delete:${item.type}:${item.id}`;
              const rereporting = actionLoading === `rereport:${item.type}:${item.id}`;
              const flagging = actionLoading === `flag:${item.type}:${item.id}`;
              const editing = actionLoading === `edit:${item.type}:${item.id}`;
              const notifying = actionLoading === `notify:${item.type}:${item.id}`;
              const statusLoading = actionLoading === `status:${item.id}`;
              const pinLoading = actionLoading === `pin:${item.id}`;
              const flagged = Boolean(item.is_flagged);
              const ai = aiSummary(item.ai_score);
              const itemTitle = item.type === "thread" ? item.title ?? "(untitled thread)" : `Post in thread ${item.thread_id?.slice(-6)}`;
              const author = item.author_display_name ?? item.author_username ?? item.author_id.slice(-6);

              return (
                <div key={`${item.type}:${item.id}`} className="rounded-[14px] border border-app-border bg-app-panel px-4 py-3.5">
                  <div className="text-[15px] font-bold text-foreground">{itemTitle}</div>
                  <div className="mt-1.5 text-xs text-muted-foreground">by {author}</div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${item.type === "thread" ? "border-accent-orange/35 bg-accent-orange/17 text-orange-200" : "border-accent-purple/35 bg-accent-purple/16 text-purple-200"}`}>
                      {item.type}
                    </span>
                    {item.type === "thread" && item.status && (
                      <span className="rounded-full border border-app-border bg-app-input px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        {item.status}
                      </span>
                    )}
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${item.ai_score === null ? "border-accent-red/35 bg-accent-red/17 text-red-300" : "border-accent-purple/35 bg-accent-purple/16 text-purple-200"}`}>
                      {ai.short}
                    </span>
                    {flagged && <span className="rounded-full border border-accent-red/35 bg-accent-red/17 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-300">flagged</span>}
                    {item.is_deleted && <span className="rounded-full border border-accent-red/35 bg-accent-red/17 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-300">deleted</span>}
                    <span className="ml-auto text-[11px] text-muted-foreground/60">{relativeTime(item.created_at)}</span>
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">{ai.long}</div>

                  <p className="m-0 mt-2.5 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] leading-snug text-muted-foreground">
                    {oneLinePreview(item.content)}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <button type="button" className={tinyBtn("neutral")} onClick={() => onOpenItem(item)}>
                      <Eye size={12} /> Moderate
                    </button>
                    {item.type === "thread" && (
                      <>
                        <select
                          className="min-h-[32px] rounded-lg border border-app-border bg-app-input px-2 text-[11px] font-[inherit] text-foreground outline-none disabled:opacity-50"
                          value={item.status ?? "open"}
                          disabled={statusLoading}
                          onChange={e => onThreadStatusChange(item, e.target.value as ThreadStatus)}
                        >
                          <option value="open">open</option>
                          <option value="closed">closed</option>
                          <option value="archived">archived</option>
                        </select>
                        <button type="button" className={tinyBtn("neutral")} disabled={pinLoading} onClick={() => onThreadPinToggle(item)}>
                          {item.is_pinned ? <PinOff size={12} /> : <Pin size={12} />}
                          {item.is_pinned ? "Unpin" : "Pin"}
                        </button>
                        <button type="button" className={tinyBtn("neutral")} onClick={() => onViewThread(item.id)}>
                          <Eye size={12} /> View
                        </button>
                      </>
                    )}
                    {item.type === "post" && item.thread_id && (
                      <button type="button" className={tinyBtn("neutral")} onClick={() => onViewThread(item.thread_id!)}>
                        <Eye size={12} /> Thread
                      </button>
                    )}
                    <button type="button" className={tinyBtn("neutral")} disabled={rereporting} onClick={() => onRereportItem(item)}>
                      <Bot size={12} /> {rereporting ? "..." : "Re-report"}
                    </button>
                    <button type="button" className={tinyBtn(flagged ? "warn" : "ok")} disabled={flagging} onClick={() => onFlagToggle(item)}>
                      <Flag size={12} /> {flagged ? "Unflag" : "Flag"}
                    </button>
                    <button type="button" className={tinyBtn("neutral")} disabled={editing} onClick={() => onEditItem(item)}>
                      <Pencil size={12} /> Edit
                    </button>
                    <button type="button" className={tinyBtn("neutral")} disabled={notifying} onClick={() => onNotifyItem(item)}>
                      <Bell size={12} /> Notify
                    </button>
                    {!item.is_deleted && (
                      <button type="button" className={tinyBtn("warn")} disabled={deleting} onClick={() => onDeleteItem(item)}>
                        <Trash2 size={12} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
