import { AlertTriangle, Flag, MessageSquare, Trash2, Users } from "lucide-react";

import AdminStatCard from "@/components/admin/shared/AdminStatCard";
import InterestSuggestionBatchPanel from "@/components/admin/tabs/InterestSuggestionBatchPanel";
import type { FeedAIHealth, FeedConfig } from "@/types/feed";
import type { AdminStats } from "@/types/admin";

type OverviewTabProps = {
  stats: AdminStats;
  onOpenModeration: () => void;
  feedConfig?: FeedConfig | null;
  feedAIHealth?: FeedAIHealth | null;
  feedReadError?: string | null;
};

export default function OverviewTab({
  stats,
  onOpenModeration,
  feedConfig,
  feedAIHealth,
  feedReadError,
}: OverviewTabProps) {
  const generatedAt = new Date(stats.generated_at).toLocaleString();
  const activeRate = stats.total_users > 0 ? Math.round((stats.active_users / stats.total_users) * 100) : 0;
  const totalContent = stats.total_posts + stats.total_threads;
  const flaggedRate = totalContent > 0 ? Math.round((stats.flagged_posts / totalContent) * 100) : 0;
  const feedResetAt = feedAIHealth?.ai_last_reset ? new Date(feedAIHealth.ai_last_reset).toLocaleDateString() : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Stat grid */}
      <div className="grid grid-cols-3 gap-3.5 max-[1100px]:grid-cols-2 max-[600px]:grid-cols-1">
        <AdminStatCard icon={Users} label="Total Users" value={stats.total_users} color="#7c73f0" />
        <AdminStatCard icon={Users} label="Active Users" value={stats.active_users} color="#3dd68c" />
        <AdminStatCard icon={MessageSquare} label="Threads" value={stats.total_threads} color="#f0834a" />
        <AdminStatCard icon={MessageSquare} label="Total Posts" value={stats.total_posts} color="#6b8afd" />
        <AdminStatCard icon={Flag} label="Flagged Content" value={stats.flagged_posts} color="#f06b6b" />
        <AdminStatCard icon={Trash2} label="Deleted Posts" value={stats.deleted_posts} color="#636f8d" />
      </div>

      {stats.flagged_posts > 0 && (
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-accent-red/35 bg-accent-red/10 px-4 py-3.5 text-sm font-medium text-red-300 transition hover:border-accent-red/50 hover:bg-accent-red/15"
          onClick={onOpenModeration}
        >
          <AlertTriangle size={15} />
          <span>{stats.flagged_posts} flagged content item(s) need review</span>
          <span className="ml-auto text-[13px] font-semibold">View</span>
        </button>
      )}

      <p className="text-xs text-muted-foreground">Last updated: {generatedAt}</p>

      {/* Ops grid */}
      <div className="grid grid-cols-3 gap-3 max-[1100px]:grid-cols-2 max-[600px]:grid-cols-1">
        <div className="rounded-[14px] border border-app-border bg-app-panel px-4 py-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">User Activity Rate</div>
          <div className="mt-1.5 font-serif text-[27px] leading-none text-foreground">{activeRate}%</div>
          <div className="mt-2 text-xs text-muted-foreground">{stats.active_users} of {stats.total_users} accounts active</div>
        </div>
        <div className="rounded-[14px] border border-app-border bg-app-panel px-4 py-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Flagged Content Ratio</div>
          <div className="mt-1.5 font-serif text-[27px] leading-none text-foreground">{flaggedRate}%</div>
          <div className="mt-2 text-xs text-muted-foreground">{stats.flagged_posts} flagged out of {totalContent} total items</div>
        </div>
        <button
          type="button"
          className="rounded-[14px] border border-app-border bg-app-panel px-4 py-3.5 text-left transition hover:border-accent-orange/40 hover:bg-accent-orange/5"
          onClick={onOpenModeration}
        >
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Moderation Actions</div>
          <div className="mt-1.5 font-serif text-[27px] leading-none text-foreground">Open Queue</div>
          <div className="mt-2 text-xs text-muted-foreground">Review flagged posts and resolve risk quickly.</div>
        </button>
      </div>

      {/* Feed Config panel */}
      <section className="rounded-[14px] border border-app-border bg-app-panel px-4 py-3.5">
        <div className="mb-3 flex items-center justify-between gap-2.5 max-[600px]:flex-col max-[600px]:items-start">
          <h3 className="m-0 text-sm font-bold text-foreground">Feed Config (Read Only)</h3>
          {feedReadError && <span className="text-[11px] text-red-300">{feedReadError}</span>}
        </div>
        {!feedConfig || !feedAIHealth ? (
          <div className="py-1 text-xs text-muted-foreground">Feed config data is not available yet.</div>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-4 gap-2.5 max-[1100px]:grid-cols-2 max-[600px]:grid-cols-1">
              {[
                { label: "AI Enabled", value: feedConfig.ai_enabled ? "Yes" : "No" },
                { label: "Timeout", value: `${feedConfig.ai_timeout_ms}ms` },
                { label: "Budget / Spend", value: `$${feedAIHealth.ai_daily_budget_usd.toFixed(2)} / $${feedAIHealth.ai_spend_today_usd.toFixed(2)}` },
                { label: "Last Reset", value: feedResetAt ?? "N/A" },
              ].map(({ label, value }) => (
                <div key={label} className="grid gap-1.5 rounded-[10px] border border-app-border bg-app-input p-2.5">
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                  <strong className="text-[13px] font-semibold text-foreground">{value}</strong>
                </div>
              ))}
            </div>

            <div>
              <h4 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Weights</h4>
              <div className="grid grid-cols-4 gap-2 max-[1100px]:grid-cols-2 max-[600px]:grid-cols-1">
                {Object.entries(feedConfig.weights).map(([key, val]) => (
                  <div key={key} className="grid gap-1 rounded-[9px] border border-app-border bg-app-bg p-2">
                    <span className="text-[10px] lowercase text-muted-foreground">{key}</span>
                    <strong className="text-xs font-semibold text-foreground">{(val as number).toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <h4 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">AI Health Counters</h4>
              <div className="grid grid-cols-4 gap-2 max-[1100px]:grid-cols-2 max-[600px]:grid-cols-1">
                {[
                  { label: "Requests", value: feedAIHealth.requests_count },
                  { label: "Timeouts", value: feedAIHealth.timeout_count },
                  { label: "Errors", value: feedAIHealth.error_count },
                  { label: "Fallbacks", value: feedAIHealth.fallback_count },
                ].map(({ label, value }) => (
                  <div key={label} className="grid gap-1 rounded-[9px] border border-app-border bg-app-bg p-2">
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                    <strong className="text-xs font-semibold text-foreground">{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      <InterestSuggestionBatchPanel />
    </div>
  );
}
