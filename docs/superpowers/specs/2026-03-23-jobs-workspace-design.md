# Jobs Workspace — 3-Column Layout Design
**Date:** 2026-03-23
**Status:** Approved

---

## Overview

Redesign the `/jobs` browse page to a thread-style 3-column workspace with a collapsible filter rail, jobs list with search, and an inline job detail panel. The dedicated `/jobs/[slug]` page becomes a proper standalone detail page. This is a frontend-only change — no backend modifications.

---

## Breakpoint

**Single breakpoint: 1024px.** Update ALL existing `860px` / `859px` breakpoints in jobs components to `1024px` / `1023px`. This includes CSS Tailwind classes AND JavaScript `window.innerWidth` checks (e.g., the `autoSelect` useEffect in `JobsListPanel` line 43 uses `>= 860` — change to `>= 1024`).

- **≥1024px** — 3-column workspace layout
- **<1024px** — Col 2 only (list); clicking a job navigates to `/jobs/[slug]`

---

## URL Param & `useJob` clarification

The `?job=` query param stores a **slug** (not an ID). This is already the case — `JobsListPanel.autoSelect` calls `onSelect(jobs[0].slug)` on line 46 of the existing file. The `useJob(slug)` hook calls `api.get('jobs/${slug}')`, and the backend's `resolve_job()` helper accepts both ObjectId and slug, so slug-based lookup works without any hook change.

---

## Layout (Desktop ≥1024px)

```
┌──────┬─────────────────────┬──────────────────────────────┐
│ Col1 │       Col 2         │           Col 3              │
│ rail │   Jobs List         │   Job Detail                 │
│      │   [search bar]      │   [top bar: X + View Full]   │
│      │   [job cards...]    │   [full JobDetailPanel body] │
│ 48px │     w-[320px]       │        flex-1                │
│ or   │     shrink-0        │   (absent if none selected)  │
│ 220px│                     │                              │
└──────┴─────────────────────┴──────────────────────────────┘
```

- **Col 2 width** is set to `w-[320px]` always (update from current `w-[300px]`). `shrink-0` keeps it fixed.
- When no job is selected: Col 3 is absent and `JobsWorkspace` renders Col 2 with `flex-1` instead of fixed width so it fills the space.
- When a job is selected: Col 2 returns to `w-[320px] shrink-0`, Col 3 takes `flex-1`.

---

## Column 1 — `JobsFilterRail.tsx` (new, `"use client"`)

### Collapsed state (default, `w-12` = 48px)
Icon-only vertical rail, `overflow-y-auto` for scroll. Icons top to bottom:
- **ChevronRight** — calls `onToggle()`
- **Bookmark** — `<Link href="/jobs/saved">`
- **FileText** — `<Link href="/jobs/applications">`
- **PlusCircle** — `<Link href="/jobs/post">`

### Expanded state (`w-[220px]`, `overflow-y-auto`)
- **ChevronLeft** at top to collapse (`onToggle()`)
- If `filters` and `onFiltersChange` are provided: render `<JobFiltersPanel filters={filters} onChange={onFiltersChange} />` (the existing component from `@/components/jobs/JobFilters`)
- Nav links at bottom with text labels (Saved Jobs, My Applications, Post a Job)
- The expanded panel itself is `overflow-y-auto h-full flex flex-col` so long filter content scrolls within the column without breaking the outer layout

### Props
```ts
interface JobsFilterRailProps {
  expanded: boolean;
  onToggle: () => void;
  filters?: JobFilters;                          // from @/lib/jobsApi
  onFiltersChange?: (f: JobFilters) => void;
  activeFilterCount?: number;
}
```

When `filters`/`onFiltersChange` are absent, the expanded state shows nav links only (no filter panel). This is the `/jobs/[slug]` usage — no separate variant needed.

---

## Column 2 — `JobsListPanel.tsx` (edited)

### Changes
1. **Update breakpoint:** `min-[860px]:w-[300px]` → `min-[1024px]:w-[320px]`; `max-[859px]:...` → `max-[1023px]:...`
2. **Update autoSelect JS check:** `window.innerWidth >= 860` → `window.innerWidth >= 1024`
3. **Add search props** to `Props`:
   ```ts
   searchValue?: string;
   onSearchChange?: (v: string) => void;
   ```
