"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, ChevronDown, ChevronUp, Trash2, ExternalLink, MapPin, Wifi } from "lucide-react";
import ApplicationStatusBadge from "@/components/jobs/ApplicationStatusBadge";
import { useMyApplications } from "@/hooks/useJobs";
import { deleteMyApplication, TERMINAL_STAGES } from "@/lib/jobsApi";
import type { MyApplicationOut } from "@/lib/jobsApi";
import { useAuthStore } from "@/store/authStore";

const STAGE_ORDER = ["applied", "screening", "interview", "offer", "hired"] as const;

function StageTimeline({ app }: { app: MyApplicationOut }) {
  const reached = new Set(app.stage_history.map((h) => h.stage));
  const isRejected = app.stage === "rejected";
  const isWithdrawn = app.stage === "withdrawn";

  return (
    <div className="flex items-center gap-0 mt-3">
      {STAGE_ORDER.map((s, i) => {
        const histEntry = app.stage_history.find((h) => h.stage === s);
        const isActive = app.stage === s;
        const isDone = reached.has(s) && !isActive;
        return (
          <div key={s} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-0.5">
              <div
                title={histEntry ? new Date(histEntry.changed_at).toLocaleDateString() : undefined}
                className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
                  isRejected || isWithdrawn
                    ? "bg-border"
                    : isActive
                    ? "bg-[#0EA5E9] ring-2 ring-[#0EA5E9]/30"
                    : isDone
                    ? "bg-[#3dd68c]"
                    : "bg-border"
                }`}
              />
              <span
                className={`text-[9px] capitalize ${
                  isActive
                    ? "text-[#0EA5E9]"
                    : isDone
                    ? "text-[#3dd68c]"
                    : "text-muted-foreground/40"
                }`}
              >
                {s}
              </span>
            </div>
            {i < STAGE_ORDER.length - 1 && (
              <div
                className={`flex-1 h-px mx-1 mb-3 ${isDone ? "bg-[#3dd68c]/40" : "bg-border"}`}
              />
            )}
          </div>
        );
      })}
      {(isRejected || isWithdrawn) && (
        <span
          className={`ml-3 text-[10px] font-medium shrink-0 ${
            isRejected ? "text-[#f06b6b]" : "text-muted-foreground"
          }`}
        >
          {isRejected ? "Not selected" : "Withdrawn"}
        </span>
      )}
    </div>
  );
}

function ApplicationRow({
  app,
  onDeleted,
}: {
  app: MyApplicationOut;
  onDeleted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const submittedOn = new Date(app.created_at).toLocaleDateString();

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
    <div className="border-b border-border">
      {/* Header row */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => e.key === "Enter" && setExpanded((v) => !v)}
        className="flex items-start gap-3 px-5 py-4 hover:bg-foreground/[0.02] transition-colors cursor-pointer"
      >
        {/* Company logo */}
        <div className="w-9 h-9 rounded-lg bg-secondary border border-border shrink-0 flex items-center justify-center overflow-hidden mt-0.5">
          {app.company_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={app.company_logo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[13px] font-bold text-muted-foreground">
              {app.company_name.charAt(0)}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-semibold text-foreground">{app.job_title}</span>
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
          <div className="text-[12px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{app.company_name}</span>
            {app.job_location && (
              <span className="flex items-center gap-0.5">
                <MapPin size={10} />
                {app.job_location}
              </span>
            )}
            {app.job_is_remote && (
              <span className="flex items-center gap-0.5 text-[#3dd68c]">
                <Wifi size={10} /> Remote
              </span>
            )}
            <span>· Submitted {submittedOn}</span>
          </div>
          <StageTimeline app={app} />
        </div>

        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <ApplicationStatusBadge stage={app.stage} />
          {expanded ? (
            <ChevronUp size={14} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={14} className="text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 bg-foreground/[0.01] border-t border-border/50">
          {/* Stage history */}
          {app.stage_history.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Stage History
              </p>
              <div className="space-y-1.5">
                {app.stage_history.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-[12px]">
                    <ApplicationStatusBadge stage={h.stage} className="mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">
                      {new Date(h.changed_at).toLocaleString()}
                    </span>
                    {h.note && (
                      <span className="text-foreground/70 italic">"{h.note}"</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employer note */}
          {app.employer_note && (
            <div className="mt-4 p-3 rounded-lg bg-[#0EA5E9]/5 border border-[#0EA5E9]/20">
              <p className="text-[11px] font-semibold text-[#0EA5E9] mb-1">Note from employer</p>
              <p className="text-[13px] text-foreground/80">{app.employer_note}</p>
            </div>
          )}

          {/* Cover letter */}
          {app.cover_letter && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Cover Letter
              </p>
              <p className="text-[13px] text-foreground/80 whitespace-pre-wrap leading-relaxed">
                {app.cover_letter}
              </p>
            </div>
          )}

          {/* Resume link */}
          {app.resume_url && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Resume
              </p>
              <a
                href={app.resume_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[12px] text-[#0EA5E9] hover:underline"
              >
                View Resume <ExternalLink size={11} />
              </a>
            </div>
          )}

          {/* Posted by */}
          {app.poster_display_name && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
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
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#f06b6b]/40 text-[#f06b6b] text-[12px] bg-transparent hover:bg-[#f06b6b]/10 cursor-pointer transition-colors disabled:opacity-50"
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

  if (!user) return null;

  return (
    <div className="flex-1 overflow-y-auto">
      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-[13px] text-muted-foreground">
          Loading...
        </div>
      ) : apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3 mt-16">
          <FileText size={32} strokeWidth={1.2} />
          <p className="text-[13px]">No applications yet</p>
          <button
            type="button"
            onClick={() => router.push("/jobs")}
            className="text-[12px] text-[#0EA5E9] border-0 bg-transparent cursor-pointer hover:underline"
          >
            Browse Jobs
          </button>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto py-6">
          {activeApps.length > 0 && (
            <div className="mb-8">
              <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-5 mb-2">
                Active ({activeApps.length})
              </h2>
              {activeApps.map((app) => (
                <ApplicationRow key={app.id} app={app} onDeleted={() => mutate()} />
              ))}
            </div>
          )}
          {completedApps.length > 0 && (
            <div>
              <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-5 mb-2">
                Completed ({completedApps.length})
              </h2>
              {completedApps.map((app) => (
                <ApplicationRow key={app.id} app={app} onDeleted={() => mutate()} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
