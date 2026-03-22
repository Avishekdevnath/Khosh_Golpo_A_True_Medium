"use client";

import { useState, useEffect } from "react";
import { Briefcase, PlusCircle, Bookmark, FileText, RefreshCw } from "lucide-react";
import { useJobs, useSavedJobs } from "@/hooks/useJobs";
import { useAuthStore } from "@/store/authStore";
import type { JobFilters, JobPostOut } from "@/lib/jobsApi";
import JobCard from "./JobCard";
import JobFilters from "./JobFilters";
import JobDetailPanel from "./JobDetailPanel";

type Tab = "browse" | "saved";

export default function JobsWorkspace() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>("browse");
  const [filters, setFilters] = useState<JobFilters>({ page: 1, page_size: 20 });
  const [selectedJob, setSelectedJob] = useState<JobPostOut | null>(null);

  const { jobs, total, isLoading, mutate } = useJobs(tab === "browse" ? filters : {});
  const { jobs: savedJobs, isLoading: savedLoading, mutate: mutateSaved } = useSavedJobs();

  const displayJobs = tab === "browse" ? jobs : savedJobs;

  // Select first job on load
  useEffect(() => {
    if (displayJobs.length > 0 && !selectedJob) {
      setSelectedJob(displayJobs[0]);
    }
  }, [displayJobs]);

  function handleApplied() {
    mutate();
    // Update selected job's has_applied flag
    if (selectedJob) {
      setSelectedJob({ ...selectedJob, has_applied: true });
    }
  }

  return (
    <div className="flex h-full bg-[#080a10]">
      {/* Left: filters + list */}
      <div className="w-[320px] flex-shrink-0 flex flex-col border-r border-[#1e2235] bg-[#10131d]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2235]">
          <div className="flex items-center gap-2">
            <Briefcase size={16} className="text-[#0EA5E9]" />
            <span className="text-[14px] font-semibold text-white">Jobs</span>
            {tab === "browse" && (
              <span className="text-[11px] text-[#8b95a1] bg-[#1e2235] px-1.5 py-0.5 rounded-full">
                {total}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => mutate()}
              className="p-1.5 text-[#8b95a1] hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw size={13} />
            </button>
            {user && (
              <a
                href="/jobs/post"
                className="flex items-center gap-1 px-2 py-1.5 text-[12px] text-[#0EA5E9] hover:bg-[#0EA5E9]/10 rounded-lg transition-colors"
              >
                <PlusCircle size={13} /> Post
              </a>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1e2235]">
          {(user ? ["browse", "saved"] as Tab[] : ["browse"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelectedJob(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium transition-colors border-b-2 ${
                tab === t
                  ? "border-[#0EA5E9] text-[#0EA5E9]"
                  : "border-transparent text-[#8b95a1] hover:text-white"
              }`}
            >
              {t === "saved" ? <Bookmark size={12} /> : <Briefcase size={12} />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          {user && (
            <a
              href="/jobs/applications"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium text-[#8b95a1] hover:text-white border-b-2 border-transparent transition-colors"
            >
              <FileText size={12} /> Applied
            </a>
          )}
        </div>

        {/* Filters (browse only) */}
        {tab === "browse" && (
          <JobFilters filters={filters} onChange={setFilters} />
        )}

        {/* Job list */}
        <div className="flex-1 overflow-y-auto">
          {(isLoading || savedLoading) ? (
            <div className="flex items-center justify-center h-24">
              <div className="w-5 h-5 border-2 border-[#0EA5E9] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : displayJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 h-32 text-[#8b95a1]">
              <Briefcase size={24} strokeWidth={1.5} />
              <p className="text-[13px]">{tab === "saved" ? "No saved jobs" : "No jobs found"}</p>
            </div>
          ) : (
            displayJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                selected={selectedJob?.id === job.id}
                onClick={() => setSelectedJob(job)}
                onSaveToggle={() => {
                  mutateSaved();
                  if (tab === "saved" && selectedJob?.id === job.id) setSelectedJob(null);
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: detail */}
      <div className="flex-1 overflow-hidden">
        {selectedJob ? (
          <JobDetailPanel
            key={selectedJob.id}
            job={selectedJob}
            onApplied={handleApplied}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[#8b95a1]">
            <Briefcase size={40} strokeWidth={1} />
            <p className="text-[14px]">Select a job to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
