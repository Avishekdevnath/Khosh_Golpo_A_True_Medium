"use client";

import { useState } from "react";
import { Plus, Briefcase, Users, Eye, XCircle, AlertCircle } from "lucide-react";
import { useMyJobs, useApplications } from "@/hooks/useJobs";
import { closeJob } from "@/lib/jobsApi";
import type { JobPostOut } from "@/lib/jobsApi";
import ApplicationPipelineBoard from "./ApplicationPipelineBoard";

const STATUS_COLORS: Record<string, string> = {
  pending_review: "text-[#f0834a] bg-[#f0834a]/10 border-[#f0834a]/20",
  active: "text-[#3dd68c] bg-[#3dd68c]/10 border-[#3dd68c]/20",
  closed: "text-[#8b95a1] bg-[#1e2235] border-[#1e2235]",
  rejected: "text-[#f06b6b] bg-[#f06b6b]/10 border-[#f06b6b]/20",
  draft: "text-[#8b95a1] bg-[#1e2235] border-[#1e2235]",
};

const STATUS_LABELS: Record<string, string> = {
  pending_review: "Under Review",
  active: "Active",
  closed: "Closed",
  rejected: "Rejected",
  draft: "Draft",
};

export default function MyJobsWorkspace() {
  const { jobs, isLoading, error, mutate } = useMyJobs();
  const [selectedJob, setSelectedJob] = useState<JobPostOut | null>(null);
  const [closing, setClosing] = useState<string | null>(null);

  const { applications, mutate: mutateApps } = useApplications(selectedJob?.id ?? null);

  async function handleClose(job: JobPostOut) {
    if (!confirm(`Close "${job.title}"? No new applications will be accepted.`)) return;
    setClosing(job.id);
    try {
      await closeJob(job.id);
      mutate();
      if (selectedJob?.id === job.id) setSelectedJob({ ...job, status: "closed" });
    } finally {
      setClosing(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-5 h-5 border-2 border-[#0EA5E9] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-[#f06b6b] p-4 text-[13px]">
        <AlertCircle size={15} /> Failed to load your job posts
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#080a10]">
      {/* Left: job list */}
      <div className="w-[280px] flex-shrink-0 flex flex-col border-r border-[#1e2235] bg-[#10131d]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2235]">
          <h2 className="text-[14px] font-semibold text-white">My Job Posts</h2>
          <a
            href="/jobs/post"
            className="flex items-center gap-1 text-[12px] text-[#0EA5E9] hover:bg-[#0EA5E9]/10 px-2 py-1.5 rounded-lg transition-colors"
          >
            <Plus size={13} /> New
          </a>
        </div>

        <div className="flex-1 overflow-y-auto">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 h-32 text-[#8b95a1] p-4">
              <Briefcase size={24} strokeWidth={1.5} />
              <p className="text-[13px] text-center">No job posts yet</p>
              <a href="/jobs/post" className="text-[12px] text-[#0EA5E9] hover:underline">
                Post your first job
              </a>
            </div>
          ) : (
            jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`px-4 py-3 cursor-pointer border-b border-[#1e2235] border-l-2 transition-all ${
                  selectedJob?.id === job.id
                    ? "bg-[#151927] border-l-[#0EA5E9]"
                    : "hover:bg-[#10131d]/60 border-l-transparent"
                }`}
              >
                <p className="text-[13px] font-medium text-white truncate">{job.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded border ${STATUS_COLORS[job.status] ?? ""}`}
                  >
                    {STATUS_LABELS[job.status] ?? job.status}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-[#8b95a1]">
                    <Users size={10} /> {job.application_count}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: applications pipeline */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedJob ? (
          <>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2235] bg-[#10131d]">
              <div>
                <h3 className="text-[15px] font-semibold text-white">{selectedJob.title}</h3>
                <p className="text-[12px] text-[#8b95a1]">{selectedJob.company_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/jobs/${selectedJob.id}`}
                  className="flex items-center gap-1 text-[12px] text-[#8b95a1] hover:text-white border border-[#1e2235] px-2 py-1.5 rounded-lg transition-colors"
                >
                  <Eye size={12} /> View
                </a>
                {selectedJob.status === "active" && (
                  <button
                    onClick={() => handleClose(selectedJob)}
                    disabled={closing === selectedJob.id}
                    className="flex items-center gap-1 text-[12px] text-[#f06b6b] hover:text-[#f06b6b]/80 border border-[#f06b6b]/30 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <XCircle size={12} /> Close
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <ApplicationPipelineBoard
                jobId={selectedJob.id}
                applications={applications}
                onMoved={mutateApps}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-[#8b95a1]">
            <Users size={40} strokeWidth={1} />
            <p className="text-[14px]">Select a job to manage applications</p>
          </div>
        )}
      </div>
    </div>
  );
}
