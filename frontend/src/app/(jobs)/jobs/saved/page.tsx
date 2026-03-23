"use client";

import { useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useSavedJobs, useJob } from "@/hooks/useJobs";
import { unsaveJob } from "@/lib/jobsApi";
import JobsListPanel from "@/components/jobs/JobsListPanel";
import JobDetailPanel from "@/components/jobs/JobDetailPanel";

export default function SavedJobsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("job");

  // Auth guard
  useEffect(() => {
    if (user === null) router.replace("/login?next=/jobs/saved");
  }, [user, router]);

  const { jobs, total, isLoading, mutate } = useSavedJobs(1);
  const { job: selectedJob } = useJob(selectedId);

  const handleSelect = useCallback((jobId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("job", jobId);
    router.replace(`/jobs/saved?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleUnsave = useCallback(async (jobId: string) => {
    await unsaveJob(jobId);
    mutate();
  }, [mutate]);

  if (!user) return null;

  return (
    <div className="flex h-full overflow-hidden">
      <JobsListPanel
        jobs={jobs}
        total={total}
        isLoading={isLoading}
        selectedId={selectedId}
        onSelect={handleSelect}
        onSaveToggle={(_jobId, saved) => { if (saved) handleUnsave(_jobId); }}
        showFilters={false}
        headerTitle={`${total} saved`}
        emptyState={
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <Bookmark size={32} strokeWidth={1.2} />
            <p className="text-[13px]">No saved jobs yet</p>
            <button
              type="button"
              onClick={() => router.push("/jobs")}
              className="text-[12px] text-[#0EA5E9] border-0 bg-transparent cursor-pointer hover:underline"
            >
              Browse Jobs
            </button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto max-[859px]:hidden">
        {selectedJob ? (
          <JobDetailPanel job={selectedJob} onApplied={() => mutate()} />
        ) : (
          <div className="flex items-center justify-center h-full text-[13px] text-muted-foreground">
            Select a saved job to view details
          </div>
        )}
      </div>
    </div>
  );
}
