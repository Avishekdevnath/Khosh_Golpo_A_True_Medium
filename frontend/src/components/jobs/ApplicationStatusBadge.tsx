"use client";

import type { ApplicationStage } from "@/lib/jobsApi";

const STAGE_LABELS: Record<ApplicationStage, string> = {
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const STAGE_COLORS: Record<ApplicationStage, string> = {
  applied: "bg-[#1e2235] text-[#0EA5E9] border border-[#0EA5E9]/30",
  screening: "bg-[#1e2235] text-[#7c73f0] border border-[#7c73f0]/30",
  interview: "bg-[#1e2235] text-[#f0834a] border border-[#f0834a]/30",
  offer: "bg-[#1e2235] text-[#3dd68c] border border-[#3dd68c]/30",
  hired: "bg-[#3dd68c]/15 text-[#3dd68c] border border-[#3dd68c]/40",
  rejected: "bg-[#f06b6b]/10 text-[#f06b6b] border border-[#f06b6b]/30",
  withdrawn: "bg-[#1e2235] text-[#8b95a1] border border-[#1e2235]",
};

interface Props {
  stage: ApplicationStage;
  className?: string;
}

export default function ApplicationStatusBadge({ stage, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[stage]} ${className}`}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}
