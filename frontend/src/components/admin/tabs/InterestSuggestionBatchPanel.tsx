"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { apiGet } from "@/lib/api";
import {
  createAdminFeedInterestSuggestionJob,
  getAdminFeedInterestSuggestionJob,
  listAdminFeedInterestSuggestionJobs,
} from "@/lib/adminFeedApi";
import type {
  FeedInterestSuggestionJobResponse,
  FeedInterestSuggestionJobSummary,
  FeedInterestSuggestionReplaceMode,
  UserSearchItem,
} from "@/types/feed";

type SelectedUser = {
  id: string;
  username: string;
  display_name: string;
};

const statusChip = (status: string) => {
  const base = "rounded-full border px-1.5 py-0.5 text-[11px] uppercase tracking-wide";
  if (status === "success" || status === "completed") return `${base} border-accent-green/40 text-green-300`;
  if (status === "failed") return `${base} border-accent-red/38 text-red-300`;
  if (status === "fallback" || status === "completed_with_errors" || status === "budget_exceeded") return `${base} border-yellow-400/38 text-yellow-300`;
  return `${base} border-app-border text-muted-foreground`;
};

const inputCls = "w-full rounded-lg border border-app-border bg-app-input px-2.5 py-2 text-[13px] text-foreground outline-none font-[inherit]";

