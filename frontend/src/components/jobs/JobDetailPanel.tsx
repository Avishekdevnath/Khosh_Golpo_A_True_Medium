"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Calendar,
  CheckCircle2,
  Flag,
  Globe,
  MapPin,
  Users,
  X,
} from "lucide-react";
import type { JobPostOut } from "@/lib/jobsApi";
import { redirectToJob, saveJob, unsaveJob } from "@/lib/jobsApi";
import { useAuthStore } from "@/store/authStore";
import JobApplyModal from "./JobApplyModal";
import JobReportModal from "./JobReportModal";

interface Props {
  job: JobPostOut;
  onApplied?: () => void;
  onClose?: () => void;
}

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

const EXP_LABELS: Record<string, string> = {
  entry: "Entry Level",
  mid: "Mid-level",
  senior: "Senior",
  lead: "Lead",
};

export default function JobDetailPanel({ job, onApplied, onClose }: Props) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [applyOpen, setApplyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [saved, setSaved] = useState(job.is_saved);
  const [applied, setApplied] = useState(job.has_applied);
  const [redirecting, setRedirecting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function toggleSave() {
    if (!user) return;
    if (saved) {
      await unsaveJob(job.id);
      setSaved(false);
    } else {
      await saveJob(job.id);
      setSaved(true);
    }
  }

  function handleRedirect() {
    if (!job.external_apply_url) return;
    setRedirecting(true);
    redirectToJob(job.id).catch(() => undefined);
    window.open(job.external_apply_url, "_blank", "noopener,noreferrer");
    setApplied(true);
    onApplied?.();
    showToast("Opened the company application page.");
    setRedirecting(false);
  }

  const salaryText = (() => {
    if (!job.salary_visible) return null;
    const min = job.salary_min;
    const max = job.salary_max;
    if (!min && !max) return "Negotiable";
    if (min && max) {
      return `${job.salary_currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
    }
    if (min) return `${job.salary_currency} ${min.toLocaleString()}+`;
    return `Up to ${job.salary_currency} ${max?.toLocaleString()}`;
  })();

  const deadline = job.application_deadline
    ? new Date(job.application_deadline).toLocaleDateString()
    : null;

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Workspace top bar — only shown when onClose is provided (inline Col 3 context) */}
      {onClose && (
        <div className="flex items-center justify-end gap-1 px-3 h-10 border-b border-border shrink-0 sticky top-0 bg-background z-10">
          <button
            type="button"
            onClick={() => router.push(`/jobs/${job.slug}`)}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-[#1e2235] border border-transparent hover:border-border transition-colors"
          >
            View Full Page
            <ArrowUpRight size={12} />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-[#1e2235] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-border border border-[#0EA5E9]/30 text-white text-[13px] px-4 py-2.5 rounded-full shadow-lg">
          {toast}
        </div>
      )}

      {applyOpen && (
        <JobApplyModal
          job={job}
          onClose={() => setApplyOpen(false)}
          onApplied={() => {
            setApplyOpen(false);
            setApplied(true);
            onApplied?.();
            showToast("Application submitted!");
          }}
        />
      )}

      {reportOpen && (
        <JobReportModal
          job={job}
          onClose={() => setReportOpen(false)}
          onReported={() => {
            setReportOpen(false);
            showToast("Report submitted. Thank you.");
          }}
        />
      )}

      <div className="p-5 border-b border-border">
        <div className="flex items-start gap-3 mb-4">
          {job.company_logo_url ? (
            <img
              src={job.company_logo_url}
              alt={job.company_name}
              className="w-14 h-14 rounded-xl object-cover bg-border flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-border flex items-center justify-center flex-shrink-0">
              <Briefcase size={24} className="text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] font-bold text-foreground leading-tight">{job.title}</h1>
            <p className="text-[14px] text-[#0EA5E9] mt-0.5">{job.company_name}</p>
            {job.poster && (
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Posted by @{job.poster.username}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-[12px] mb-4">
          {job.location && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin size={12} /> {job.location}
            </span>
          )}
          {job.is_remote && (
            <span className="bg-[#3dd68c]/10 text-[#3dd68c] px-2 py-0.5 rounded-full">Remote</span>
          )}
          <span className="bg-border text-foreground/80 px-2 py-0.5 rounded-full">
            {JOB_TYPE_LABELS[job.job_type]}
          </span>
          <span className="bg-border text-foreground/80 px-2 py-0.5 rounded-full">
            {EXP_LABELS[job.experience_level]}
          </span>
          {salaryText && (
            <span className="bg-[#3dd68c]/10 text-[#3dd68c] px-2 py-0.5 rounded-full font-medium">
              {salaryText}
            </span>
          )}
          {deadline && (
            <span className="flex items-center gap-1 text-[#f0834a]">
              <Calendar size={12} /> Deadline: {deadline}
            </span>
          )}
          {job.external_apply_url && (
            <span className="bg-[#f0834a]/10 text-[#f0834a] px-2 py-0.5 rounded-full font-medium">
              External Apply
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-[12px] text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Users size={13} /> {job.application_count} applicants
          </span>
          <span className="flex items-center gap-1">
            <Bookmark size={13} /> {job.save_count} saved
          </span>
        </div>

        {!user && (
          <div className="flex items-center justify-between px-4 py-2.5 mt-3 rounded-lg bg-[#0EA5E9]/5 border border-[#0EA5E9]/20">
            <span className="text-[13px] text-muted-foreground">Sign in to apply or save jobs</span>
            <Link
              href="/login"
              className="text-[13px] font-medium text-[#0EA5E9] no-underline hover:underline"
            >
              Sign In
            </Link>
          </div>
        )}

        {user && (
          <div className="flex items-center gap-2">
            {applied ? (
              <span className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#3dd68c] bg-[#3dd68c]/10 border border-[#3dd68c]/30 rounded-lg">
                <CheckCircle2 size={15} />
                {job.external_apply_url ? "Redirected" : "Applied"}
              </span>
            ) : job.external_apply_url ? (
              <button
                onClick={handleRedirect}
                disabled={redirecting}
                className="flex items-center gap-2 px-5 py-2 text-[13px] font-medium bg-[#f0834a] text-white rounded-lg hover:bg-[#f0834a]/90 disabled:opacity-60 transition-colors"
              >
                <Globe size={15} />
                {redirecting ? "Opening..." : "Apply on Company Site"}
              </button>
            ) : (
              <button
                onClick={() => setApplyOpen(true)}
                className="px-5 py-2 text-[13px] font-medium bg-[#0EA5E9] text-white rounded-lg hover:bg-[#0EA5E9]/90 transition-colors"
              >
                Apply Now
              </button>
            )}
            <button
              onClick={toggleSave}
              className={`flex items-center gap-1.5 px-3 py-2 text-[13px] border rounded-lg transition-colors ${
                saved
                  ? "border-[#0EA5E9]/40 text-[#0EA5E9]"
                  : "border-border text-muted-foreground hover:border-[#0EA5E9]/30 hover:text-[#0EA5E9]"
              }`}
            >
              {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
              {saved ? "Saved" : "Save"}
            </button>
            <button
              onClick={() => setReportOpen(true)}
              className="ml-auto p-2 text-muted-foreground hover:text-[#f06b6b] transition-colors"
              title="Report this job"
            >
              <Flag size={15} />
            </button>
          </div>
        )}
      </div>

      <div className="p-5">
        <h2 className="text-[14px] font-semibold text-foreground mb-3">Job Description</h2>
        <div className="text-[13px] text-foreground/80 leading-relaxed break-words prose-jobs">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
              ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
              li: ({ children }) => <li>{children}</li>,
              h1: ({ children }) => <h1 className="text-[15px] font-semibold text-foreground mb-2 mt-4">{children}</h1>,
              h2: ({ children }) => <h2 className="text-[14px] font-semibold text-foreground mb-2 mt-4">{children}</h2>,
              h3: ({ children }) => <h3 className="text-[13px] font-semibold text-foreground mb-1.5 mt-3">{children}</h3>,
              a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>,
              code: ({ children }) => <code className="bg-border px-1 py-0.5 rounded text-[12px] font-mono">{children}</code>,
              hr: () => <hr className="border-border my-4" />,
            }}
          >
            {job.description}
          </ReactMarkdown>
        </div>

        {job.external_apply_url && (
          <div className="mt-4 rounded-lg border border-[#f0834a]/20 bg-[#f0834a]/5 px-3 py-2">
            <p className="text-[12px] text-[#f0834a]">
              Applications for this role are handled on the company&apos;s careers site.
            </p>
          </div>
        )}

        {job.required_skills.length > 0 && (
          <div className="mt-5">
            <h3 className="text-[13px] font-semibold text-foreground mb-2">Required Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {job.required_skills.map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 bg-[#0EA5E9]/10 text-[#0EA5E9] border border-[#0EA5E9]/20 rounded text-[12px]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {job.custom_questions.length > 0 && (
          <div className="mt-5">
            <h3 className="text-[13px] font-semibold text-foreground mb-2">Application Questions</h3>
            <div className="flex flex-col gap-2">
              {job.custom_questions.map((question) => (
                <div key={question.id} className="rounded-lg border border-border bg-secondary/40 px-3 py-2">
                  <p className="text-[12px] font-medium text-foreground">
                    {question.label}
                    {question.required && <span className="text-[#f06b6b]"> *</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {question.type === "short_text" && "Short text response"}
                    {question.type === "url" && "URL response"}
                    {question.type === "yes_no" && "Yes or no"}
                    {question.type === "single_select" && `Choose one: ${question.options.join(", ")}`}
                    {question.type === "multi_select" && `Choose any: ${question.options.join(", ")}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {job.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {job.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-border text-muted-foreground rounded text-[11px]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
