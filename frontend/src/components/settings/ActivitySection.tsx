"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { formatActivityItem } from "@/lib/activityFormatting";
import { relativeTime } from "@/lib/workspaceUtils";
import type { ActivityCategory, ActivityItem } from "./useSettingsPage";

// ── Severity badge ─────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: ActivityItem["severity"] }) {
  const styles: Record<typeof severity, string> = {
    info: "text-sky-700 dark:text-[#7cc2f0] bg-[rgba(124,194,240,0.14)]",
    warning: "text-amber-700 dark:text-[#f0c34a] bg-[rgba(240,195,74,0.14)]",
    critical: "text-red-700 dark:text-[#f06b6b] bg-[rgba(240,107,107,0.14)]",
  };
  return (
    <span
      className={`text-[9px] font-bold rounded uppercase px-1.5 py-0.5 tracking-wider ${styles[severity]}`}
    >
      {severity}
    </span>
  );
}

// ── Result badge ──────────────────────────────────────────────────────────────

function ResultBadge({ result }: { result: ActivityItem["result"] }) {
  const styles: Record<typeof result, string> = {
    success: "text-green-700 dark:text-[#8ce6ba] bg-[rgba(61,214,140,0.14)]",
    failed: "text-red-700 dark:text-[#f6b0b0] bg-[rgba(240,107,107,0.14)]",
  };
  return (
    <span
      className={`text-[10px] font-bold rounded-full px-2 py-0.5 uppercase tracking-wide ${styles[result]}`}
    >
      {result}
    </span>
  );
}

// ── Activity row card ─────────────────────────────────────────────────────────

function ActivityRow({
  item,
  actionPendingId,
  onQuickAction,
}: {
  item: ActivityItem;
  actionPendingId: string | null;
  onQuickAction: (item: ActivityItem) => void;
}) {
  const formatted = formatActivityItem(item);
  const isPending = actionPendingId === item.id;

  return (
    <article className="rounded-[10px] border border-app-border bg-card px-3 py-2.5 flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <SeverityBadge severity={item.severity} />
        <strong className="text-xs text-foreground">
          {formatted.title}
        </strong>
        <ResultBadge result={item.result} />
        <span className="ml-auto text-[11px] text-text-secondary" title={item.created_at}>
          {relativeTime(item.created_at)}
        </span>
      </div>
      {(formatted.summary || formatted.quickAction) && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {formatted.summary ? (
            <p className="text-[11px] text-text-secondary m-0">
              {formatted.summary}
            </p>
          ) : (
            <span className="text-[11px] text-text-secondary">{item.target_type}</span>
          )}
          {formatted.quickAction && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => onQuickAction(item)}
              className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary transition-colors duration-150 hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Working..." : formatted.quickAction.label}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

// ── Category filter chips ─────────────────────────────────────────────────────

const CATEGORIES: ActivityCategory[] = ["all", "security", "content", "engagement", "account", "system"];

interface FilterRowProps {
  active: ActivityCategory;
  onChange: (c: ActivityCategory) => void;
}

function FilterRow({ active, onChange }: FilterRowProps) {
  return (
    <div className="flex flex-wrap gap-1.5 my-1 mb-3">
      {CATEGORIES.map(cat => (
        <button
          key={cat}
          type="button"
          onClick={() => onChange(cat)}
          className={[
            "rounded-full border px-3 py-1 text-[11px] uppercase tracking-wider font-[inherit] transition-colors duration-150",
            cat === active
              ? "border-primary/25 bg-primary/10 text-primary"
              : "border-app-border bg-card text-text-secondary hover:text-foreground hover:border-primary/25",
          ].join(" ")}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

// ── Skeleton list (loading state) ─────────────────────────────────────────────

function SkeletonList() {
  return (
    <div className="flex flex-col gap-2 mt-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ActivitySectionProps {
  items: ActivityItem[];
  category: ActivityCategory;
  page: number;
  limit: number;
  total: number;
  loading: boolean;
  error: string | null;
  actionPendingId: string | null;
  onCategoryChange: (c: ActivityCategory) => void;
  onPageChange: (p: number) => void;
  onQuickAction: (item: ActivityItem) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ActivitySection({
  items, category, page, limit, total,
  loading, error,
  actionPendingId,
  onCategoryChange, onPageChange, onQuickAction,
}: ActivitySectionProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="w-full">
      <h2 className="font-serif text-[18px] font-bold mb-1">Account Activity</h2>
      <p className="text-sm text-text-secondary mb-4 leading-relaxed">
        Security, account, content, engagement, and system events related to your profile.
      </p>

      <FilterRow
        active={category}
        onChange={cat => {
          onCategoryChange(cat);
          onPageChange(1);
        }}
      />

      {error && (
        <div className="mt-2.5 rounded-lg border border-[rgba(240,107,107,0.25)] bg-[rgba(240,107,107,0.08)] px-2.5 py-2 text-xs text-red-700 dark:text-[#f6b0b0]">
          {error}
        </div>
      )}

      {loading ? (
        <SkeletonList />
      ) : items.length === 0 ? (
        <div className="rounded-[10px] border border-app-border bg-card px-4 py-4 text-center text-xs text-text-secondary">
          No activity found for this filter.
        </div>
      ) : (
        <div className="flex flex-col gap-2 mt-2">
          {items.map(item => (
            <ActivityRow
              key={item.id}
              item={item}
              actionPendingId={actionPendingId}
              onQuickAction={onQuickAction}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="mt-3.5 flex items-center justify-between gap-2.5 text-[11px] text-text-secondary">
        <span>
          Page {page}
          {total > 0 ? ` of ${totalPages}` : ""}
        </span>
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-app-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary font-[inherit] transition-colors duration-150 hover:bg-card-hover hover:text-foreground disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={13} /> Prev
          </button>
          <button
            type="button"
            disabled={loading || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-app-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary font-[inherit] transition-colors duration-150 hover:bg-card-hover hover:text-foreground disabled:opacity-45 disabled:cursor-not-allowed"
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
