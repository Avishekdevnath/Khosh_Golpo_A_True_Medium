"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Trash2,
  ExternalLink,
  MapPin,
  Wifi,
  ChevronDown,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
} from "lucide-react";
import ApplicationStatusBadge from "@/components/jobs/ApplicationStatusBadge";
import { useMyApplications } from "@/hooks/useJobs";
import { deleteMyApplication, TERMINAL_STAGES } from "@/lib/jobsApi";
import type { MyApplicationOut } from "@/lib/jobsApi";
import { useAuthStore } from "@/store/authStore";

const STAGE_ORDER = ["applied", "screening", "interview", "offer", "hired"] as const;

// ─── Stage Timeline ───────────────────────────────────────────────────────────

function StageTimeline({ app }: { app: MyApplicationOut }) {
  const reached = new Set(app.stage_history.map((h) => h.stage));
  const isRejected = app.stage === "rejected";
  const isWithdrawn = app.stage === "withdrawn";
  const isTerminal = isRejected || isWithdrawn;

  return (
    <div className="flex items-center mt-4">
      {STAGE_ORDER.map((s, i) => {
        const histEntry = app.stage_history.find((h) => h.stage === s);
        const isActive = app.stage === s && !isTerminal;
        const isDone = reached.has(s) && !isActive;
        const dotColor = isTerminal
          ? "bg-border"
          : isActive
          ? "bg-primary ring-4 ring-primary/20"
          : isDone
          ? "bg-[#3dd68c]"
          : "bg-border";
        const labelColor = isTerminal
          ? "text-muted-foreground/40"
          : isActive
          ? "text-primary"
          : isDone
          ? "text-[#3dd68c]"
          : "text-muted-foreground/40";
        const lineColor = isDone && !isTerminal ? "bg-[#3dd68c]/50" : "bg-border";

        return (
          <div key={s} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                title={histEntry ? new Date(histEntry.changed_at).toLocaleDateString() : undefined}
                className={`w-3 h-3 rounded-full transition-all ${dotColor}`}
              />
              <span className={`text-[9.5px] font-medium capitalize leading-none ${labelColor}`}>
                {s}
              </span>
            </div>
            {i < STAGE_ORDER.length - 1 && (
              <div className={`flex-1 h-px mx-1.5 mb-4 ${lineColor}`} />
            )}
          </div>
        );
      })}
      {isTerminal && (
        <span
          className={`ml-4 text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded-full ${
            isRejected
              ? "bg-[#f06b6b]/10 text-[#f06b6b]"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isRejected ? "Not selected" : "Withdrawn"}
        </span>
      )}
    </div>
  );
}

// ─── Application Card ─────────────────────────────────────────────────────────

function ApplicationCard({
  app,
  onDeleted,
}: {
  app: MyApplicationOut;
  onDeleted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const submittedOn = new Date(app.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleDelete = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm("Remove this application from your history? This cannot be undone.")) return;
      setDeleting(true);
      try {
        await deleteMyApplication(app.job_id);
        onDeleted();
      } finally {
        setDeleting(false);
      }
    },
    [app.job_id, onDeleted],
  );

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-sm">
      {/* Main row */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => e.key === "Enter" && setExpanded((v) => !v)}
        className="flex items-start gap-3 px-4 py-4 cursor-pointer hover:bg-foreground/[0.02] transition-colors"
        aria-expanded={expanded}
      >
        {/* Company logo */}
        <div className="w-10 h-10 rounded-xl bg-secondary border border-border shrink-0 flex items-center justify-center overflow-hidden mt-0.5">
          {app.company_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={app.company_logo_url}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="text-[14px] font-bold text-muted-foreground">
              {app.company_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-semibold text-foreground leading-snug">
              {app.job_title}
            </span>
            {app.job_deleted && (
              <span className="rounded-full bg-[#f06b6b]/10 px-2 py-0.5 text-[10px] font-medium text-[#f06b6b]">
                Job removed
              </span>
            )}
            {app.is_external_redirect && (
              <span className="rounded-full bg-[#f0834a]/10 px-2 py-0.5 text-[10px] font-medium text-[#f0834a]">
                External
              </span>
            )}
          </div>
          {/* Meta */}
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <span className="text-[12px] text-muted-foreground">{app.company_name}</span>
            {app.job_location && (
              <span className="flex items-center gap-0.5 text-[12px] text-muted-foreground">
                <MapPin size={10} />
                {app.job_location}
              </span>
            )}
            {app.job_is_remote && (
              <span className="flex items-center gap-0.5 text-[11px] text-[#3dd68c] font-medium">
                <Wifi size={10} /> Remote
              </span>
            )}
          </div>
          {/* Timeline */}
          <StageTimeline app={app} />
        </div>

        {/* Right side */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <ApplicationStatusBadge stage={app.stage} />
          <span className="text-[10.5px] text-muted-foreground">{submittedOn}</span>
          <ChevronDown
            size={14}
            className={`text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-border/60 px-4 pb-5 pt-4 space-y-4 bg-foreground/[0.01]">
          {/* Stage history */}
          {app.stage_history.length > 0 && (
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Stage History
              </p>
              <div className="space-y-1.5">
                {app.stage_history.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px]">
                    <ApplicationStatusBadge stage={h.stage} className="shrink-0" />
                    <span className="text-muted-foreground">
                      {new Date(h.changed_at).toLocaleString()}
                    </span>
                    {h.note && (
                      <span className="text-foreground/60 italic">"{h.note}"</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employer note */}
          {app.employer_note && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/15">
              <p className="text-[10.5px] font-semibold text-primary mb-1">Note from employer</p>
              <p className="text-[13px] text-foreground/80 leading-relaxed">{app.employer_note}</p>
            </div>
          )}

          {/* Cover letter */}
          {app.cover_letter && (
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Cover Letter
              </p>
              <p className="text-[12.5px] text-foreground/75 whitespace-pre-wrap leading-relaxed">
                {app.cover_letter}
              </p>
            </div>
          )}

          {/* Resume */}
          {app.resume_url && (
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Resume
              </p>
              <a
                href={app.resume_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] text-primary hover:underline"
              >
                View Resume <ExternalLink size={11} />
              </a>
            </div>
          )}

          {/* Posted by */}
          {app.poster_display_name && (
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Posted By
              </p>
              <p className="text-[12px] text-foreground/70">
                {app.poster_display_name}
                {app.poster_username && (
                  <span className="text-muted-foreground"> @{app.poster_username}</span>
                )}
              </p>
            </div>
          )}

          {/* Delete */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#f06b6b]/40 text-[#f06b6b] text-[12px] bg-transparent hover:bg-[#f06b6b]/10 cursor-pointer transition-colors disabled:opacity-50"
            >
              <Trash2 size={13} />
              {deleting ? "Removing..." : "Remove from history"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stats Card ───────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex-1 min-w-0 rounded-2xl border border-border bg-card px-4 py-3.5 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-[20px] font-bold text-foreground leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user === null) router.replace("/login?next=/jobs/applications");
  }, [user, router]);

  const { applications, isLoading, mutate } = useMyApplications();
  const apps = applications ?? [];

  const activeApps = apps.filter((app) => !TERMINAL_STAGES.includes(app.stage));
  const completedApps = apps.filter((app) => TERMINAL_STAGES.includes(app.stage));
  const hiredCount = apps.filter((a) => a.stage === "hired").length;
  const inInterviewCount = apps.filter((a) => a.stage === "interview" || a.stage === "offer").length;

  if (!user) return null;

  return (
    <div className="flex-1 overflow-y-auto">
      {isLoading ? (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card px-4 py-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/5 rounded-lg bg-secondary" />
                  <div className="h-3 w-1/4 rounded-lg bg-secondary opacity-60" />
                  <div className="h-2 w-full rounded-full bg-secondary opacity-40 mt-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
          <FileText size={36} strokeWidth={1.2} />
          <p className="text-[14px] font-medium text-foreground">No applications yet</p>
          <p className="text-[12px] text-muted-foreground">Start applying to track your progress here</p>
          <button
            type="button"
            onClick={() => router.push("/jobs")}
            className="mt-2 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium border-0 cursor-pointer hover:opacity-90 transition-opacity"
          >
            Browse Jobs
          </button>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Stats row */}
          <div className="flex gap-3 flex-wrap">
            <StatCard
              icon={<TrendingUp size={16} className="text-primary" />}
              label="Total Applied"
              value={apps.length}
              color="bg-primary/10"
            />
            <StatCard
              icon={<Clock size={16} className="text-[#f0834a]" />}
              label="In Progress"
              value={activeApps.length}
              color="bg-[#f0834a]/10"
            />
            <StatCard
              icon={<CheckCircle2 size={16} className="text-[#3dd68c]" />}
              label="Hired"
              value={hiredCount}
              color="bg-[#3dd68c]/10"
            />
            <StatCard
              icon={<XCircle size={16} className="text-[#7c73f0]" />}
              label="Interviews"
              value={inInterviewCount}
              color="bg-[#7c73f0]/10"
            />
          </div>

          {/* Active applications */}
          {activeApps.length > 0 && (
            <section>
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Active · {activeApps.length}
              </h2>
              <div className="space-y-3">
                {activeApps.map((app) => (
                  <ApplicationCard key={app.id} app={app} onDeleted={() => mutate()} />
                ))}
              </div>
            </section>
          )}

          {/* Completed applications */}
          {completedApps.length > 0 && (
            <section>
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Completed · {completedApps.length}
              </h2>
              <div className="space-y-3">
                {completedApps.map((app) => (
                  <ApplicationCard key={app.id} app={app} onDeleted={() => mutate()} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
