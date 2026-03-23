# Jobs Workspace — 3-Column Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/jobs` into a thread-style 3-column workspace (filter rail + job list + inline detail) and make `/jobs/[slug]` a proper standalone page.

**Architecture:** A new `JobsWorkspace.tsx` orchestrator owns all state and renders 3 columns. Col 1 is a new `JobsFilterRail.tsx` (collapsible icon rail ↔ filter panel). Col 2 is the existing `JobsListPanel` with search added. Col 3 is the existing `JobDetailPanel` with an X close button added. The `/jobs/[slug]` page is rewritten to render Col 1 + full detail directly (no desktop redirect).

**Tech Stack:** Next.js 14 App Router, React 19, Tailwind CSS, SWR, lucide-react, `@/lib/jobsApi` (existing), `@/hooks/useJobs` (existing)

---

## File Map

| File | Action |
|------|--------|
| `frontend/src/components/jobs/JobsFilterRail.tsx` | **Create** — Col 1 collapsible rail |
| `frontend/src/components/jobs/JobsWorkspace.tsx` | **Create** — 3-col orchestrator |
| `frontend/src/components/jobs/JobsListPanel.tsx` | **Edit** — add search, remove filter toggle, fix breakpoints |
| `frontend/src/components/jobs/JobDetailPanel.tsx` | **Edit** — add `onClose` prop + top bar, remove inner scroll |
| `frontend/src/app/(jobs)/jobs/page.tsx` | **Edit** — replace entire body with `<JobsWorkspace />` |
| `frontend/src/app/(jobs)/jobs/[slug]/page.tsx` | **Rewrite** — standalone detail page, remove redirect |
| `frontend/src/app/(jobs)/jobs/saved/page.tsx` | **Edit** — remove `showFilters`, update breakpoint |
| `frontend/src/app/(jobs)/jobs/my/page.tsx` | **Edit** — remove `showFilters`, update breakpoint |

---

## Task 1: Create `JobsFilterRail.tsx`

**Files:**
- Create: `frontend/src/components/jobs/JobsFilterRail.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import Link from "next/link";
import {
  Bookmark,
  Briefcase,
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "s:\SDE\Projects\all\Hire-ready only\KhoshGolpo_Ready\frontend"
npx tsc --noEmit 2>&1 | head -30
```
Expected: No errors in `JobsFilterRail.tsx` (there may be pre-existing errors elsewhere — ignore those).

- [ ] **Step 3: Commit**

```bash
cd "s:\SDE\Projects\all\Hire-ready only\KhoshGolpo_Ready"
git add frontend/src/components/jobs/JobsFilterRail.tsx
git commit -m "feat(jobs): add JobsFilterRail collapsible Col 1 component"
```

---

## Task 2: Edit `JobsListPanel.tsx` — search bar + breakpoint fixes

**Files:**
- Modify: `frontend/src/components/jobs/JobsListPanel.tsx`

- [ ] **Step 1: Add search props to the `Props` interface**

Find this block (lines 8–20):
```ts
interface Props {
  jobs: JobPostOut[];
  total: number;
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (jobId: string) => void;
  onSaveToggle?: (jobId: string, saved: boolean) => void;
  activeFilterCount?: number;
  onToggleFilters?: () => void;
  showFilters?: boolean;
  headerTitle?: string;
  emptyState?: React.ReactNode;
}
```

Replace with:
```ts
interface Props {
  jobs: JobPostOut[];
  total: number;
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (jobId: string) => void;
  onSaveToggle?: (jobId: string, saved: boolean) => void;
  activeFilterCount?: number;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  headerTitle?: string;
  emptyState?: React.ReactNode;
}
```

- [ ] **Step 2: Update the destructured params**

Find:
```ts
export default function JobsListPanel({
  jobs,
  total,
  isLoading,
  selectedId,
  onSelect,
  onSaveToggle,
  activeFilterCount = 0,
  onToggleFilters,
  showFilters = true,
  headerTitle,
  emptyState,
}: Props) {
```

Replace with:
```ts
export default function JobsListPanel({
  jobs,
  total,
  isLoading,
  selectedId,
  onSelect,
  onSaveToggle,
  activeFilterCount = 0,
  searchValue = "",
  onSearchChange,
  headerTitle,
  emptyState,
}: Props) {
```

- [ ] **Step 3: Fix the autoSelect JS breakpoint (line 43)**

