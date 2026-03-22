"use client";

import { useState } from "react";
import { ChevronRight, User, FileText, Loader2 } from "lucide-react";
import type { ApplicationOut, ApplicationStage } from "@/lib/jobsApi";
import { moveApplicationStage } from "@/lib/jobsApi";
import ApplicationStatusBadge from "./ApplicationStatusBadge";

const PIPELINE_STAGES: ApplicationStage[] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
];

const STAGE_TRANSITIONS: Record<ApplicationStage, ApplicationStage[]> = {
  applied: ["screening", "rejected"],
  screening: ["interview", "rejected"],
  interview: ["offer", "rejected"],
  offer: ["hired", "rejected"],
  hired: [],
  rejected: [],
  withdrawn: [],
};

interface Props {
  jobId: string;
  applications: ApplicationOut[];
  onMoved?: () => void;
}

export default function ApplicationPipelineBoard({ jobId, applications, onMoved }: Props) {
  const [selected, setSelected] = useState<ApplicationOut | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const byStage = PIPELINE_STAGES.reduce<Record<string, ApplicationOut[]>>(
    (acc, s) => ({ ...acc, [s]: [] }),
    {},
  );
  byStage.rejected = [];
  for (const a of applications) {
    if (byStage[a.stage]) byStage[a.stage].push(a);
    else byStage.rejected.push(a);
  }

  async function doMove(app: ApplicationOut, stage: ApplicationStage) {
    setMoving(app.id);
    setError(null);
    try {
      await moveApplicationStage(jobId, app.id, stage, note || undefined);
      setNote("");
      setSelected(null);
      onMoved?.();
    } catch {
      setError("Failed to move application");
    } finally {
      setMoving(null);
    }
  }

  const allStages = [...PIPELINE_STAGES, "rejected" as ApplicationStage];

  return (
    <div className="flex flex-col h-full">
      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto p-4 pb-0 min-h-0">
        {allStages.map((stage) => {
          const apps = byStage[stage] ?? [];
          return (
            <div key={stage} className="flex flex-col gap-2 min-w-[200px] max-w-[220px]">
              <div className="flex items-center justify-between mb-1">
                <ApplicationStatusBadge stage={stage} />
                <span className="text-[11px] text-[#8b95a1]">{apps.length}</span>
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[480px] pr-1">
                {apps.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => setSelected(selected?.id === app.id ? null : app)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all text-[12px] ${
                      selected?.id === app.id
                        ? "border-[#0EA5E9]/50 bg-[#151927]"
                        : "border-[#1e2235] bg-[#10131d] hover:border-[#0EA5E9]/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-[#1e2235] flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {app.applicant?.avatar_url ? (
                          <img src={app.applicant.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <User size={12} className="text-[#8b95a1]" />
                        )}
                      </div>
                      <span className="font-medium text-white truncate">
                        {app.applicant?.display_name ?? "Unknown"}
                      </span>
                    </div>
                    {app.applicant?.headline && (
                      <p className="text-[#8b95a1] truncate">{app.applicant.headline}</p>
                    )}
                    {app.resume_url && (
                      <a
                        href={app.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 mt-1 text-[#0EA5E9] hover:underline"
                      >
                        <FileText size={10} /> Resume
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="border-t border-[#1e2235] p-4 bg-[#10131d] flex-shrink-0">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-white">
                {selected.applicant?.display_name}
              </p>
              {selected.cover_letter && (
                <p className="text-[12px] text-[#8b95a1] mt-1 line-clamp-2">{selected.cover_letter}</p>
              )}
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <input
                type="text"
                placeholder="Add a note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="px-2 py-1.5 bg-[#151927] border border-[#1e2235] rounded text-[12px] text-white placeholder-[#8b95a1] focus:outline-none focus:border-[#0EA5E9]/50 w-40"
              />
              <div className="flex flex-wrap gap-1">
                {STAGE_TRANSITIONS[selected.stage].map((nextStage) => (
                  <button
                    key={nextStage}
                    onClick={() => doMove(selected, nextStage)}
                    disabled={moving === selected.id}
                    className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded border transition-colors ${
                      nextStage === "rejected"
                        ? "border-[#f06b6b]/30 text-[#f06b6b] hover:bg-[#f06b6b]/10"
                        : nextStage === "hired"
                        ? "border-[#3dd68c]/30 text-[#3dd68c] hover:bg-[#3dd68c]/10"
                        : "border-[#0EA5E9]/30 text-[#0EA5E9] hover:bg-[#0EA5E9]/10"
                    } disabled:opacity-50`}
                  >
                    {moving === selected.id ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <ChevronRight size={10} />
                    )}
                    {nextStage.charAt(0).toUpperCase() + nextStage.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {error && <p className="text-[12px] text-[#f06b6b] mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
}
