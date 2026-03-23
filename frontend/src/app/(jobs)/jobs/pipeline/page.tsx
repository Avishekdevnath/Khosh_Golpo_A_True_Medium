"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useMyJobs, useApplications } from "@/hooks/useJobs";
import { moveApplicationStage } from "@/lib/jobsApi";
import type { ApplicationStage } from "@/lib/jobsApi";
import JobsRail from "@/components/jobs/JobsRail";
import KanbanBoard from "@/components/jobs/KanbanBoard";
import KanbanCard from "@/components/jobs/KanbanCard";

export default function PipelinePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const selectedJobId = searchParams.get("job");
  const [movingAppId, setMovingAppId] = useState<string | null>(null);
  const autoSelected = useRef(false);

  useEffect(() => {
    if (user === null) router.replace("/login?next=/jobs/pipeline");
  }, [user, router]);

  const { jobs: myJobs, isLoading: jobsLoading } = useMyJobs(1);

  // Auto-select first job if none selected (only once)
  useEffect(() => {
    if (!autoSelected.current && !selectedJobId && myJobs.length > 0) {
      autoSelected.current = true;
      const params = new URLSearchParams(searchParams.toString());
      params.set("job", myJobs[0].slug);
      router.replace(`/jobs/pipeline?${params.toString()}`, { scroll: false });
    }
  }, [selectedJobId, myJobs, router, searchParams]);

  const { applications, isLoading: appsLoading, mutate: mutateApps } = useApplications(selectedJobId);
  const selectedJob = myJobs.find((j) => j.slug === selectedJobId || j.id === selectedJobId);

  const handleSelectJob = useCallback((jobId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("job", jobId);
    router.replace(`/jobs/pipeline?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleMoveStage = useCallback(async (appId: string, newStage: ApplicationStage, note?: string) => {
    if (!selectedJobId) return;
    setMovingAppId(appId);
    try {
      await moveApplicationStage(selectedJobId, appId, newStage, note);
      mutateApps();
    } finally {
      setMovingAppId(null);
    }
  }, [selectedJobId, mutateApps]);

  const handleViewProfile = useCallback((userId: string) => {
    window.open(`/profile/${userId}`, "_blank");
  }, []);

  if (!user) return null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Jobs Rail — desktop only */}
      <div className="hidden min-[1024px]:block">
        <JobsRail
          jobs={myJobs}
          selectedId={selectedJobId}
          onSelect={handleSelectJob}
          isLoading={jobsLoading}
        />
      </div>

      {/* Mobile job selector */}
      <div className="min-[1024px]:hidden w-full px-3 py-2 border-b border-border shrink-0">
        <select
          value={selectedJobId ?? ""}
          onChange={(e) => handleSelectJob(e.target.value)}
          className="w-full h-9 bg-secondary border border-border rounded-lg text-[13px] text-foreground px-3"
        >
          {!selectedJobId && <option value="">Select a job...</option>}
          {myJobs.map((job) => (
            <option key={job.slug} value={job.slug}>{job.title} ({job.application_count})</option>
          ))}
        </select>
      </div>

      {/* Kanban Board — desktop */}
      <div className="hidden min-[1024px]:flex flex-1 min-w-0">
        {!selectedJobId ? (
          <div className="flex flex-col items-center justify-center h-full w-full text-muted-foreground gap-3">
            <Users size={32} strokeWidth={1.2} />
            <p className="text-[13px]">Select a job to view its pipeline</p>
          </div>
        ) : appsLoading ? (
          <div className="flex items-center justify-center h-full w-full text-[13px] text-muted-foreground">
            Loading applications...
          </div>
        ) : (
          <KanbanBoard
            applications={applications}
            onMoveStage={handleMoveStage}
            onViewProfile={handleViewProfile}
            movingAppId={movingAppId}
            customQuestions={selectedJob?.custom_questions}
          />
        )}
      </div>

      {/* Mobile accordion view */}
      <div className="min-[1024px]:hidden flex-1 overflow-y-auto">
        {["applied", "screening", "interview", "offer", "hired"].map((stage, i) => {
          const stageApps = applications.filter((a) => a.stage === stage);
          return (
            <details key={stage} open={i === 0}>
              <summary className="flex items-center justify-between px-4 py-3 border-b border-border cursor-pointer text-[13px] font-semibold text-foreground capitalize">
                {stage}
                <span className="text-[11px] font-bold text-muted-foreground">{stageApps.length}</span>
              </summary>
              <div className="px-3 py-2">
                {stageApps.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground py-2 text-center">No applicants</p>
                ) : (
                  stageApps.map((app) => (
                    <KanbanCard
                      key={app.id}
                      application={app}
                      onMoveStage={(newStage, note) => handleMoveStage(app.id, newStage, note)}
                      onViewProfile={handleViewProfile}
                      isMoving={movingAppId === app.id}
                      customQuestions={selectedJob?.custom_questions}
                    />
                  ))
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
