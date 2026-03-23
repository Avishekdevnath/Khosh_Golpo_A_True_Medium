"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useJobs, useJob } from "@/hooks/useJobs";
import { saveJob, unsaveJob } from "@/lib/jobsApi";
import type { JobFilters } from "@/lib/jobsApi";
import JobsListPanel from "@/components/jobs/JobsListPanel";
import JobDetailPanel from "@/components/jobs/JobDetailPanel";
import JobFiltersPanel from "@/components/jobs/JobFilters";
import { Search } from "lucide-react";

export default function JobsBrowsePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("job");

  const [filters, setFilters] = useState<JobFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const { jobs, total, isLoading, mutate: mutateList } = useJobs(filters);
  const { job: selectedJob } = useJob(selectedId);

  const activeFilterCount = [
    filters.job_type,
    filters.experience_level,
    filters.is_remote,
    filters.salary_min,
    filters.salary_max,
  ].filter(Boolean).length;

  const handleSelect = useCallback((jobId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("job", jobId);
    router.replace(`/jobs?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleSaveToggle = useCallback(async (jobId: string, saved: boolean) => {
    if (saved) await unsaveJob(jobId);
    else await saveJob(jobId);
    mutateList();
  }, [mutateList]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* List column */}
      <div className="flex flex-col shrink-0 max-[859px]:flex-1">
        {/* Filter panel (slide-down) */}
        {showFilters && (
          <div className="w-[300px] max-[859px]:w-full border-r border-b border-[#1e2235] p-3 bg-[#080a10]">
            <JobFiltersPanel filters={filters} onChange={setFilters} />
          </div>
        )}
        <JobsListPanel
          jobs={jobs}
          total={total}
          isLoading={isLoading}
          selectedId={selectedId}
          onSelect={handleSelect}
          onSaveToggle={handleSaveToggle}
          activeFilterCount={activeFilterCount}
          onToggleFilters={() => setShowFilters((v) => !v)}
          emptyState={
            <div className="flex flex-col items-center justify-center h-48 text-[#636f8d] gap-3">
              <Search size={32} strokeWidth={1.2} />
              <p className="text-[13px]">
                {activeFilterCount > 0 ? "No jobs match your filters" : "No jobs posted yet"}
              </p>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilters({})}
                  className="text-[12px] text-[#0EA5E9] border-0 bg-transparent cursor-pointer hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          }
        />
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-y-auto max-[859px]:hidden">
        {selectedJob ? (
          <JobDetailPanel job={selectedJob} onApplied={() => mutateList()} />
        ) : (
          <div className="flex items-center justify-center h-full text-[13px] text-[#636f8d]">
            Select a job to view details
          </div>
        )}
      </div>
    </div>
  );
}
