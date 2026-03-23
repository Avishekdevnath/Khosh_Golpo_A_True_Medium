"use client";

import { useState } from "react";
import { ChevronDown, User } from "lucide-react";
import { STAGE_TRANSITIONS, TERMINAL_STAGES } from "@/lib/jobsApi";
import type { ApplicationOut, ApplicationStage } from "@/lib/jobsApi";
import { avatarSeed, initials } from "@/lib/workspaceUtils";
import ApplicationStatusBadge from "./ApplicationStatusBadge";

interface Props {
  application: ApplicationOut;
  onMoveStage: (newStage: ApplicationStage, note?: string) => void;
  onViewProfile: (userId: string) => void;
  isMoving?: boolean;
}

export default function KanbanCard({ application, onMoveStage, onViewProfile, isMoving }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const applicant = application.applicant;
  const name = applicant?.display_name ?? applicant?.username ?? "Unknown";
  const username = applicant?.username ?? "";
  const [av1, av2] = avatarSeed(application.applicant_id);

  const daysInPipeline = Math.floor(
    (Date.now() - new Date(application.created_at).getTime()) / 86400000
  );
  const transitionCount = (application.stage_history?.length ?? 1) - 1;

  const isTerminal = TERMINAL_STAGES.includes(application.stage);
  const nextStages = STAGE_TRANSITIONS[application.stage] ?? [];

  return (
    <div
      className={[
        "rounded-lg bg-card-hover border border-border p-3 mb-2",
        "transition-opacity duration-200",
        isMoving ? "opacity-30" : "opacity-100",
      ].join(" ")}
    >
      {/* Identity row */}
      <div className="flex items-center gap-2.5 mb-2">
        <span
          className="w-8 h-8 rounded-full grid place-items-center text-[10px] font-bold text-white shrink-0"
          style={{ background: `linear-gradient(135deg,${av1},${av2})` }}
        >
          {initials(name)}
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-foreground truncate">{name}</div>
          {username && <div className="text-[11px] text-muted-foreground truncate">@{username}</div>}
        </div>
      </div>

      {/* Pipeline meta */}
      <div className="text-[11px] text-muted-foreground mb-2.5">
        In pipeline {daysInPipeline}d{transitionCount > 0 ? ` · ${transitionCount}→` : ""}
      </div>

      {/* Actions */}
      {isTerminal ? (
        <ApplicationStatusBadge stage={application.stage} />
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            disabled={isMoving}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-transparent text-[11px] text-muted-foreground hover:text-foreground hover:border-border/80 cursor-pointer transition-colors disabled:opacity-50 w-full justify-between"
          >
            Move <ChevronDown size={12} />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-full rounded-lg bg-card border border-border shadow-xl z-20 py-1">
              <button
                type="button"
                onClick={() => { setDropdownOpen(false); onViewProfile(application.applicant_id); }}
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
                  onClick={() => { setDropdownOpen(false); onMoveStage(stage); }}
                  className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-foreground/5 cursor-pointer border-0 bg-transparent capitalize ${stage === "rejected" ? "text-[#f06b6b]" : "text-foreground"}`}
                >
                  → {stage}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
