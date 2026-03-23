"use client";

import { X } from "lucide-react";
import type { JobFilters } from "@/lib/jobsApi";

interface Props {
  filters: JobFilters;
  onChange: (f: JobFilters) => void;
}

const JOB_TYPES: { value: string; label: string }[] = [
  { value: "full_time",  label: "Full-time"  },
  { value: "part_time",  label: "Part-time"  },
  { value: "contract",   label: "Contract"   },
  { value: "internship", label: "Internship" },
  { value: "freelance",  label: "Freelance"  },
];

const EXP_LEVELS: { value: string; label: string }[] = [
  { value: "entry",  label: "Entry"   },
  { value: "mid",    label: "Mid"     },
  { value: "senior", label: "Senior"  },
  { value: "lead",   label: "Lead"    },
];

// Preset salary ranges in USD
const SALARY_PRESETS: { label: string; min?: number; max?: number }[] = [
  { label: "Any",          min: undefined, max: undefined },
  { label: "< $30K",       min: undefined, max: 30000     },
  { label: "$30K – $60K",  min: 30000,     max: 60000     },
  { label: "$60K – $100K", min: 60000,     max: 100000    },
  { label: "$100K – $150K",min: 100000,    max: 150000    },
  { label: "$150K+",       min: 150000,    max: undefined  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

function FilterChip({
  label,
  active,
  accent = "primary",
  onClick,
}: {
  label: string;
  active: boolean;
  accent?: "primary" | "green";
  onClick: () => void;
}) {
  const activeStyle =
    accent === "green"
      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold"
      : "bg-primary/10 border-primary/40 text-primary font-semibold";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-10 px-4 rounded-xl text-[13px] border transition-all duration-150 whitespace-nowrap active:scale-95",
        active
          ? activeStyle
          : "border-border bg-transparent text-foreground hover:bg-secondary hover:border-primary/20",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export default function JobFilters({ filters, onChange }: Props) {
  function set(patch: Partial<JobFilters>) {
    onChange({ ...filters, ...patch, page: 1 });
  }

  function clear() {
    onChange({ page: 1 });
  }

  const hasFilters = !!(
    filters.job_type ||
    filters.experience_level ||
    filters.is_remote !== undefined ||
    filters.salary_min ||
    filters.salary_max
  );

  // Match active preset
  const activeSalaryPreset = SALARY_PRESETS.find(
    (p) => p.min === (filters.salary_min ?? undefined) && p.max === (filters.salary_max ?? undefined)
  );

  return (
    <div className="px-5 py-6 flex flex-col gap-7">

      {/* Job Type */}
      <div>
        <SectionLabel>Job Type</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {JOB_TYPES.map(({ value, label }) => (
            <FilterChip
              key={value}
              label={label}
              active={filters.job_type === value}
              onClick={() =>
                set({ job_type: filters.job_type === value ? undefined : (value as JobFilters["job_type"]) })
              }
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Experience Level */}
      <div>
        <SectionLabel>Experience Level</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {EXP_LEVELS.map(({ value, label }) => (
            <FilterChip
              key={value}
              label={label}
              active={filters.experience_level === value}
              onClick={() =>
                set({
                  experience_level:
                    filters.experience_level === value
                      ? undefined
                      : (value as JobFilters["experience_level"]),
                })
              }
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Work Mode */}
      <div>
        <SectionLabel>Work Mode</SectionLabel>
        <div className="flex gap-2">
          <FilterChip
            label="Remote"
            active={filters.is_remote === true}
            accent="green"
            onClick={() => set({ is_remote: filters.is_remote === true ? undefined : true })}
          />
          <FilterChip
            label="On-site"
            active={filters.is_remote === false}
            onClick={() => set({ is_remote: filters.is_remote === false ? undefined : false })}
          />
          <FilterChip
            label="Any"
            active={filters.is_remote === undefined || filters.is_remote === null}
            onClick={() => set({ is_remote: undefined })}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Salary Range — preset chips */}
      <div>
        <SectionLabel>Salary Range</SectionLabel>
        <div className="flex flex-col gap-2">
          {SALARY_PRESETS.map((preset) => {
            const isActive =
              (filters.salary_min ?? undefined) === preset.min &&
              (filters.salary_max ?? undefined) === preset.max;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => set({ salary_min: preset.min, salary_max: preset.max })}
                className={[
                  "flex items-center justify-between h-11 px-4 rounded-xl border text-[13px] transition-all duration-150 active:scale-[0.98]",
                  isActive
                    ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                    : "border-border bg-transparent text-foreground hover:bg-secondary hover:border-primary/20",
                ].join(" ")}
              >
                <span>{preset.label}</span>
                {isActive && <span className="w-2 h-2 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>

        {/* Custom range inputs */}
        <p className="text-[11px] text-muted-foreground mt-4 mb-2">Or enter custom range</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.salary_min ?? ""}
            onChange={(e) => set({ salary_min: e.target.value ? Number(e.target.value) : undefined })}
            className="flex-1 min-w-0 h-11 px-3 bg-secondary border border-border rounded-xl text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
          <span className="text-muted-foreground text-[13px] shrink-0">–</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.salary_max ?? ""}
            onChange={(e) => set({ salary_max: e.target.value ? Number(e.target.value) : undefined })}
            className="flex-1 min-w-0 h-11 px-3 bg-secondary border border-border rounded-xl text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* Clear all */}
      {hasFilters && (
        <>
          <div className="h-px bg-border" />
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-2 h-10 px-4 rounded-xl border border-destructive/30 text-[13px] text-destructive hover:bg-destructive/5 transition-colors self-start"
          >
            <X size={13} />
            Clear all filters
          </button>
        </>
      )}
    </div>
  );
}
