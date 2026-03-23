"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight, Bookmark, PenLine, Users, XCircle } from "lucide-react";
import { useApplications } from "@/hooks/useJobs";
import { closeJob } from "@/lib/jobsApi";
import type { JobPostOut } from "@/lib/jobsApi";

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-[#3dd68c]/15", text: "text-[#3dd68c]", label: "Active" },
  pending_review: { bg: "bg-[#f5b64a]/15", text: "text-[#f5b64a]", label: "Under Review" },
  closed: { bg: "bg-border", text: "text-muted-foreground", label: "Closed" },
  rejected: { bg: "bg-destructive/15", text: "text-destructive", label: "Rejected" },
  draft: { bg: "bg-border", text: "text-muted-foreground", label: "Draft" },
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
    count: apps.filter((app) => app.stage === stage).length,
  }));
  const maxCount = Math.max(...stageBreakdown.map((stage) => stage.count), 1);
  const externalRedirectCount = apps.filter((app) => app.is_external_redirect).length;

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
    <div className="flex flex-col h-full overflow-y-auto bg-background p-5">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h2 className="text-[18px] font-bold text-foreground">{job.title}</h2>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
          {job.external_apply_url && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f0834a]/10 text-[#f0834a]">
              External Apply
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[12px] text-muted-foreground flex-wrap">
          <span>Posted {daysAgo}d ago</span>
          <span className="flex items-center gap-1"><Users size={12} /> {job.application_count} applicants</span>
          <span className="flex items-center gap-1"><Bookmark size={12} /> {job.save_count} saved</span>
          {externalRedirectCount > 0 && (
            <span className="text-[#f0834a]">{externalRedirectCount} external redirects tracked</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button
          type="button"
          onClick={() => router.push(`/jobs/pipeline?job=${job.slug}`)}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#0EA5E9] text-white text-[13px] font-medium border-0 cursor-pointer hover:brightness-110 transition-all"
        >
          View Pipeline <ArrowRight size={14} />
        </button>
        <button
          type="button"
          onClick={() => router.push(`/jobs/post?edit=${job.id}`)}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border bg-transparent text-foreground text-[13px] font-medium cursor-pointer hover:bg-foreground/5 transition-colors"
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

      {apps.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[13px] font-semibold text-foreground mb-3">Applicant Breakdown</h3>
          <div className="flex flex-col gap-2">
            {stageBreakdown.map(({ stage, color, count }) => (
              <div key={stage} className="flex items-center gap-3">
                <span className="text-[12px] text-muted-foreground w-[80px] capitalize">{stage}</span>
                <div className="flex-1 h-5 bg-card rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-300"
                    style={{
                      width: `${(count / maxCount) * 100}%`,
                      backgroundColor: `${color}30`,
                      minWidth: count > 0 ? "24px" : "0",
                    }}
                  />
                </div>
                <span className="text-[12px] text-foreground font-medium w-[24px] text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <details className="group">
        <summary className="text-[13px] font-semibold text-foreground cursor-pointer list-none flex items-center gap-2 mb-2">
          <span className="transition-transform group-open:rotate-90">{">"}</span>
          Job Description
        </summary>
        <div className="text-[13px] text-foreground/80 leading-relaxed break-words mt-2">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
              ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
              li: ({ children }) => <li>{children}</li>,
            }}
          >
            {job.description}
          </ReactMarkdown>
        </div>
      </details>

      {(job.custom_questions.length > 0 || job.external_apply_url) && (
        <div className="mt-6 flex flex-col gap-4">
          {job.custom_questions.length > 0 && (
            <div>
              <h3 className="text-[13px] font-semibold text-foreground mb-2">
                Screening Questions ({job.custom_questions.length})
              </h3>
              <div className="flex flex-col gap-2">
                {job.custom_questions.map((question) => (
                  <div key={question.id} className="rounded-lg border border-border bg-card px-3 py-2">
                    <p className="text-[12px] font-medium text-foreground">
                      {question.label}
                      {question.required && <span className="text-[#f06b6b]"> *</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Type: {question.type.replaceAll("_", " ")}
                      {question.options.length > 0 ? ` · Options: ${question.options.join(", ")}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {job.external_apply_url && (
            <div className="rounded-lg border border-[#f0834a]/20 bg-[#f0834a]/5 px-3 py-2">
              <p className="text-[12px] font-medium text-[#f0834a] mb-1">External application URL</p>
              <a
                href={job.external_apply_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-[#0EA5E9] break-all hover:underline"
              >
                {job.external_apply_url}
              </a>
            </div>
          )}
        </div>
      )}

      {confirmClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[400px] rounded-xl bg-card border border-border p-6 shadow-xl">
            <h3 className="text-[16px] font-semibold text-foreground mb-2">Close this job posting?</h3>
            <p className="text-[13px] text-muted-foreground mb-5 leading-relaxed">
              This will stop accepting new applications. Existing applications remain in your pipeline.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmClose(false)}
                className="h-9 px-4 rounded-lg border border-border bg-transparent text-foreground text-[13px] font-medium cursor-pointer hover:bg-foreground/5 transition-colors"
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
