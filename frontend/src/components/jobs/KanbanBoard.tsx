"use client";

import { useState } from "react";
import type { ApplicationOut, ApplicationStage, CustomQuestion } from "@/lib/jobsApi";
import KanbanColumn from "./KanbanColumn";

const VISIBLE_STAGES: ApplicationStage[] = ["applied", "screening", "interview", "offer", "hired"];

interface Props {
  applications: ApplicationOut[];
  onMoveStage: (appId: string, newStage: ApplicationStage, note?: string) => void;
  onViewProfile: (userId: string) => void;
  movingAppId?: string | null;
  customQuestions?: CustomQuestion[];
}

export default function KanbanBoard({ applications, onMoveStage, onViewProfile, movingAppId, customQuestions = [] }: Props) {
  const [showRejected, setShowRejected] = useState(false);

  const rejectedCount = applications.filter((a) => a.stage === "rejected").length;

  const stages: ApplicationStage[] = showRejected
    ? [...VISIBLE_STAGES, "rejected"]
    : VISIBLE_STAGES;

  return (
    <div className="flex flex-col h-full">
      {/* Board header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <span className="text-[12px] text-muted-foreground">
          {applications.length} total applicants
        </span>
        {rejectedCount > 0 && (
          <button
            type="button"
            onClick={() => setShowRejected((v) => !v)}
            className="text-[12px] text-muted-foreground border-0 bg-transparent cursor-pointer hover:text-foreground transition-colors"
          >
            {showRejected ? "Hide" : "Show"} rejected ({rejectedCount})
          </button>
        )}
      </div>

      {/* Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full min-w-min">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              applications={applications.filter((a) => a.stage === stage)}
              onMoveStage={onMoveStage}
              onViewProfile={onViewProfile}
              movingAppId={movingAppId}
              customQuestions={customQuestions}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
