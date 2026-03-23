"use client";

import type { ApplicationOut, ApplicationStage, CustomQuestion } from "@/lib/jobsApi";
import KanbanCard from "./KanbanCard";

const STAGE_COLORS: Record<string, string> = {
  applied: "#7c73f0",
  screening: "#f0834a",
  interview: "#0EA5E9",
  offer: "#f5b64a",
  hired: "#3dd68c",
  rejected: "#f06b6b",
};

interface Props {
  stage: ApplicationStage;
  applications: ApplicationOut[];
  onMoveStage: (appId: string, newStage: ApplicationStage, note?: string) => void;
  onViewProfile: (userId: string) => void;
  movingAppId?: string | null;
  customQuestions?: CustomQuestion[];
}

export default function KanbanColumn({ stage, applications, onMoveStage, onViewProfile, movingAppId, customQuestions = [] }: Props) {
  const color = STAGE_COLORS[stage] ?? "#636f8d";

  return (
    <div className="w-[200px] shrink-0 flex flex-col h-full border-r border-border">
      {/* Header */}
      <div
        className="px-3 py-2.5 border-b border-border shrink-0"
        style={{ borderTop: `2px solid ${color}` }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-foreground capitalize">{stage}</span>
          <span
            className="text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] rounded-full inline-flex items-center justify-center"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {applications.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2">
        {applications.length === 0 ? (
          <div className="text-[11px] text-muted-foreground text-center py-4">No applicants</div>
        ) : (
          applications.map((app) => (
            <KanbanCard
              key={app.id}
              application={app}
              onMoveStage={(newStage, note) => onMoveStage(app.id, newStage, note)}
              onViewProfile={onViewProfile}
              isMoving={movingAppId === app.id}
              customQuestions={customQuestions}
            />
          ))
        )}
      </div>
    </div>
  );
}