4. **Add search bar** in the list header (below the title row, above job cards), rendered only when `onSearchChange` is provided:
   - Search icon left, controlled `<input>` middle (`value={searchValue}`, `onChange={e => onSearchChange(e.target.value)}`), clear X button right (visible when `searchValue` is non-empty, clears to `""`)
5. **Remove** `onToggleFilters`, `showFilters` props — filter toggling moves to Col 1. Remove the `SlidersHorizontal` filters button from the header. Keep `activeFilterCount` prop as optional (still useful for empty state message text).
6. **Audit all other consumers** of `JobsListPanel` before removing props. Check: `jobs/saved/page.tsx`, `jobs/my/page.tsx`, `jobs/pipeline/page.tsx`, and any employer views. Remove the `onToggleFilters`/`showFilters` props from those call sites too.
7. **Remove `border-r border-border` from `JobsListPanel`'s root div.** The Col 3 wrapper in `JobsWorkspace` already has `border-l border-border`, so keeping both creates a double border. The border responsibility moves to the Col 3 wrapper.
8. **Reset `autoSelected.current`** to `false` when `jobs` changes due to a filter or search update. Add `autoSelected.current = false` at the start of the `useEffect` that watches `[jobs, selectedId, onSelect]` — or restructure to only auto-select when `selectedId` is null and `jobs` array identity changes for the first time. Exact implementation is left to the developer, but the auto-select should re-fire when a new filtered result set arrives with no current selection.

---

## Column 3 — `JobDetailPanel.tsx` (edited)

### Changes
1. **Add `onClose` optional prop:**
   ```ts
   // Existing Props interface — add:
   onClose?: () => void;
   ```
2. **Add top bar** rendered only when `onClose` is provided (i.e., workspace context only, not on standalone `/jobs/[slug]` page):
   - Right side: "View Full Page →" text button (`router.push(/jobs/${job.slug})`) + X icon button (`onClose()`)
3. **Remove `overflow-y-auto` from `JobDetailPanel`'s root div.** The scroll container is now the Col 3 wrapper in `JobsWorkspace` (`overflow-y-auto`), and the `flex-1 overflow-y-auto` wrapper in `jobs/[slug]/page.tsx`. Having it on both causes a double scroll container. Remove it from inside the component so the external wrapper controls scrolling.
4. No other changes to existing content or layout.

---

## `JobsWorkspace.tsx` (new, `"use client"`)

Owns all layout state and data. Rendered directly by `jobs/page.tsx`.

```ts
// State
const [col1Expanded, setCol1Expanded] = useState(false);
const [search, setSearch] = useState("");
const [debouncedSearch, setDebouncedSearch] = useState("");
const [filters, setFilters] = useState<JobFilters>({});

// URL state
const searchParams = useSearchParams();
const selectedSlug = searchParams.get("job") ?? null;

// Derived — filter count for rail badge
// Note: is_remote uses explicit undefined check (not Boolean) so false counts as active
const activeFilterCount = [
  filters.job_type,
  filters.experience_level,
  filters.is_remote !== undefined && filters.is_remote !== null ? true : undefined,
  filters.salary_min,
  filters.salary_max,
].filter(v => v !== undefined && v !== null && v !== false).length;

// Merge debounced search into filters for API
const activeFilters: JobFilters = {
  ...filters,
  ...(debouncedSearch ? { search: debouncedSearch } : {}),
};

// Data
const { jobs, total, isLoading, mutate: mutateList } = useJobs(activeFilters);
const { job: selectedJob } = useJob(selectedSlug);

// Search debounce (400ms useEffect on `search`)
```

### Handlers
```ts
function handleSelect(slug: string) {
  if (typeof window !== "undefined" && window.innerWidth < 1024) {
    router.push(`/jobs/${slug}`);
    return;
  }
  const params = new URLSearchParams(searchParams.toString());
  params.set("job", slug);
  router.replace(`/jobs?${params.toString()}`, { scroll: false });
}

function handleClose() {
  // Preserve other query params (e.g. future ?page=, ?tag=) — only remove ?job=
  const params = new URLSearchParams(searchParams.toString());
  params.delete("job");
  const qs = params.toString();
  router.replace(qs ? `/jobs?${qs}` : "/jobs", { scroll: false });
}

function handleApplied() {
  mutateList();
}
```

