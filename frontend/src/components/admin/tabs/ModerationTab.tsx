import { Bot, Check, ExternalLink, RefreshCw, Trash2, User } from "lucide-react";

import AdminEmptyState from "@/components/admin/shared/AdminEmptyState";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import ScrollArea from "@/components/shared/ScrollArea";
import { relativeTime } from "@/lib/workspaceUtils";
import type { ModerationAction, ModerationItem } from "@/types/admin";

type ModerationTabProps = {
  items: ModerationItem[];
  total: number;
  flaggedPosts: number;
  flaggedThreads: number;
  selectedIds: string[];
  actionLoading: string | null;
  bulkLoading: boolean;
  refreshing: boolean;
  onToggleItem: (itemKey: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onModerate: (item: ModerationItem, action: ModerationAction) => void;
  onBulkModerate: (action: ModerationAction) => void;
  onCheckItem: (item: ModerationItem) => void;
  onRefresh: () => void;
  onViewThread?: (threadId: string) => void;
  onViewAuthor?: (username: string) => void;
};

function scoreColor(score: number | null): string {
  if (score === null) return "#636f8d";
  if (score >= 0.8) return "#f06b6b";
  if (score >= 0.6) return "#f0834a";
  if (score >= 0.3) return "#e5c07b";
  return "#3dd68c";
}

function scoreBg(score: number | null): string {
  if (score === null) return "rgba(99, 111, 141, 0.12)";
  if (score >= 0.8) return "rgba(240, 107, 107, 0.12)";
  if (score >= 0.6) return "rgba(240, 131, 74, 0.12)";
  if (score >= 0.3) return "rgba(229, 192, 123, 0.12)";
  return "rgba(61, 214, 140, 0.12)";
}

function oneLinePreview(value: string | null): string {
  if (!value) return "";
  return value.replace(/\r?\n+/g, " ").replace(/[*_`>#~[\]()]/g, "").replace(/\s+/g, " ").trim();
}

const modBtn = (variant: "approve" | "reject" | "neutral" | "link") => {
  const base = "inline-flex items-center gap-1 rounded-[7px] border px-3.5 py-1.5 text-xs font-semibold cursor-pointer font-[inherit] transition disabled:opacity-50 disabled:cursor-not-allowed";
  if (variant === "approve") return `${base} border-accent-green/28 bg-accent-green/18 text-green-300 hover:not-disabled:bg-accent-green/25`;
  if (variant === "reject") return `${base} border-accent-red/28 bg-accent-red/18 text-red-300 hover:not-disabled:bg-accent-red/25`;
  if (variant === "neutral") return `${base} border-accent-purple/28 bg-accent-purple/16 text-purple-200 hover:not-disabled:bg-accent-purple/24`;
  return `${base} border-app-border bg-app-input px-2.5 py-1.5 text-muted-foreground hover:not-disabled:text-foreground`;
};

export default function ModerationTab({
  items,
  total,
  flaggedPosts,
  flaggedThreads,
  selectedIds,
  actionLoading,
  bulkLoading,
  refreshing,
  onToggleItem,
  onToggleAll,
  onModerate,
  onBulkModerate,
  onCheckItem,
  onRefresh,
  onViewThread,
  onViewAuthor,
}: ModerationTabProps) {
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5">
      {/* Toolbar */}
      <div className="shrink-0 pb-2">
        <AdminSectionHeader
          title="Moderation Queue"
          countLabel={`${total} queued • ${flaggedThreads} threads • ${flaggedPosts} posts`}
        />
        <div className="mb-3 flex justify-end">
          <button type="button" className={modBtn("neutral")} disabled={refreshing} onClick={onRefresh} title="Reload moderation queue from server">
            <RefreshCw size={13} /> {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {items.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2.5 rounded-xl border border-app-border bg-app-panel px-3 py-2.5">
            <label className="mr-auto inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={e => onToggleAll(e.target.checked)}
                className="accent-accent-orange"
                title={allSelected ? "Unselect all" : "Select all"}
              />
              <span>{selectedIds.length} selected of {items.length}</span>
            </label>
            <button type="button" className={modBtn("approve")} disabled={selectedIds.length === 0 || bulkLoading} onClick={() => onBulkModerate("approve")} title="Approve selected">
              <Check size={13} /> Approve Selected
            </button>
            <button type="button" className={modBtn("reject")} disabled={selectedIds.length === 0 || bulkLoading} onClick={() => onBulkModerate("reject")} title="Remove selected">
              <Trash2 size={13} /> Remove Selected
            </button>
          </div>
        )}
      </div>

      <ScrollArea
        className="min-h-[120px]"
        size="lg"
        tone="strong"
        style={{ flex: 1, minHeight: 0, overflowY: "scroll", paddingRight: 6 }}
      >
        {items.length === 0 ? (
          <AdminEmptyState icon={Check} text="All clear. No flagged content pending review." color="#3dd68c" />
        ) : (
          <div className="flex flex-col gap-3">
            {items.map(item => {
              const author = item.author_display_name ?? item.author_username ?? item.author_id.slice(-6);
              const title =
                item.type === "thread"
                  ? (item.title ?? "(untitled thread)")
                  : `Post in thread ${item.thread_id?.slice(-6) ?? "unknown"}`;
              const itemKey = `${item.type}:${item.id}`;
              const isActioning = actionLoading?.endsWith(`:${itemKey}`) ?? false;
              const checking = actionLoading === `check:${itemKey}`;
              const checked = selectedIds.includes(itemKey);
              const threadTarget = item.type === "thread" ? item.id : item.thread_id;
              return (
                <div
                  key={itemKey}
                  className="flex flex-col gap-3 rounded-[14px] border border-app-border bg-app-panel px-4 py-4 transition hover:border-border-hover hover:shadow-[0_4px_12px_rgba(240,131,74,0.08)]"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-1.5">
                      <input type="checkbox" checked={checked} onChange={e => onToggleItem(itemKey, e.target.checked)} className="accent-accent-orange" />
                      <span />
                    </label>
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-1.5 text-[15px] font-bold leading-snug text-foreground">{title}</h3>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${item.type === "thread" ? "border-accent-orange/35 bg-accent-orange/17 text-orange-200" : "border-accent-purple/35 bg-accent-purple/16 text-purple-200"}`}>
                          {item.type}
                        </span>
                        <span className="text-[13px] font-bold text-foreground">{author}</span>
                        <span className="text-xs text-muted-foreground">{relativeTime(item.created_at)}</span>
                      </div>
                    </div>
                    <div
                      className="shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"
                      style={{ color: scoreColor(item.ai_score), backgroundColor: scoreBg(item.ai_score) }}
                      title={item.ai_score !== null ? `AI risk score ${(item.ai_score * 100).toFixed(0)}%` : "AI risk score not available"}
                    >
                      {item.ai_score !== null ? `${(item.ai_score * 100).toFixed(0)}%` : "n/a"}
                    </div>
                  </div>

                  {/* Content preview */}
                  <p className="m-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border border-app-border bg-app-bg px-3.5 py-3 text-sm leading-snug text-muted-foreground">
                    {oneLinePreview(item.content)}
                  </p>

                  {/* Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-[11px] text-muted-foreground/60">ID: {item.id.slice(-8)}</span>
                      {item.is_deleted && <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-accent-red/15 text-red-300">Deleted</span>}
                      {item.is_flagged && <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-accent-orange/15 text-orange-300">Flagged</span>}
                    </div>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {onViewAuthor && item.author_username && (
                        <button type="button" className={modBtn("link")} onClick={() => onViewAuthor(item.author_username!)} title="Open author profile">
                          <User size={12} />
                        </button>
                      )}
                      {onViewThread && threadTarget && (
                        <button type="button" className={modBtn("link")} onClick={() => onViewThread(threadTarget)} title="Open thread context">
                          <ExternalLink size={12} />
                        </button>
                      )}
                      <button type="button" className={modBtn("neutral")} disabled={isActioning} onClick={() => onCheckItem(item)} title="Re-run AI check">
                        <Bot size={13} /> {checking ? "Checking..." : "Check"}
                      </button>
                      <button type="button" className={modBtn("approve")} disabled={isActioning} onClick={() => onModerate(item, "approve")} title="Approve item">
                        <Check size={13} /> Approve
                      </button>
                      <button type="button" className={modBtn("reject")} disabled={isActioning} onClick={() => onModerate(item, "reject")} title="Remove item">
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
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
