"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import JobCard from "./JobCard";
import type { JobPostOut } from "@/lib/jobsApi";

interface Props {
  jobs: JobPostOut[];
  total: number;
  isLoading: boolean;
  /** Currently selected job ID (from ?job= param) */
  selectedId: string | null;
  /** Callback when a card is clicked */
  onSelect: (jobId: string) => void;
  /** Callback to toggle save */
  onSaveToggle?: (jobId: string, saved: boolean) => void;
  /** Number of active filters (shown on filter button) */
  activeFilterCount?: number;
  /** Toggle filter panel visibility */
  onToggleFilters?: () => void;
  /** Show filters button? (hidden on Saved page) */
  showFilters?: boolean;
  /** Header title override (e.g. "Saved Jobs", "My Posts") */
  headerTitle?: string;
  /** Empty state content */
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

  // Auto-select first job on initial load
  useEffect(() => {
    if (!autoSelected.current && jobs.length > 0 && !selectedId) {
      autoSelected.current = true;
      onSelect(jobs[0].id);
    }
  }, [jobs, selectedId, onSelect]);

  return (
    <div className="w-full min-[860px]:w-[300px] shrink-0 border-r border-border flex flex-col h-full max-[859px]:border-r-0">
      {/* Header */}
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

      {/* Card list */}
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
              selected={job.id === selectedId}
              onClick={() => onSelect(job.id)}
              onSaveToggle={onSaveToggle ? (saved) => onSaveToggle(job.id, saved) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
