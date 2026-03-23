"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { JobFilters } from "@/lib/jobsApi";
import { useJobs } from "@/hooks/useJobs";
import JobsFilterRail from "./JobsFilterRail";
import JobsListPanel from "./JobsListPanel";
import JobFiltersPanel from "./JobFilters";

export default function JobsWorkspace() {
  const router = useRouter();

  const [col1Expanded, setCol1Expanded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<JobFilters>({});

  // Debounce search 400ms
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const activeFilterCount = [
    filters.job_type,
    filters.experience_level,
    filters.is_remote !== undefined && filters.is_remote !== null ? true : undefined,
    filters.salary_min,
    filters.salary_max,
  ].filter((v) => v !== undefined && v !== null).length;

  const activeFilters: JobFilters = {
    ...filters,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  };

  const { jobs, total, isLoading } = useJobs(activeFilters);

  const handleSelect = useCallback(
    (slug: string) => {
      router.push(`/jobs/${slug}`);
    },
    [router],
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Col 1 — left nav rail */}
      <JobsFilterRail
        expanded={col1Expanded}
        onToggle={() => setCol1Expanded((v) => !v)}
      />

      {/* Col 2 — full-width job list */}
      <div className="flex-1 overflow-hidden">
        <JobsListPanel
          jobs={jobs}
          total={total}
          isLoading={isLoading}
          selectedId={null}
          onSelect={handleSelect}
          searchValue={search}
          onSearchChange={setSearch}
          activeFilterCount={activeFilterCount}
          onToggleFilters={() => setFiltersOpen((v) => !v)}
          emptyState={
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
              <Search size={32} strokeWidth={1.2} />
              <p className="text-[13px]">
                {activeFilterCount > 0 || debouncedSearch
                  ? "No jobs match your search"
                  : "No jobs posted yet"}
              </p>
              {(activeFilterCount > 0 || debouncedSearch) && (
                <button
                  type="button"
                  onClick={() => { setFilters({}); setSearch(""); }}
                  className="text-[12px] text-[#0EA5E9] border-0 bg-transparent cursor-pointer hover:underline"
                >
                  Clear search & filters
                </button>
              )}
            </div>
          }
        />
      </div>

      {/* Right filter panel */}
      {filtersOpen && (
        <div className="w-[240px] shrink-0 border-l border-border bg-background flex flex-col h-full overflow-y-auto">
          <div className="flex items-center justify-between px-3 h-11 border-b border-border shrink-0">
            <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
              <SlidersHorizontal size={13} />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#0EA5E9] text-[9px] font-bold text-white flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={13} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <JobFiltersPanel
              filters={filters}
              onChange={(f) => setFilters({ ...f, search: undefined })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
