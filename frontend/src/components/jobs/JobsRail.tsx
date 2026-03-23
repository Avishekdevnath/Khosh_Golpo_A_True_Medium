"use client";

import { Briefcase } from "lucide-react";
import type { JobPostOut } from "@/lib/jobsApi";

interface Props {
  jobs: JobPostOut[];
  selectedId: string | null;
  onSelect: (jobId: string) => void;
  isLoading: boolean;
}

export default function JobsRail({ jobs, selectedId, onSelect, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="w-[200px] shrink-0 border-r border-[#1e2235] flex items-center justify-center text-[13px] text-[#636f8d]">
        Loading...
      </div>
    );
  }

  return (
    <div className="w-[200px] shrink-0 border-r border-[#1e2235] flex flex-col h-full overflow-y-auto">
      <div className="px-3 py-2.5 border-b border-[#1e2235] shrink-0">
        <span className="text-[12px] font-semibold text-[#e8eaf2]">Your Jobs</span>
      </div>
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-[#636f8d] gap-2 p-4">
          <Briefcase size={24} strokeWidth={1.2} />
          <p className="text-[12px] text-center">No posted jobs</p>
        </div>
      ) : (
        jobs.map((job) => (
          <button
            key={job.id}
            type="button"
            onClick={() => onSelect(job.id)}
            className={[
              "w-full text-left px-3 py-3 border-0 cursor-pointer transition-colors border-b border-[#1e2235]",
              job.id === selectedId
                ? "bg-[#0EA5E9]/10 text-[#0EA5E9] border-l-2 border-l-[#0EA5E9]"
                : "bg-transparent text-[#e8eaf2] hover:bg-white/5",
            ].join(" ")}
          >
            <div className="text-[13px] font-medium truncate">{job.title}</div>
            <div className="text-[11px] text-[#636f8d] mt-0.5">
              {job.application_count} applicants
            </div>
          </button>
        ))
      )}
    </div>
  );
}
