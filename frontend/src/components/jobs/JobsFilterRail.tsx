"use client";

import Link from "next/link";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  FileText,
  PlusCircle,
} from "lucide-react";
import type { JobFilters } from "@/lib/jobsApi";
import JobFiltersPanel from "./JobFilters";

interface JobsFilterRailProps {
  expanded: boolean;
  onToggle: () => void;
  filters?: JobFilters;
  onFiltersChange?: (f: JobFilters) => void;
  activeFilterCount?: number;
}

const NAV_LINKS = [
  { href: "/jobs/saved", icon: Bookmark, label: "Saved Jobs" },
  { href: "/jobs/applications", icon: FileText, label: "My Applications" },
  { href: "/jobs/post", icon: PlusCircle, label: "Post a Job" },
];

export default function JobsFilterRail({
  expanded,
  onToggle,
  filters,
  onFiltersChange,
  activeFilterCount = 0,
}: JobsFilterRailProps) {
  if (!expanded) {
    return (
      <div className="w-12 shrink-0 flex flex-col items-center py-2 gap-1 border-r border-border bg-background h-full overflow-y-auto">
        <button
          type="button"
          onClick={onToggle}
          title="Expand filters"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-[#1e2235] transition-colors relative"
        >
          <ChevronRight size={16} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#0EA5E9] text-[9px] font-bold text-white flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        <div className="w-full h-px bg-border my-1" />
        {NAV_LINKS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-[#1e2235] transition-colors"
          >
            <Icon size={15} />
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="w-[220px] shrink-0 flex flex-col border-r border-border bg-background h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-11 border-b border-border shrink-0">
        <span className="text-[12px] font-medium text-foreground uppercase tracking-wide">
          {filters ? "Filters" : "Menu"}
        </span>
        <button
          type="button"
          onClick={onToggle}
          title="Collapse"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-[#1e2235] transition-colors"
        >
          <ChevronLeft size={15} />
        </button>
      </div>

      {/* Filter panel (only when filter props provided) */}
      {filters && onFiltersChange && (
        <div className="flex-1 overflow-y-auto">
          <JobFiltersPanel filters={filters} onChange={onFiltersChange} />
        </div>
      )}

      {/* Nav links */}
      <div className="border-t border-border mt-auto shrink-0 py-1">
        {NAV_LINKS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 px-3 h-9 text-[13px] text-muted-foreground hover:text-foreground hover:bg-[#1e2235] transition-colors"
          >
            <Icon size={14} />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
