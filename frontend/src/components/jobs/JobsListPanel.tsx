"use client";

import { useEffect, useRef } from "react";
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
  onToggleFilters,
  headerTitle,
  emptyState,
}: Props) {
  const autoSelected = useRef(false);

  useEffect(() => {
    autoSelected.current = false;
  }, [jobs]);

  useEffect(() => {
    if (
      !autoSelected.current &&
      jobs.length > 0 &&
      !selectedId &&
      typeof window !== "undefined" &&
      window.innerWidth >= 1024
    ) {
      autoSelected.current = true;
      onSelect(jobs[0].slug);
    }
  }, [jobs, selectedId, onSelect]);

  return (
    <div className="w-full min-[1024px]:w-[320px] shrink-0 flex flex-col h-full">
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

      {/* Search bar — only rendered when onSearchChange is provided */}
      {onSearchChange && (
        <div className="px-3 py-2 border-b border-border shrink-0">
          <div className="flex items-center gap-2 h-8 px-2.5 rounded-lg bg-[#151927] border border-[#1e2235] focus-within:border-[#0EA5E9]/50 transition-colors">
            <Search size={13} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search jobs…"
              className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={12} />
              </button>
            )}
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