Find:
```ts
      window.innerWidth >= 860
```
Replace with:
```ts
      window.innerWidth >= 1024
```

- [ ] **Step 4: Replace `SlidersHorizontal` import with `Search, X`; update CSS breakpoint**

Find the lucide import line:
```ts
import { SlidersHorizontal } from "lucide-react";
```
Replace it with (do NOT delete — replace in one operation to avoid leaving a missing import):
```ts
import { Search, X } from "lucide-react";
```

Find the root div class (line 51):
```ts
    <div className="w-full min-[860px]:w-[300px] shrink-0 border-r border-border flex flex-col h-full max-[859px]:border-r-0">
```
Replace with:
```ts
    <div className="w-full min-[1024px]:w-[320px] shrink-0 flex flex-col h-full">
```
(Border removed — Col 3 in JobsWorkspace provides `border-l`; saved/my pages add their own border if needed.)

- [ ] **Step 5: Replace the filter toggle button in the header with the search bar**

Find the header block that renders the `SlidersHorizontal` button:
```tsx
      <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
        <span className="text-[13px] font-medium text-foreground">
          {headerTitle ?? `${total} jobs`}
        </span>
        {showFilters && onToggleFilters && (
          <button
            type="button"
            onClick={onToggleFilters}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-border bg-transparent text-[12px] text-muted-foreground hover:text-foreground hover:border-border/80 cursor-pointer transition-colors"
```
(The exact button content continues — delete that entire conditional block.)

Replace the whole header `<div>` with:
```tsx
      {/* Header row */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-border shrink-0">
        <span className="text-[13px] font-medium text-foreground">
          {headerTitle ?? `${total} jobs`}
        </span>
      </div>

      {/* Search bar — only rendered when onSearchChange is provided */}
      {onSearchChange && (
        <div className="px-3 py-2 border-b border-border shrink-0">
          <div className="flex items-center gap-2 h-8 px-2.5 rounded-lg bg-[#151927] border border-[#1e2235] focus-within:border-[#0EA5E9]/50 transition-colors">
            <Search size={13} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search jobs…"
              className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}
```

- [ ] **Step 6: Verify `Search` and `X` are imported**

