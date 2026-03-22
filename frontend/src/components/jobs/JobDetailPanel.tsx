"use client";

import { useState } from "react";
import {
  MapPin, Globe, Briefcase, Calendar, Users, Flag, Bookmark, BookmarkCheck, CheckCircle2,
} from "lucide-react";
import type { JobPostOut } from "@/lib/jobsApi";
import { saveJob, unsaveJob } from "@/lib/jobsApi";
import { useAuthStore } from "@/store/authStore";
import JobApplyModal from "./JobApplyModal";
import JobReportModal from "./JobReportModal";

interface Props {
  job: JobPostOut;
  onApplied?: () => void;
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

export default function JobDetailPanel({ job, onApplied }: Props) {
  const { user } = useAuthStore();
  const [applyOpen, setApplyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [saved, setSaved] = useState(job.is_saved);
  const [applied, setApplied] = useState(job.has_applied);
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

  const salaryText =
    job.salary_visible && (job.salary_min || job.salary_max)
      ? job.salary_min && job.salary_max
        ? `${job.salary_currency} ${job.salary_min.toLocaleString()} – ${job.salary_max.toLocaleString()}`
        : job.salary_min
        ? `${job.salary_currency} ${job.salary_min.toLocaleString()}+`
        : `Up to ${job.salary_currency} ${job.salary_max?.toLocaleString()}`
      : null;

  const deadline = job.application_deadline
    ? new Date(job.application_deadline).toLocaleDateString()
    : null;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#10131d]">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1e2235] border border-[#0EA5E9]/30 text-white text-[13px] px-4 py-2.5 rounded-full shadow-lg">
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

      <div className="p-5 border-b border-[#1e2235]">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          {job.company_logo_url ? (
            <img
              src={job.company_logo_url}
              alt={job.company_name}
              className="w-14 h-14 rounded-xl object-cover bg-[#1e2235] flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-[#1e2235] flex items-center justify-center flex-shrink-0">
              <Briefcase size={24} className="text-[#8b95a1]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] font-bold text-white leading-tight">{job.title}</h1>
            <p className="text-[14px] text-[#0EA5E9] mt-0.5">{job.company_name}</p>
            {job.poster && (
              <p className="text-[12px] text-[#8b95a1] mt-0.5">
                Posted by @{job.poster.username}
              </p>
            )}
          </div>
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-2 text-[12px] mb-4">
          {job.location && (
            <span className="flex items-center gap-1 text-[#8b95a1]">
              <MapPin size={12} /> {job.location}
            </span>
          )}
          {job.is_remote && (
            <span className="bg-[#3dd68c]/10 text-[#3dd68c] px-2 py-0.5 rounded-full">Remote</span>
          )}
          <span className="bg-[#1e2235] text-[#c5ccd6] px-2 py-0.5 rounded-full">
            {JOB_TYPE_LABELS[job.job_type]}
          </span>
          <span className="bg-[#1e2235] text-[#c5ccd6] px-2 py-0.5 rounded-full">
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
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-[12px] text-[#8b95a1] mb-4">
          <span className="flex items-center gap-1">
            <Users size={13} /> {job.application_count} applicants
          </span>
          <span className="flex items-center gap-1">
            <Bookmark size={13} /> {job.save_count} saved
          </span>
        </div>

        {/* Actions */}
        {user && (
          <div className="flex items-center gap-2">
            {applied ? (
              <span className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#3dd68c] bg-[#3dd68c]/10 border border-[#3dd68c]/30 rounded-lg">
                <CheckCircle2 size={15} /> Applied
              </span>
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
                  : "border-[#1e2235] text-[#8b95a1] hover:border-[#0EA5E9]/30 hover:text-[#0EA5E9]"
              }`}
            >
              {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
              {saved ? "Saved" : "Save"}
            </button>
            <button
              onClick={() => setReportOpen(true)}
              className="ml-auto p-2 text-[#8b95a1] hover:text-[#f06b6b] transition-colors"
              title="Report this job"
            >
              <Flag size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="p-5">
        <h2 className="text-[14px] font-semibold text-white mb-3">Job Description</h2>
        <div className="text-[13px] text-[#c5ccd6] leading-relaxed whitespace-pre-wrap">
          {job.description}
        </div>

        {/* Skills */}
        {job.required_skills.length > 0 && (
          <div className="mt-5">
            <h3 className="text-[13px] font-semibold text-white mb-2">Required Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {job.required_skills.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 bg-[#0EA5E9]/10 text-[#0EA5E9] border border-[#0EA5E9]/20 rounded text-[12px]"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {job.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {job.tags.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 bg-[#1e2235] text-[#8b95a1] rounded text-[11px]"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
