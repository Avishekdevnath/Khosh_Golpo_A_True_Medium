"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, Briefcase, MapPin, Clock } from "lucide-react";
import type { JobPostOut } from "@/lib/jobsApi";
import { saveJob, unsaveJob } from "@/lib/jobsApi";
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

function formatCompact(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return k % 1 === 0 ? `${k}K` : `${parseFloat(k.toFixed(1))}K`;
  }
  return `${n}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

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

  const salaryText = (() => {
    if (!job.salary_visible) return null;
    const min = job.salary_min;
    const max = job.salary_max;
    if (!min && !max) return "Negotiable";
    const currency = job.salary_currency;
    if (min && max) {
      const formattedMin = formatCompact(min);
      const formattedMax = formatCompact(max);
      return formattedMin === formattedMax
        ? `${currency} ${formattedMax}`
        : `${currency} ${formattedMin}–${formattedMax}`;
    }
    if (min) return `${currency} ${formatCompact(min)}+`;
    return `Up to ${currency} ${formatCompact(max!)}`;
  })();

  return (
    <div
      onClick={onClick}
      className={[
        "group relative flex flex-col gap-3.5 px-5 py-5 cursor-pointer transition-all duration-150",
        "border-b border-border",
        selected
          ? "bg-primary/[0.04] border-l-2 border-l-primary"
          : "hover:bg-secondary/60 border-l-2 border-l-transparent",
      ].join(" ")}
    >
      {/* Row 1: title + save */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[15.5px] font-semibold text-foreground leading-snug line-clamp-2 flex-1">
          {job.title}
        </h3>
        {user && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
            title={saved ? "Unsave" : "Save"}
          >
            {saved
              ? <BookmarkCheck size={15} className="text-primary" />
              : <Bookmark size={15} />}
          </button>
        )}
      </div>

      {/* Row 2: logo + company + time */}
      <div className="flex items-center gap-2.5 min-w-0">
        {job.company_logo_url ? (
          <img
            src={job.company_logo_url}
            alt={job.company_name}
            className="w-8 h-8 rounded-lg object-cover shrink-0 border border-border bg-secondary"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; (e.currentTarget.nextSibling as HTMLElement).style.display = "flex"; }}
          />
        ) : null}
        {(!job.company_logo_url) && (
          <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0 text-[11px] font-bold text-muted-foreground uppercase">
            {job.company_name?.charAt(0) ?? <Briefcase size={14} />}
          </div>
        )}
        <span className="text-[13px] font-medium text-primary truncate">{job.company_name}</span>
        {job.created_at && (
          <span className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground/60 shrink-0">
            <Clock size={10} />
            {timeAgo(job.created_at)}
          </span>
        )}
      </div>

      {/* Row 3: meta tags + salary on right */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {job.location && (
            <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
              <MapPin size={11} />
              {job.location}
            </span>
          )}
          {job.location && <span className="text-border">·</span>}
          {job.is_remote && (
            <span className="text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Remote
            </span>
          )}
          <span className="text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
            {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
          </span>
          <span className="text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
            {EXP_LABELS[job.experience_level] ?? job.experience_level}
          </span>
          {job.external_apply_url && (
            <span className="text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
              External
            </span>
          )}
          {job.has_applied && (
            <span className="text-[11px] font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              {job.external_apply_url ? "✓ Redirected" : "✓ Applied"}
            </span>
          )}
        </div>
        {salaryText && (
          <span className="shrink-0 text-[13px] font-semibold text-emerald-500">{salaryText}</span>
        )}
      </div>
    </div>
  );
}
