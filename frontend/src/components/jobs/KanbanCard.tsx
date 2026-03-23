"use client";

import { useState } from "react";
import { ChevronDown, FileText, User } from "lucide-react";
import { STAGE_TRANSITIONS, TERMINAL_STAGES } from "@/lib/jobsApi";
import type { ApplicationOut, ApplicationStage, CustomQuestion } from "@/lib/jobsApi";
import { formatScreeningAnswer } from "@/lib/jobApplicationFlow";
import { avatarSeed, initials } from "@/lib/workspaceUtils";
import ApplicationStatusBadge from "./ApplicationStatusBadge";

interface Props {
  application: ApplicationOut;
  onMoveStage: (newStage: ApplicationStage, note?: string) => void;
  onViewProfile: (userId: string) => void;
  isMoving?: boolean;
  customQuestions?: CustomQuestion[];
}

export default function KanbanCard({ application, onMoveStage, onViewProfile, isMoving, customQuestions = [] }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const applicant = application.applicant;
  const name = applicant?.display_name ?? applicant?.username ?? "Unknown";
  const username = applicant?.username ?? "";
  const [avatarStart, avatarEnd] = avatarSeed(application.applicant_id);

  const submittedOn = new Date(application.created_at).toLocaleDateString();
  const transitionCount = (application.stage_history?.length ?? 1) - 1;

  const isTerminal = TERMINAL_STAGES.includes(application.stage);
  const nextStages = STAGE_TRANSITIONS[application.stage] ?? [];
  const answerEntries = Object.entries(application.custom_answers ?? {});

  return (
    <div
      className={[
        "rounded-lg border p-3 mb-2 transition-opacity duration-200",
        application.is_external_redirect
          ? "bg-[#f0834a]/5 border-[#f0834a]/20"
          : "bg-card-hover border-border",
        isMoving ? "opacity-30" : "opacity-100",
      ].join(" ")}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <span
          className="w-8 h-8 rounded-full grid place-items-center text-[10px] font-bold text-white shrink-0"
          style={{ background: `linear-gradient(135deg,${avatarStart},${avatarEnd})` }}
        >
          {initials(name)}
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-foreground truncate">{name}</div>
          {username && <div className="text-[11px] text-muted-foreground truncate">@{username}</div>}
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground mb-2.5">
        Submitted {submittedOn}{transitionCount > 0 ? ` · ${transitionCount} moves` : ""}
      </div>

      {application.is_external_redirect && (
        <div className="mb-2 rounded-md bg-[#f0834a]/10 px-2 py-1 text-[11px] text-[#f0834a]">
          Applied via external company site
        </div>
      )}

      {application.resume_url && (
        <a
          href={application.resume_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-[#0EA5E9] hover:underline mb-2"
        >
          <FileText size={11} />
          Resume
        </a>
      )}

      {answerEntries.length > 0 && (
        <div className="mb-3 flex flex-col gap-1.5 rounded-md bg-card border border-border px-2.5 py-2">
          <div className="text-[11px] font-medium text-foreground">Screening Answers</div>
          {answerEntries.map(([key, value]) => (
            <div key={key} className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {customQuestions.find((q) => q.id === key)?.label ?? key}
              </span>
              <span className="text-[11px] text-foreground/85 break-words">
                {formatScreeningAnswer(value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {isTerminal ? (
        <ApplicationStatusBadge stage={application.stage} />
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((value) => !value)}
            disabled={isMoving}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-transparent text-[11px] text-muted-foreground hover:text-foreground hover:border-border/80 cursor-pointer transition-colors disabled:opacity-50 w-full justify-between"
          >
            Move <ChevronDown size={12} />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-full rounded-lg bg-card border border-border shadow-xl z-20 py-1">
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onViewProfile(application.applicant_id);
                }}
                className="w-full text-left px-3 py-1.5 text-[12px] text-foreground hover:bg-foreground/5 cursor-pointer border-0 bg-transparent"
              >
                <User size={12} className="inline mr-1.5" />
                View Profile
              </button>
              <div className="h-px bg-border my-1" />
              {nextStages.map((stage) => (
                <button
                  key={stage}
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    onMoveStage(stage);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-foreground/5 cursor-pointer border-0 bg-transparent capitalize ${
                    stage === "rejected" ? "text-[#f06b6b]" : "text-foreground"
                  }`}
                >
                  Next: {stage}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