### Rendered structure
```tsx
<div className="flex h-full overflow-hidden">
  <JobsFilterRail
    expanded={col1Expanded}
    onToggle={() => setCol1Expanded(v => !v)}
    filters={filters}
    onFiltersChange={setFilters}
    activeFilterCount={activeFilterCount}
  />

  {/* Col 2 — fixed width when detail open, flex-1 otherwise */}
  <div className={selectedJob ? "w-[320px] shrink-0" : "flex-1"}>
    <JobsListPanel
      jobs={jobs}
      total={total}
      isLoading={isLoading}
      selectedId={selectedSlug}
      onSelect={handleSelect}
      searchValue={search}
      onSearchChange={setSearch}
      activeFilterCount={activeFilterCount}
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
```

---

## `jobs/page.tsx` (edited)

**Delete the entire file body** — all existing `useState`, handlers, and JSX. Replace with:

```tsx
// No "use client" directive needed — JobsWorkspace is the client boundary
import JobsWorkspace from "@/components/jobs/JobsWorkspace";
export default function JobsBrowsePage() {
  return <JobsWorkspace />;
}
```

---

## `jobs/[slug]/page.tsx` (rewritten as `"use client"`)

This page is currently a client component that does a desktop redirect — it becomes a proper standalone detail page. Note: there is no `generateMetadata` in the current file, so no SEO regression.

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
    // Render a centered spinner or skeleton that matches the app's existing
    // PageLoader / skeleton pattern used in ThreadDetailWorkspace
    return <div className="flex h-full items-center justify-center"><PageLoader /></div>;
  }

  if (!job) {
    // Render an inline "Job not found" message with a Back link to /jobs
    return (
      <div className="flex h-full items-center justify-center flex-col gap-3 text-muted-foreground">
        <p className="text-[13px]">Job not found or has been removed.</p>
        <Link href="/jobs" className="text-[12px] text-[#0EA5E9] hover:underline">Browse all jobs</Link>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <JobsFilterRail
        expanded={col1Expanded}
        onToggle={() => setCol1Expanded(v => !v)}
        // no filters/onFiltersChange — nav icons only in expanded state
      />
      <div className="flex-1 overflow-y-auto">
        {/* Mobile back button — hidden on desktop */}
        <div className="max-[1023px]:flex hidden items-center gap-2 px-3 h-11 border-b border-border shrink-0">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={15} /> Back
          </button>
        </div>
        <JobDetailPanel job={job} />
        {/* No onClose prop — no X button on this standalone page */}
      </div>
    </div>
  );
}
```

---

## Files Touched Summary

| File | Change |
|------|--------|
| `components/jobs/JobsWorkspace.tsx` | **New** — 3-col orchestrator, owns all state |
| `components/jobs/JobsFilterRail.tsx` | **New** — collapsible Col 1 rail + nav icons |
| `components/jobs/JobsListPanel.tsx` | **Edit** — search props, remove filter toggle, update breakpoints (CSS + JS) |
| `components/jobs/JobDetailPanel.tsx` | **Edit** — optional `onClose` prop + top bar with X + View Full Page |
| `app/(jobs)/jobs/page.tsx` | **Edit** — render `<JobsWorkspace />` only |
| `app/(jobs)/jobs/[slug]/page.tsx` | **Rewrite** — standalone `"use client"` detail page |
| Other consumers of `JobsListPanel` | **Edit** — remove `onToggleFilters`/`showFilters` props at call sites |

**Unchanged:** `JobFilters.tsx`, `JobCard.tsx`, `JobApplyModal.tsx`, `JobReportModal.tsx`.

---

## Success Criteria

1. Desktop (≥1024px): 3-col layout renders — Col 1 (48px or 220px), Col 2 (320px fixed when detail open, flex-1 otherwise), Col 3 (flex-1).
2. Col 1 toggles between icon rail and full filter panel; nav icons always link to saved/applications/post.
3. Clicking a job on desktop opens Col 3 inline; X button closes it (removes `?job=` param).
4. "View Full Page →" in Col 3 navigates to `/jobs/[slug]`.
5. `/jobs/[slug]` renders as standalone page with Col 1 rail + full job detail; no desktop redirect.
6. Tablet/mobile (<1024px): clicking a job navigates to `/jobs/[slug]`; back button returns to list.
7. Search bar in Col 2 filters the job list with 400ms debounce.
8. Filter changes in Col 1 update `useJobs(activeFilters)` immediately.
9. Applying to a job calls `mutateList()` to refresh the job list.
10. All `860`/`859` breakpoints in jobs components updated to `1024`/`1023`.
