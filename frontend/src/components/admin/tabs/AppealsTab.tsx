import { Check, ExternalLink, Gavel, ShieldCheck, ShieldX, User } from "lucide-react";

import AdminEmptyState from "@/components/admin/shared/AdminEmptyState";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import ScrollArea from "@/components/shared/ScrollArea";
import { relativeTime } from "@/lib/workspaceUtils";
import type { AdminAppealItem, AppealStatus } from "@/types/admin";

type AppealsTabProps = {
  appeals: AdminAppealItem[];
  total: number;
  pendingCount: number;
  loading: boolean;
  statusFilter: "" | AppealStatus;
  actionLoading: string | null;
  onStatusChange: (value: "" | AppealStatus) => void;
  onResolve: (item: AdminAppealItem, action: "approve" | "reject") => void;
  onViewContent: (item: AdminAppealItem) => void;
  onViewProfile: (userId: string) => void;
  onViewThread: (threadId: string) => void;
};

function absoluteTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

const statusChipCls: Record<string, string> = {
  pending: "border-accent-orange/35 bg-accent-orange/16 text-orange-200",
  approved: "border-accent-green/35 bg-accent-green/16 text-green-300",
  rejected: "border-accent-red/35 bg-accent-red/16 text-red-300",
};

const tinyBtn = (variant: "neutral" | "ok" | "warn") => {
  const base = "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] cursor-pointer font-[inherit] disabled:opacity-50 disabled:cursor-not-allowed";
  if (variant === "ok") return `${base} border-accent-green/35 bg-accent-green/16 text-green-300`;
  if (variant === "warn") return `${base} border-accent-red/35 bg-accent-red/16 text-red-300`;
  return `${base} border-accent-purple/28 bg-accent-purple/16 text-purple-200`;
};

export default function AppealsTab({
  appeals,
  total,
  pendingCount,
  loading,
  statusFilter,
  actionLoading,
  onStatusChange,
  onResolve,
  onViewContent,
  onViewProfile,
  onViewThread,
}: AppealsTabProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5">
      {/* Toolbar */}
      <div className="shrink-0 pb-2">
        <AdminSectionHeader title="Moderation Appeals" countLabel={`${total} appeals • ${pendingCount} pending`} />
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-[10px] border border-app-border bg-app-input px-2.5 py-2 text-xs text-foreground font-[inherit] outline-none"
            value={statusFilter}
            onChange={e => onStatusChange(e.target.value as "" | AppealStatus)}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <ScrollArea
        className="min-h-[120px]"
        size="lg"
        tone="strong"
        style={{ flex: 1, minHeight: 0, overflowY: "scroll", paddingRight: 6 }}
      >
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading appeals...</div>
        ) : appeals.length === 0 ? (
          <AdminEmptyState icon={Check} text="No appeals found for this filter." color="#8ca6ff" />
        ) : (
          <div className="flex flex-col gap-3">
            {appeals.map(item => {
              const resolveKey = `resolve:${item.id}`;
              const pendingAction = actionLoading === resolveKey;
              const isPending = item.status === "pending";
              const author = item.appellant_display_name ?? item.appellant_username ?? item.appellant_id.slice(-6);
              const threadTarget = item.thread_id ?? (item.content_type === "thread" ? item.content_id : null);
              const targetLabel = `${item.content_type} ${item.content_id.slice(-8)}`;

              return (
                <div key={item.id} className="flex flex-col gap-2.5 rounded-[14px] border border-app-border bg-app-panel px-4 py-3.5">
                  {/* Head */}
                  <div>
                    <h3 className="m-0 mb-1.5 break-words text-sm text-foreground">{targetLabel}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusChipCls[item.status] ?? ""}`}>
                        {item.status.toUpperCase()}
                      </span>
                      <span>by {author}</span>
                      <span title={absoluteTime(item.created_at)}>{relativeTime(item.created_at)}</span>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="flex flex-col gap-1">
                    <p className="m-0 text-[10px] uppercase tracking-wider text-muted-foreground">Appeal reason</p>
                    <p className="m-0 break-words whitespace-pre-wrap text-[13px] leading-snug text-foreground">{item.reason}</p>
                  </div>

                  {/* Original notice */}
                  {item.notification_message && (
                    <div className="flex flex-col gap-1">
                      <p className="m-0 text-[10px] uppercase tracking-wider text-muted-foreground">Original moderation notice</p>
                      <p className="m-0 break-words whitespace-pre-wrap text-[13px] leading-snug text-muted-foreground">{item.notification_message}</p>
                    </div>
                  )}

                  {/* Resolution */}
                  {!isPending && (
                    <div className="flex flex-col gap-1">
                      <p className="m-0 text-[10px] uppercase tracking-wider text-muted-foreground">Resolution</p>
                      <p className="m-0 text-[13px] leading-snug text-foreground">
                        {item.status === "approved" ? "Approved" : "Rejected"}
                        {item.resolved_at ? ` • ${relativeTime(item.resolved_at)}` : ""}
                        {item.resolved_by_display_name || item.resolved_by_username ? ` by ${item.resolved_by_display_name ?? item.resolved_by_username}` : ""}
                      </p>
                      {item.admin_note && <p className="m-0 text-[13px] leading-snug text-muted-foreground">{item.admin_note}</p>}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-0.5 flex flex-wrap gap-1.5">
                    <button type="button" className={tinyBtn("neutral")} onClick={() => onViewContent(item)}>
                      <Gavel size={12} /> Open content
                    </button>
                    <button type="button" className={tinyBtn("neutral")} onClick={() => onViewProfile(item.appellant_id)}>
                      <User size={12} /> User
                    </button>
                    {threadTarget && (
                      <button type="button" className={tinyBtn("neutral")} onClick={() => onViewThread(threadTarget)}>
                        <ExternalLink size={12} /> Thread
                      </button>
                    )}
                    {isPending && (
                      <>
                        <button type="button" className={tinyBtn("ok")} disabled={pendingAction} onClick={() => onResolve(item, "approve")}>
                          <ShieldCheck size={12} /> {pendingAction ? "Processing..." : "Approve"}
                        </button>
                        <button type="button" className={tinyBtn("warn")} disabled={pendingAction} onClick={() => onResolve(item, "reject")}>
                          <ShieldX size={12} /> {pendingAction ? "Processing..." : "Reject"}
                        </button>
                      </>
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
