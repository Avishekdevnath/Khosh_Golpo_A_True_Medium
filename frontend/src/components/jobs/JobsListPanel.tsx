"use client";

import { useEffect, useRef } from "react";
import { SlidersHorizontal } from "lucide-react";
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
  onToggleFilters?: () => void;
  showFilters?: boolean;
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
  onToggleFilters,
  showFilters = true,
  headerTitle,
  emptyState,
}: Props) {
  const autoSelected = useRef(false);

  useEffect(() => {
    if (
      !autoSelected.current &&
      jobs.length > 0 &&
      !selectedId &&
      typeof window !== "undefined" &&
      window.innerWidth >= 860
    ) {
      autoSelected.current = true;
      onSelect(jobs[0].slug);
    }
  }, [jobs, selectedId, onSelect]);

  return (
    <div className="w-full min-[860px]:w-[300px] shrink-0 border-r border-border flex flex-col h-full max-[859px]:border-r-0">
      <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
        <span className="text-[13px] font-medium text-foreground">
          {headerTitle ?? `${total} jobs`}
        </span>
        {showFilters && onToggleFilters && (
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
