"use client";

import { Bookmark, BookmarkCheck, MapPin, Clock, Briefcase } from "lucide-react";
import type { JobPostOut } from "@/lib/jobsApi";
import { saveJob, unsaveJob } from "@/lib/jobsApi";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

const EXP_LABELS: Record<string, string> = {
  entry: "Entry",
  mid: "Mid-level",
  senior: "Senior",
  lead: "Lead",
};

interface Props {
  job: JobPostOut;
  selected?: boolean;
  onClick?: () => void;
  onSaveToggle?: (saved: boolean) => void;
}

export default function JobCard({ job, selected = false, onClick, onSaveToggle }: Props) {
  const { user } = useAuthStore();
  const [saved, setSaved] = useState(job.is_saved);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) return;
    setSaving(true);
    try {
      if (saved) {
        await unsaveJob(job.id);
        setSaved(false);
        onSaveToggle?.(false);
      } else {
        await saveJob(job.id);
        setSaved(true);
        onSaveToggle?.(true);
      }
    } finally {
      setSaving(false);
    }
  }

  const salaryText =
    job.salary_visible && (job.salary_min || job.salary_max)
      ? job.salary_min && job.salary_max
        ? `${job.salary_currency} ${(job.salary_min / 1000).toFixed(0)}k–${(job.salary_max / 1000).toFixed(0)}k`
        : job.salary_min
        ? `${job.salary_currency} ${(job.salary_min / 1000).toFixed(0)}k+`
        : null
      : null;

  return (
    <div
      onClick={onClick}
      className={`
        group relative flex flex-col gap-3 px-4 py-4 cursor-pointer transition-all
        border-b border-border
        ${selected
          ? "bg-card-hover border-l-2 border-l-[#0EA5E9] shadow-[0_0_20px_rgba(14,165,233,0.08)]"
          : "hover:bg-card/60 border-l-2 border-l-transparent hover:-translate-y-px hover:shadow-md"
        }
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {job.company_logo_url ? (
            <img
              src={job.company_logo_url}
              alt={job.company_name}
              className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-border"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-border flex items-center justify-center flex-shrink-0">
              <Briefcase size={16} className="text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[#0EA5E9] truncate">{job.company_name}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {job.poster?.display_name ?? "Unknown"}
            </p>
          </div>
        </div>
        {user && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-shrink-0 p-1 text-muted-foreground hover:text-[#0EA5E9] transition-colors opacity-0 group-hover:opacity-100"
            title={saved ? "Unsave" : "Save"}
          >
            {saved ? <BookmarkCheck size={16} className="text-[#0EA5E9]" /> : <Bookmark size={16} />}
          </button>
        )}
      </div>

      <div>
        <h3 className="text-[15px] font-semibold text-foreground leading-snug line-clamp-2">
          {job.title}
        </h3>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
        {job.location && (
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {job.location}
          </span>
        )}
        {job.is_remote && (
          <span className="bg-[#3dd68c]/10 text-[#3dd68c] px-1.5 py-0.5 rounded text-[11px]">
            Remote
          </span>
        )}
        <span className="bg-border px-1.5 py-0.5 rounded text-[11px]">
          {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
        </span>
        <span className="bg-border px-1.5 py-0.5 rounded text-[11px]">
          {EXP_LABELS[job.experience_level] ?? job.experience_level}
        </span>
        {salaryText && (
          <span className="text-[#3dd68c] font-medium">{salaryText}</span>
        )}
      </div>

      {job.has_applied && (
        <span className="text-[11px] text-[#3dd68c] font-medium">✓ Applied</span>
      )}
    </div>
  );
}
