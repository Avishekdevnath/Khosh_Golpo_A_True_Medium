"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import type { JobPostOut } from "@/lib/jobsApi";
import JobCard from "./JobCard";

interface Props {
  jobs: JobPostOut[];
  total: number;
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (jobId: string) => void;
  onSaveToggle?: (jobId: string, saved: boolean) => void;
  activeFilterCount?: number;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  onSearchSubmit?: () => void;
  onSearchClear?: () => void;
  onToggleFilters?: () => void;
  headerTitle?: string;
  emptyState?: React.ReactNode;
}

export default function JobsListPanel({
  jobs,
  total,
  isLoading,
  selectedId,
  onSelect,
  onSaveToggle,
  activeFilterCount = 0,
  searchValue = "",
  onSearchChange,
  onSearchSubmit,
  onSearchClear,
  onToggleFilters,
  headerTitle,
  emptyState,
}: Props) {

  return (
    <div className="w-full flex flex-col h-full overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-border shrink-0">
        <span className="text-[13px] font-medium text-foreground">
          {headerTitle ?? `${total} jobs`}
        </span>
        {onToggleFilters && (
          <button
            type="button"
            onClick={onToggleFilters}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-border bg-transparent text-[12px] text-muted-foreground hover:text-foreground hover:border-border/80 cursor-pointer transition-colors"
          >
            <SlidersHorizontal size={12} />
            Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
          </button>
        )}
      </div>

      {/* Search bar */}
      {onSearchChange && (
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 flex-1 h-11 px-4 rounded-xl bg-secondary border border-border focus-within:border-primary/50 focus-within:bg-background focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] transition-all">
              <Search size={15} className="text-muted-foreground shrink-0" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onSearchSubmit?.(); }}
                placeholder="Search by title, company, or skill…"
                className="flex-1 bg-transparent text-[13.5px] text-foreground placeholder:text-muted-foreground outline-none"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => onSearchClear?.()}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/30 hover:text-foreground transition-colors"
                >
                  <X size={11} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => onSearchSubmit?.()}
              className="h-11 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium border-0 cursor-pointer hover:opacity-90 transition-opacity shrink-0"
            >
              Search
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-[13px] text-muted-foreground">
            Loading...
          </div>
        ) : jobs.length === 0 ? (
          emptyState ?? (
            <div className="flex items-center justify-center h-32 text-[13px] text-muted-foreground">
              No jobs found
            </div>
          )
        ) : (
          jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              selected={job.slug === selectedId}
              onClick={() => onSelect(job.slug)}
              onSaveToggle={onSaveToggle ? (saved) => onSaveToggle(job.id, saved) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