Confirm the import line from Step 4 reads:
```ts
import { Search, X } from "lucide-react";
```
No additional change needed — this was done in Step 4.

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd "s:\SDE\Projects\all\Hire-ready only\KhoshGolpo_Ready\frontend"
npx tsc --noEmit 2>&1 | head -30
```
Expected: No new errors from `JobsListPanel.tsx`.

- [ ] **Step 8: Commit**

```bash
cd "s:\SDE\Projects\all\Hire-ready only\KhoshGolpo_Ready"
git add frontend/src/components/jobs/JobsListPanel.tsx
git commit -m "feat(jobs): add search bar to JobsListPanel, remove filter toggle, fix breakpoints"
```

---

## Task 3: Edit `JobDetailPanel.tsx` — onClose prop + top bar + remove inner scroll

**Files:**
- Modify: `frontend/src/components/jobs/JobDetailPanel.tsx`

- [ ] **Step 1: Add `X` and `ArrowUpRight` to lucide imports**

Find the lucide import block (lines 7–17). Add `ArrowUpRight` and `X` to the list:
```ts
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Calendar,
  CheckCircle2,
  Flag,
  Globe,
  MapPin,
  Users,
  X,
} from "lucide-react";
```

- [ ] **Step 2: Add `useRouter` import**

Find:
```ts
import { useState } from "react";
```
Replace with:
```ts
import { useState } from "react";
import { useRouter } from "next/navigation";
```

- [ ] **Step 3: Add `onClose` to the `Props` interface**

Find:
```ts
interface Props {
  job: JobPostOut;
  onApplied?: () => void;
}
```
Replace with:
```ts
interface Props {
  job: JobPostOut;
  onApplied?: () => void;
  onClose?: () => void;
}
```

- [ ] **Step 4: Destructure `onClose` and instantiate router**

Find:
```ts
export default function JobDetailPanel({ job, onApplied }: Props) {
  const { user } = useAuthStore();
```
Replace with:
```ts
export default function JobDetailPanel({ job, onApplied, onClose }: Props) {
  const router = useRouter();
  const { user } = useAuthStore();
```

- [ ] **Step 5: Remove `overflow-y-auto` from root div; add the top bar**

Find the exact root div (line 97):
```tsx
    <div className="flex flex-col h-full overflow-y-auto bg-card">
```
Replace with (scroll moves to the external wrapper in `JobsWorkspace` and `[slug]/page.tsx`):
```tsx
    <div className="flex flex-col h-full bg-card">
```

Then immediately inside that root div, before all existing content, add the top bar:
```tsx
      {/* Workspace top bar — only shown when onClose is provided (inline Col 3 context) */}
      {onClose && (
        <div className="flex items-center justify-end gap-1 px-3 h-10 border-b border-border shrink-0 sticky top-0 bg-background z-10">
          <button
            type="button"
            onClick={() => router.push(`/jobs/${job.slug}`)}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-[#1e2235] border border-transparent hover:border-border transition-colors"
          >
            View Full Page
            <ArrowUpRight size={12} />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-[#1e2235] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd "s:\SDE\Projects\all\Hire-ready only\KhoshGolpo_Ready\frontend"
npx tsc --noEmit 2>&1 | head -30
```
Expected: No new errors.

- [ ] **Step 7: Commit**

```bash
cd "s:\SDE\Projects\all\Hire-ready only\KhoshGolpo_Ready"
git add frontend/src/components/jobs/JobDetailPanel.tsx
git commit -m "feat(jobs): add onClose prop and top bar to JobDetailPanel, remove inner scroll"
```

---

## Task 4: Create `JobsWorkspace.tsx`

**Files:**
- Create: `frontend/src/components/jobs/JobsWorkspace.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import type { JobFilters } from "@/lib/jobsApi";
import { useJob, useJobs } from "@/hooks/useJobs";
import JobsFilterRail from "./JobsFilterRail";
import JobsListPanel from "./JobsListPanel";
import JobDetailPanel from "./JobDetailPanel";

export default function JobsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedSlug = searchParams.get("job") ?? null;

  const [col1Expanded, setCol1Expanded] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<JobFilters>({});

  // Debounce search 400ms
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Active filter count (is_remote handled separately so false counts)
  const activeFilterCount = [
    filters.job_type,
    filters.experience_level,
    filters.is_remote !== undefined && filters.is_remote !== null ? true : undefined,
    filters.salary_min,
    filters.salary_max,
  ].filter((v) => v !== undefined && v !== null).length;

  const activeFilters: JobFilters = {
    ...filters,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  };

  const { jobs, total, isLoading, mutate: mutateList } = useJobs(activeFilters);
  const { job: selectedJob } = useJob(selectedSlug);

  const handleSelect = useCallback(
    (slug: string) => {
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        router.push(`/jobs/${slug}`);
        return;
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("job", slug);
      router.replace(`/jobs?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleClose = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("job");
    const qs = params.toString();
    router.replace(qs ? `/jobs?${qs}` : "/jobs", { scroll: false });
  }, [router, searchParams]);

  const handleApplied = useCallback(() => {
    mutateList();
  }, [mutateList]);

  return (
    <div className="flex h-full overflow-hidden">
      <JobsFilterRail
        expanded={col1Expanded}
        onToggle={() => setCol1Expanded((v) => !v)}
        filters={filters}
        onFiltersChange={setFilters}
        activeFilterCount={activeFilterCount}
      />

      {/* Col 2 — expands to fill when no detail selected */}
      <div className={selectedJob ? "w-[320px] shrink-0 border-r border-border" : "flex-1"}>
        <JobsListPanel
          jobs={jobs}
          total={total}
          isLoading={isLoading}
          selectedId={selectedSlug}
          onSelect={handleSelect}
          searchValue={search}
          onSearchChange={setSearch}
          activeFilterCount={activeFilterCount}
          emptyState={
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
              <Search size={32} strokeWidth={1.2} />
              <p className="text-[13px]">
                {activeFilterCount > 0 || debouncedSearch
                  ? "No jobs match your search"
                  : "No jobs posted yet"}
              </p>
              {(activeFilterCount > 0 || debouncedSearch) && (
                <button
                  type="button"
                  onClick={() => { setFilters({}); setSearch(""); }}
                  className="text-[12px] text-[#0EA5E9] border-0 bg-transparent cursor-pointer hover:underline"
                >
                  Clear search & filters
                </button>
              )}
            </div>
          }
        />
      </div>

      {/* Col 3 — hidden on <1024px */}
      {selectedJob && (
        <div className="flex-1 overflow-y-auto border-l border-border max-[1023px]:hidden">
          <JobDetailPanel
            job={selectedJob}
            onApplied={handleApplied}
            onClose={handleClose}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "s:\SDE\Projects\all\Hire-ready only\KhoshGolpo_Ready\frontend"
npx tsc --noEmit 2>&1 | head -30
```
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
cd "s:\SDE\Projects\all\Hire-ready only\KhoshGolpo_Ready"
git add frontend/src/components/jobs/JobsWorkspace.tsx
git commit -m "feat(jobs): add JobsWorkspace 3-col orchestrator"
```

---

## Task 5: Rewire `jobs/page.tsx`

**Files:**
- Modify: `frontend/src/app/(jobs)/jobs/page.tsx`

- [ ] **Step 1: Replace the entire file**

Delete all existing content and write:
```tsx
import JobsWorkspace from "@/components/jobs/JobsWorkspace";

export default function JobsBrowsePage() {
  return <JobsWorkspace />;
}
```
No `"use client"` directive — `JobsWorkspace` is the client boundary.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "s:\SDE\Projects\all\Hire-ready only\KhoshGolpo_Ready\frontend"
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
cd "s:\SDE\Projects\all\Hire-ready only\KhoshGolpo_Ready"
git add "frontend/src/app/(jobs)/jobs/page.tsx"
git commit -m "feat(jobs): replace jobs/page.tsx with JobsWorkspace wrapper"
```

---

## Task 6: Rewrite `jobs/[slug]/page.tsx`

**Files:**
- Modify: `frontend/src/app/(jobs)/jobs/[slug]/page.tsx`

- [ ] **Step 1: Replace the entire file**

Delete all existing content (including the desktop redirect `useEffect`) and write.

> **Note:** The outer wrapper uses `flex flex-col overflow-hidden` with a separate inner `overflow-y-auto` div around `JobDetailPanel`. This keeps the mobile back button pinned at the top and only scrolls the detail content — intentionally different from the spec's single `overflow-y-auto` wrapper (the plan's structure is correct).
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useJob } from "@/hooks/useJobs";
import JobDetailPanel from "@/components/jobs/JobDetailPanel";
import JobsFilterRail from "@/components/jobs/JobsFilterRail";
import PageLoader from "@/components/shared/PageLoader";

export default function JobDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { job, isLoading } = useJob(slug as string);
  const [col1Expanded, setCol1Expanded] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-3 text-muted-foreground">
        <p className="text-[13px]">Job not found or has been removed.</p>
        <Link href="/jobs" className="text-[12px] text-[#0EA5E9] hover:underline">
          Browse all jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <JobsFilterRail
        expanded={col1Expanded}
        onToggle={() => setCol1Expanded((v) => !v)}
        // No filters/onFiltersChange — nav icons only when expanded
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile back button — hidden on desktop */}
        <div className="max-[1023px]:flex hidden items-center gap-2 px-3 h-11 border-b border-border shrink-0 bg-background">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={15} />
            Back
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <JobDetailPanel job={job} />
          {/* No onClose — no X button or top bar on this standalone page */}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify `PageLoader` exists at the expected path**

```bash
ls "s:\SDE\Projects\all\Hire-ready only\KhoshGolpo_Ready\frontend\src\components\shared\PageLoader.tsx"
```
If it doesn't exist, search for it:
```bash
cd "s:\SDE\Projects\all\Hire-ready only\KhoshGolpo_Ready\frontend"
find src -name "PageLoader*"
```
Use whatever path is correct in the import.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "s:\SDE\Projects\all\Hire-ready only\KhoshGolpo_Ready\frontend"
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
cd "s:\SDE\Projects\all\Hire-ready only\KhoshGolpo_Ready"
git add "frontend/src/app/(jobs)/jobs/[slug]/page.tsx"
git commit -m "feat(jobs): rewrite [slug] page as standalone detail with filter rail"
```

---

## Task 7: Fix `saved/page.tsx`, `my/page.tsx`, and `pipeline/page.tsx` — remove `showFilters`, fix breakpoints

**Files:**
- Modify: `frontend/src/app/(jobs)/jobs/saved/page.tsx`
- Modify: `frontend/src/app/(jobs)/jobs/my/page.tsx`
- Modify: `frontend/src/app/(jobs)/jobs/pipeline/page.tsx`

- [ ] **Step 1: Edit `saved/page.tsx`**

In `handleSelect`, change:
```ts
    if (typeof window !== "undefined" && window.innerWidth < 860) {
```
to:
```ts
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
```

Remove `showFilters={false}` from the `<JobsListPanel>` props (it no longer exists).

Change the detail panel wrapper:
```tsx
      <div className="flex-1 overflow-y-auto max-[859px]:hidden">
```
to:
```tsx
      <div className="flex-1 overflow-y-auto max-[1023px]:hidden border-l border-border">
```

- [ ] **Step 2: Edit `my/page.tsx`**

In `handleSelect`, change:
```ts
    if (typeof window !== "undefined" && window.innerWidth < 860) {
```
to:
```ts
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
```

Remove `showFilters={false}` from the `<JobsListPanel>` props.

Change the detail panel wrapper:
```tsx
      <div className="flex-1 overflow-y-auto max-[859px]:hidden">
```
to:
```tsx
      <div className="flex-1 overflow-y-auto max-[1023px]:hidden border-l border-border">
```

- [ ] **Step 3: Edit `pipeline/page.tsx` — update Tailwind breakpoints only**

`pipeline/page.tsx` uses `JobsRail` (not `JobsListPanel`) — no prop removal needed. It contains Tailwind breakpoint classes only (no JS `window.innerWidth` checks). Do a find-and-replace in the file:
- All `min-[860px]:` → `min-[1024px]:`
- All `max-[859px]:` → `max-[1023px]:`

Note: `JobsRail.tsx` was audited and contains no `860` breakpoints — no changes needed there.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd "s:\SDE\Projects\all\Hire-ready only\KhoshGolpo_Ready\frontend"
npx tsc --noEmit 2>&1 | head -30
```
Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
cd "s:\SDE\Projects\all\Hire-ready only\KhoshGolpo_Ready"
git add "frontend/src/app/(jobs)/jobs/saved/page.tsx" "frontend/src/app/(jobs)/jobs/my/page.tsx" "frontend/src/app/(jobs)/jobs/pipeline/page.tsx"
git commit -m "fix(jobs): remove showFilters prop, update all 860->1024 breakpoints in jobs pages"
```

---

## Task 8: Smoke Test

- [ ] **Step 1: Start frontend dev server**

```bash
cd "s:\SDE\Projects\all\Hire-ready only\KhoshGolpo_Ready\frontend"
npm run dev
```

- [ ] **Step 2: Manual checklist (desktop ≥1024px)**

Open `http://localhost:3000/jobs` in a browser at full desktop width.

| # | Test | Expected |
|---|------|---------|
| 1 | Page loads | Col 1 icon rail (48px), Col 2 job list with search bar |
| 2 | Click ChevronRight in Col 1 | Expands to 220px with filter panel + nav links |
| 3 | Click ChevronLeft | Collapses back to 48px |
| 4 | Type in search bar | Jobs list filters after ~400ms |
| 5 | Clear X button in search | Search clears, list resets |
| 6 | Click a job card | Col 3 slides in with job detail, top bar shows "View Full Page →" and X |
| 7 | Click X button | Col 3 closes, Col 2 expands to fill |
| 8 | Click "View Full Page →" | Navigates to `/jobs/[slug]` standalone page |
| 9 | On `/jobs/[slug]` | Col 1 icon rail visible, full detail rendered, no redirect |
| 10 | On `/jobs/[slug]` expand Col 1 | Shows nav links only (no filter panel) |
| 11 | Apply a filter in Col 1 | Jobs list updates, filter count badge on ChevronRight icon |

- [ ] **Step 3: Manual checklist (mobile <1024px)**

Resize browser to 900px wide.

| # | Test | Expected |
|---|------|---------|
| 1 | Click a job card | Navigates to `/jobs/[slug]` |
| 2 | On `/jobs/[slug]` | "Back" button visible at top |
| 3 | Click Back | Returns to `/jobs` list |

- [ ] **Step 4: Final commit**

```bash
cd "s:\SDE\Projects\all\Hire-ready only\KhoshGolpo_Ready"
git add -A
git commit -m "feat(jobs): complete 3-col workspace with filter rail, search, inline detail"
```
