"use client";

import { Search, X } from "lucide-react";
import type { JobFilters } from "@/lib/jobsApi";

interface Props {
  filters: JobFilters;
  onChange: (f: JobFilters) => void;
}

export default function JobFilters({ filters, onChange }: Props) {
  function set(patch: Partial<JobFilters>) {
    onChange({ ...filters, ...patch, page: 1 });
  }

  function clear() {
    onChange({ page: 1 });
  }

  const hasFilters = !!(
    filters.search ||
    filters.job_type ||
    filters.experience_level ||
    filters.is_remote !== undefined ||
    filters.salary_min ||
    filters.salary_max
  );

  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search jobs..."
          value={filters.search ?? ""}
          onChange={(e) => set({ search: e.target.value || undefined })}
          className="w-full pl-8 pr-3 py-1.5 bg-secondary border border-border rounded-lg text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0EA5E9]/50"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Job type */}
        <select
          value={filters.job_type ?? ""}
          onChange={(e) => set({ job_type: (e.target.value as JobFilters["job_type"]) || undefined })}
          className="flex-1 min-w-[110px] px-2 py-1.5 bg-secondary border border-border rounded-lg text-[12px] text-foreground focus:outline-none focus:border-[#0EA5E9]/50 appearance-none"
        >
          <option value="">All types</option>
          <option value="full_time">Full-time</option>
          <option value="part_time">Part-time</option>
          <option value="contract">Contract</option>
          <option value="internship">Internship</option>
          <option value="freelance">Freelance</option>
        </select>

        {/* Experience */}
        <select
          value={filters.experience_level ?? ""}
          onChange={(e) =>
            set({ experience_level: (e.target.value as JobFilters["experience_level"]) || undefined })
          }
          className="flex-1 min-w-[110px] px-2 py-1.5 bg-secondary border border-border rounded-lg text-[12px] text-foreground focus:outline-none focus:border-[#0EA5E9]/50 appearance-none"
        >
          <option value="">All levels</option>
          <option value="entry">Entry</option>
          <option value="mid">Mid-level</option>
          <option value="senior">Senior</option>
          <option value="lead">Lead</option>
        </select>

        {/* Remote */}
        <button
          onClick={() =>
            set({ is_remote: filters.is_remote === true ? undefined : true })
          }
          className={`px-3 py-1.5 rounded-lg text-[12px] border transition-colors ${
            filters.is_remote === true
              ? "bg-[#3dd68c]/15 border-[#3dd68c]/40 text-[#3dd68c]"
              : "bg-secondary border-border text-muted-foreground hover:border-[#0EA5E9]/50"
          }`}
        >
          Remote
        </button>
      </div>

      {/* Salary range */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="Min salary"
          value={filters.salary_min ?? ""}
          onChange={(e) => set({ salary_min: e.target.value ? Number(e.target.value) : undefined })}
          className="flex-1 px-2 py-1.5 bg-secondary border border-border rounded-lg text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0EA5E9]/50"
        />
        <span className="text-muted-foreground text-[12px]">–</span>
        <input
          type="number"
          placeholder="Max salary"
          value={filters.salary_max ?? ""}
          onChange={(e) => set({ salary_max: e.target.value ? Number(e.target.value) : undefined })}
          className="flex-1 px-2 py-1.5 bg-secondary border border-border rounded-lg text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0EA5E9]/50"
        />
      </div>

      {hasFilters && (
        <button
          onClick={clear}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground self-end transition-colors"
        >
          <X size={11} /> Clear filters
        </button>
      )}
    </div>
  );
}
