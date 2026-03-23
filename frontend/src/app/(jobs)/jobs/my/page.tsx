"use client";

import { useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Briefcase } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useMyJobs } from "@/hooks/useJobs";
import JobsListPanel from "@/components/jobs/JobsListPanel";
import MyJobDetailPanel from "@/components/jobs/MyJobDetailPanel";

export default function MyPostsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("job");

  useEffect(() => {
    if (user === null) router.replace("/login?next=/jobs/my");
  }, [user, router]);

  const { jobs, total, isLoading, mutate } = useMyJobs(1);

  const selectedJob = jobs.find((j) => j.slug === selectedId || j.id === selectedId) ?? null;

  const handleSelect = useCallback((jobId: string) => {
    if (typeof window !== "undefined" && window.innerWidth < 860) {
      router.push(`/jobs/${jobId}`);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("job", jobId);
    router.replace(`/jobs/my?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  if (!user) return null;

  return (
    <div className="flex h-full overflow-hidden">
      <JobsListPanel
        jobs={jobs}
        total={total}
        isLoading={isLoading}
        selectedId={selectedId}
        onSelect={handleSelect}
        showFilters={false}
        headerTitle={`${total} posts`}
        emptyState={
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <Briefcase size={32} strokeWidth={1.2} />
            <p className="text-[13px]">You haven't posted any jobs</p>
            <button
              type="button"
              onClick={() => router.push("/jobs/post")}
              className="flex items-center gap-1 text-[12px] text-[#0EA5E9] border-0 bg-transparent cursor-pointer hover:underline"
            >
              + Post a Job
            </button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto max-[859px]:hidden">
        {selectedJob ? (
          <MyJobDetailPanel job={selectedJob} onJobUpdated={() => mutate()} />
        ) : (
          <div className="flex items-center justify-center h-full text-[13px] text-muted-foreground">
            Select a job to view stats
          </div>
        )}
      </div>
    </div>
  );
}
