"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import type { JobFilters } from "@/lib/jobsApi";
import { useJob, useJobs } from "@/hooks/useJobs";
import JobsFilterRail from "./JobsFilterRail";
import JobsListPanel from "./JobsListPanel";
import JobDetailPanel from "./JobDetailPanel";

export default function JobsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedSlug = searchParams.get("job") ?? null;

  const [col1Expanded, setCol1Expanded] = useState(false);
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

  // Active filter count (is_remote handled separately so false counts)
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

  const { jobs, total, isLoading, mutate: mutateList } = useJobs(activeFilters);
  const { job: selectedJob } = useJob(selectedSlug);

  const handleSelect = useCallback(
    (slug: string) => {
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        router.push(`/jobs/${slug}`);
        return;
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("job", slug);
      router.replace(`/jobs?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleClose = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("job");
    const qs = params.toString();
    router.replace(qs ? `/jobs?${qs}` : "/jobs", { scroll: false });
  }, [router, searchParams]);

  const handleApplied = useCallback(() => {
    mutateList();
  }, [mutateList]);

  return (
    <div className="flex h-full overflow-hidden">
      <JobsFilterRail
        expanded={col1Expanded}
        onToggle={() => setCol1Expanded((v) => !v)}
        filters={filters}
        onFiltersChange={setFilters}
        activeFilterCount={activeFilterCount}
      />

      {/* Col 2 — expands to fill when no detail selected */}
      <div className={selectedJob ? "w-[320px] shrink-0 border-r border-border" : "flex-1"}>
        <JobsListPanel
          jobs={jobs}
          total={total}
          isLoading={isLoading}
          selectedId={selectedSlug}
          onSelect={handleSelect}
          searchValue={search}
          onSearchChange={setSearch}
          activeFilterCount={activeFilterCount}
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

      {/* Col 3 — hidden on <1024px */}
      {selectedJob && (
        <div className="flex-1 overflow-y-auto border-l border-border max-[1023px]:hidden">
          <JobDetailPanel
            job={selectedJob}
            onApplied={handleApplied}
            onClose={handleClose}
          />
        </div>
      )}
    </div>
  );
}