export default function InterestSuggestionBatchPanel() {
  const [search, setSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<UserSearchItem[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);

  const [replaceMode, setReplaceMode] = useState<FeedInterestSuggestionReplaceMode>("merge");
  const [maxTagsPerUser, setMaxTagsPerUser] = useState(8);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeJob, setActiveJob] = useState<FeedInterestSuggestionJobResponse | null>(null);
  const [recentJobs, setRecentJobs] = useState<FeedInterestSuggestionJobSummary[]>([]);

  const selectedIds = useMemo(() => new Set(selectedUsers.map(item => item.id)), [selectedUsers]);

  useEffect(() => {
    let cancelled = false;
    void listAdminFeedInterestSuggestionJobs({ limit: 8 })
      .then(res => { if (!cancelled) setRecentJobs(res.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); setSearchLoading(false); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await apiGet<{ users: UserSearchItem[] }>(`users/search?q=${encodeURIComponent(search.trim())}&limit=8`);
        if (!cancelled) setSearchResults(res.users);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search]);

  useEffect(() => {
    if (!activeJob) return;
    if (activeJob.status !== "queued" && activeJob.status !== "running") return;
    let cancelled = false;
    const interval = setInterval(() => {
      void getAdminFeedInterestSuggestionJob(activeJob.job_id)
        .then(job => { if (!cancelled) setActiveJob(job); })
        .catch(() => {});
    }, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [activeJob]);

  function addSelectedUser(user: UserSearchItem) {
    if (selectedIds.has(user.id)) return;
    setSelectedUsers(prev => [...prev, { id: user.id, username: user.username, display_name: user.display_name }]);
    setSearch(""); setSearchResults([]);
  }

  function removeSelectedUser(userId: string) {
    setSelectedUsers(prev => prev.filter(user => user.id !== userId));
  }

  async function triggerBatch() {
    if (selectedUsers.length === 0) { setError("Select at least one user."); return; }
    if (selectedUsers.length > 20) { setError("Select up to 20 users in this UI."); return; }
    setTriggering(true); setError(null);
    try {
      const created = await createAdminFeedInterestSuggestionJob({
        user_ids: selectedUsers.map(item => item.id),
        replace_mode: replaceMode,
        max_tags_per_user: maxTagsPerUser,
      });
      const job = await getAdminFeedInterestSuggestionJob(created.job_id);
      setActiveJob(job);
      const jobs = await listAdminFeedInterestSuggestionJobs({ limit: 8 });
      setRecentJobs(jobs.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start suggestion batch.");
    } finally {
      setTriggering(false);
    }
  }

  return (
    <section className="mt-3.5 grid gap-3 rounded-[14px] border border-app-border bg-app-panel p-3.5">
      {/* Head */}
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="m-0 text-sm text-foreground">Interest Suggestion Batch</h3>
        <span className="text-[11px] text-muted-foreground">Explicit users only</span>
      </div>

      {/* User picker */}
      <div className="grid gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">User Picker</label>
        <div className="flex items-center gap-1.5 rounded-lg border border-app-border bg-app-input px-2.5 py-2 text-muted-foreground/60">
          <Search size={13} className="shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users by username/display name"
            className="flex-1 border-none bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50"
          />
        </div>
        {(searchLoading || searchResults.length > 0) && (
          <div className="overflow-hidden rounded-lg border border-app-border bg-app-bg">
            {searchLoading && <div className="px-2.5 py-2 text-xs text-muted-foreground">Searching...</div>}
            {!searchLoading && searchResults.map(user => (
              <button
                key={user.id}
                type="button"
                className="flex w-full items-center justify-between border-b border-app-border/50 px-2.5 py-2 text-left text-sm text-foreground last:border-b-0 hover:bg-app-input disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => addSelectedUser(user)}
                disabled={selectedIds.has(user.id)}
              >
                <span>{user.display_name}</span>
                <small className="text-muted-foreground">@{user.username}</small>
              </button>
            ))}
            {!searchLoading && searchResults.length === 0 && (
              <div className="px-2.5 py-2 text-xs text-muted-foreground">No user found.</div>
            )}
          </div>
        )}
        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedUsers.map(user => (
              <button
                key={user.id}
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full border border-app-border bg-app-input px-2 py-1 text-xs text-foreground"
                onClick={() => removeSelectedUser(user.id)}
              >
                {user.display_name}
                <small className="text-muted-foreground">@{user.username}</small>
                <X size={11} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-2.5 max-[720px]:grid-cols-1">
        <div className="grid gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Replace Mode</label>
          <select
            className={inputCls}
            value={replaceMode}
            onChange={e => setReplaceMode(e.target.value as FeedInterestSuggestionReplaceMode)}
          >
            <option value="merge">merge</option>
            <option value="replace">replace</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Max Tags / User</label>
          <input
            type="number"
            className={inputCls}
            value={maxTagsPerUser}
            min={1}
            max={15}
            onChange={e => setMaxTagsPerUser(Math.min(15, Math.max(1, Number(e.target.value) || 1)))}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-accent-red/35 bg-accent-red/12 px-2.5 py-2 text-xs text-red-300">{error}</div>
      )}

      <div>
        <button
          type="button"
          className="rounded-[9px] bg-accent-orange px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => void triggerBatch()}
          disabled={triggering || selectedUsers.length === 0}
        >
          {triggering ? "Triggering..." : "Trigger Batch"}
        </button>
      </div>

      {activeJob && (
        <div className="grid gap-2 rounded-[10px] border border-app-border bg-app-bg p-2.5">
          <div className="flex items-center justify-between">
            <strong className="text-xs font-bold text-foreground">Current Job</strong>
            <span className={statusChip(activeJob.status)}>{activeJob.status}</span>
          </div>
          <div className="flex flex-wrap gap-2.5 text-xs text-muted-foreground">
            <span>requested: {activeJob.requested_count}</span>
            <span>processed: {activeJob.processed_count}</span>
            <span>success: {activeJob.success_count}</span>
            <span>failed: {activeJob.failed_count}</span>
          </div>
          <div className="grid max-h-[220px] gap-1.5 overflow-y-auto">
            {activeJob.results.map(result => (
              <div key={`${activeJob.job_id}-${result.user_id}`} className="grid gap-1.5 rounded-lg border border-app-border p-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-muted-foreground">{result.user_id}</span>
                  <span className={statusChip(result.status)}>{result.status}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {result.applied_tags.slice(0, 8).map(tag => (
                    <span key={`${result.user_id}-${tag}`} className="rounded-full border border-app-border bg-app-input px-1.5 py-0.5 text-[10px] text-foreground/80">
                      #{tag}
                    </span>
                  ))}
                </div>
                {result.error && <small className="text-red-300">{result.error}</small>}
              </div>
            ))}
          </div>
        </div>
      )}

      {recentJobs.length > 0 && (
        <div className="grid gap-2 rounded-[10px] border border-app-border bg-app-bg p-2.5">
          <h4 className="m-0 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Recent Jobs</h4>
          <div className="grid gap-1.5">
            {recentJobs.map(job => (
              <button
                key={job.job_id}
                type="button"
                className="flex items-center justify-between gap-2 rounded-lg border border-app-border bg-app-input px-2 py-1.5 text-xs text-foreground hover:border-border-hover"
                onClick={() => void getAdminFeedInterestSuggestionJob(job.job_id).then(setActiveJob).catch(() => {})}
              >
                <span className="font-mono text-muted-foreground">{job.job_id.slice(-8)}</span>
                <span className={statusChip(job.status)}>{job.status}</span>
                <span className="text-muted-foreground">{job.processed_count}/{job.requested_count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
