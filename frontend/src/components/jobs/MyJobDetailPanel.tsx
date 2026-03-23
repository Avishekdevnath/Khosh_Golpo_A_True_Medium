"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Bookmark, PenLine, XCircle, ArrowRight } from "lucide-react";
import type { JobPostOut } from "@/lib/jobsApi";
import { closeJob } from "@/lib/jobsApi";
import { useApplications } from "@/hooks/useJobs";

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-[#3dd68c]/15", text: "text-[#3dd68c]", label: "Active" },
  pending_review: { bg: "bg-[#f5b64a]/15", text: "text-[#f5b64a]", label: "Under Review" },
  closed: { bg: "bg-[#1e2235]", text: "text-[#636f8d]", label: "Closed" },
  rejected: { bg: "bg-[#f06b6b]/15", text: "text-[#f06b6b]", label: "Rejected" },
  draft: { bg: "bg-[#1e2235]", text: "text-[#636f8d]", label: "Draft" },
};

const STAGE_COLORS: Record<string, string> = {
  applied: "#7c73f0",
  screening: "#f0834a",
  interview: "#0EA5E9",
  offer: "#f5b64a",
  hired: "#3dd68c",
};

interface Props {
  job: JobPostOut;
  onJobUpdated?: () => void;
}

export default function MyJobDetailPanel({ job, onJobUpdated }: Props) {
  const router = useRouter();
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);

  const { applications: apps } = useApplications(job.id);

  const stageBreakdown = Object.entries(STAGE_COLORS).map(([stage, color]) => ({
    stage,
    color,
    count: apps.filter((a) => a.stage === stage).length,
  }));
  const maxCount = Math.max(...stageBreakdown.map((s) => s.count), 1);

  const badge = STATUS_BADGES[job.status] ?? STATUS_BADGES.draft;
  const daysAgo = Math.floor((Date.now() - new Date(job.created_at).getTime()) / 86400000);

  async function handleClose() {
    setClosing(true);
    try {
      await closeJob(job.id);
      onJobUpdated?.();
    } finally {
      setClosing(false);
      setConfirmClose(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#080a10] p-5">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-[18px] font-bold text-[#e8eaf2]">{job.title}</h2>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-[#636f8d]">
          <span>Posted {daysAgo}d ago</span>
          <span className="flex items-center gap-1"><Users size={12} /> {job.application_count} applicants</span>
          <span className="flex items-center gap-1"><Bookmark size={12} /> {job.save_count} saved</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button
          type="button"
          onClick={() => router.push(`/jobs/pipeline?job=${job.id}`)}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#0EA5E9] text-white text-[13px] font-medium border-0 cursor-pointer hover:brightness-110 transition-all"
        >
          View Pipeline <ArrowRight size={14} />
        </button>
        <button
          type="button"
          onClick={() => router.push(`/jobs/post?edit=${job.id}`)}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-[#1e2235] bg-transparent text-[#e8eaf2] text-[13px] font-medium cursor-pointer hover:bg-white/5 transition-colors"
        >
          <PenLine size={14} /> Edit Job
        </button>
        {job.status === "active" && (
          <button
            type="button"
            onClick={() => setConfirmClose(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-[#f06b6b]/30 bg-[#f06b6b]/5 text-[#f06b6b] text-[13px] font-medium cursor-pointer hover:bg-[#f06b6b]/10 transition-colors ml-auto"
          >
            <XCircle size={14} /> Close Job
          </button>
        )}
      </div>

      {/* Applicant breakdown */}
      {apps.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[13px] font-semibold text-[#e8eaf2] mb-3">Applicant Breakdown</h3>
          <div className="flex flex-col gap-2">
            {stageBreakdown.map(({ stage, color, count }) => (
              <div key={stage} className="flex items-center gap-3">
                <span className="text-[12px] text-[#636f8d] w-[80px] capitalize">{stage}</span>
                <div className="flex-1 h-5 bg-[#10131d] rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-300"
                    style={{
                      width: `${(count / maxCount) * 100}%`,
                      backgroundColor: `${color}30`,
                      minWidth: count > 0 ? "24px" : "0",
                    }}
                  />
                </div>
                <span className="text-[12px] text-[#e8eaf2] font-medium w-[24px] text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Job description preview */}
      <details className="group">
        <summary className="text-[13px] font-semibold text-[#e8eaf2] cursor-pointer list-none flex items-center gap-2 mb-2">
          <span className="transition-transform group-open:rotate-90">▶</span>
          Job Description
        </summary>
        <div className="text-[13px] text-[#c5ccd6] leading-relaxed whitespace-pre-wrap break-words mt-2">
          {job.description}
        </div>
      </details>

      {/* Close confirmation dialog */}
      {confirmClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[400px] rounded-xl bg-[#10131d] border border-[#1e2235] p-6 shadow-xl">
            <h3 className="text-[16px] font-semibold text-[#e8eaf2] mb-2">Close this job posting?</h3>
            <p className="text-[13px] text-[#636f8d] mb-5 leading-relaxed">
              This will stop accepting new applications. Existing applications remain in your pipeline.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmClose(false)}
                className="h-9 px-4 rounded-lg border border-[#1e2235] bg-transparent text-[#e8eaf2] text-[13px] font-medium cursor-pointer hover:bg-white/5 transition-colors"
              >
                Keep Open
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={closing}
                className="h-9 px-4 rounded-lg bg-[#f06b6b]/15 text-[#f06b6b] border border-[#f06b6b]/30 text-[13px] font-medium cursor-pointer hover:bg-[#f06b6b]/25 transition-colors disabled:opacity-50"
              >
                {closing ? "Closing..." : "Close Job"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
