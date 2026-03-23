"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { JobFilters } from "@/lib/jobsApi";
import { useJobs } from "@/hooks/useJobs";
import JobsListPanel from "./JobsListPanel";
import JobFiltersPanel from "./JobFilters";
import JobsRecommendSidebar from "./JobsRecommendSidebar";

export default function JobsWorkspace() {
  const router = useRouter();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [filters, setFilters] = useState<JobFilters>({});

  const activeFilterCount = [
    filters.job_type,
    filters.experience_level,
    filters.is_remote !== undefined && filters.is_remote !== null ? true : undefined,
    filters.salary_min,
    filters.salary_max,
  ].filter((v) => v !== undefined && v !== null).length;

  const activeFilters: JobFilters = {
    ...filters,
    ...(submittedSearch ? { search: submittedSearch } : {}),
  };

  function handleSearchSubmit() {
    setSubmittedSearch(search.trim());
  }

  function handleSearchClear() {
    setSearch("");
    setSubmittedSearch("");
  }

  const { jobs, total, isLoading } = useJobs(activeFilters);

  const handleSelect = useCallback(
    (slug: string) => {
      router.push(`/jobs/${slug}`);
    },
    [router],
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Center column */}
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        <div className="w-full border-r border-border flex flex-col flex-1 overflow-hidden">
          <JobsListPanel
            jobs={jobs}
            total={total}
            isLoading={isLoading}
            selectedId={null}
            onSelect={handleSelect}
            searchValue={search}
            onSearchChange={setSearch}
            onSearchSubmit={handleSearchSubmit}
            onSearchClear={handleSearchClear}
            activeFilterCount={activeFilterCount}
            onToggleFilters={() => setFiltersOpen((v) => !v)}
            emptyState={
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                <Search size={32} strokeWidth={1.2} />
                <p className="text-[13px]">
                  {activeFilterCount > 0 || submittedSearch
                    ? "No jobs match your search"
                    : "No jobs posted yet"}
                </p>
                {(activeFilterCount > 0 || submittedSearch) && (
                  <button
                    type="button"
                    onClick={() => { setFilters({}); handleSearchClear(); }}
                    className="text-[12px] text-[#0EA5E9] border-0 bg-transparent cursor-pointer hover:underline"
                  >
                    Clear search & filters
                  </button>
                )}
              </div>
            }
          />
        </div>
      </div>

      {/* Recommendations sidebar — only on wide screens, hidden when filters open */}
      {!filtersOpen && <JobsRecommendSidebar />}

      {/* Filter panel — sidebar on desktop, full overlay on mobile */}
      {filtersOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 min-[1024px]:hidden"
            onClick={() => setFiltersOpen(false)}
          />
          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-[360px] max-w-[92vw] z-50 flex flex-col bg-background border-l border-border shadow-2xl min-[1024px]:static min-[1024px]:w-[320px] min-[1024px]:shrink-0 min-[1024px]:shadow-none min-[1024px]:z-auto">
            <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                <SlidersHorizontal size={14} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <JobFiltersPanel
                filters={filters}
                onChange={(f) => setFilters({ ...f, search: undefined })}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
