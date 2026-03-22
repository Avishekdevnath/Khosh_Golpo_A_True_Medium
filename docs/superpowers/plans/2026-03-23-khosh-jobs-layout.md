# Khosh Jobs Layout Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Jobs feature into a completely independent shell (`(jobs)` route group) with its own top bar, sidebar, three-panel content area, and Kanban pipeline — fully separate from the main community AppShell.

**Architecture:** The current `app/(app)/jobs/*` routes and workspace components are replaced by a new `app/(jobs)/jobs/*` route group with a dedicated `JobsShell` layout. The shell renders `JobsTopBar` + `JobsSidebar` + `{children}`, and each page manages its own list/detail panels via `?job=<id>` query params. Existing API hooks (`useJobs.ts`) and API client (`jobsApi.ts`) are reused unchanged.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS, SWR, ky, Zustand (authStore), Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-23-khosh-jobs-layout-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|---|---|
| `frontend/src/app/(jobs)/layout.tsx` | Jobs route group layout — renders `JobsShell` + `ToastProvider` |
| `frontend/src/app/(jobs)/jobs/page.tsx` | Browse page — list panel + detail panel, `?job=<id>` state |
| `frontend/src/app/(jobs)/jobs/[id]/page.tsx` | SEO canonical page — SSR detail, client-side redirects to `/jobs?job=<id>` |
| `frontend/src/app/(jobs)/jobs/saved/page.tsx` | Saved jobs page — list + detail, auth guard |
| `frontend/src/app/(jobs)/jobs/my/page.tsx` | My Posted Jobs — list + `MyJobDetailPanel`, auth guard |
| `frontend/src/app/(jobs)/jobs/post/page.tsx` | Post/Edit job form — create or `?edit=<id>` mode, auth guard |
| `frontend/src/app/(jobs)/jobs/pipeline/page.tsx` | Kanban Pipeline — jobs rail + board, auth guard |
| `frontend/src/app/(jobs)/jobs/applications/page.tsx` | My Applications — list + detail, auth guard |
| `frontend/src/components/jobs/layout/JobsShell.tsx` | Shell wrapper: flexbox column with top bar + sidebar + main |
| `frontend/src/components/jobs/layout/JobsTopBar.tsx` | Contextual top bar: wordmark/back, center title, right actions |
| `frontend/src/components/jobs/layout/JobsSidebar.tsx` | Collapsible sidebar: nav items + footer + mobile tabs |
| `frontend/src/components/jobs/JobsListPanel.tsx` | Reusable list panel: header, filter toggle, card list, auto-select |
| `frontend/src/components/jobs/MyJobDetailPanel.tsx` | Employer detail: status badge, stats, actions, applicant breakdown |
| `frontend/src/components/jobs/JobsRail.tsx` | Pipeline page: vertical list of employer's jobs for switching |
| `frontend/src/components/jobs/KanbanBoard.tsx` | Kanban container: horizontal columns, rejected toggle |
| `frontend/src/components/jobs/KanbanColumn.tsx` | Single stage column: header with accent border + card list |
| `frontend/src/components/jobs/KanbanCard.tsx` | Applicant card: avatar, name, pipeline days, Move dropdown |

### Modified Files

| File | Change |
|---|---|
| `frontend/src/lib/jobsApi.ts` | Add `STAGE_TRANSITIONS` constant (move from `ApplicationPipelineBoard`) |
| `frontend/src/components/jobs/JobDetailPanel.tsx` | Add `break-words` class; add auth banner for unauthenticated Save/Apply |
| `frontend/src/components/jobs/JobCard.tsx` | Update selected state: `border-l-2 border-primary` + glow shadow |

### Deleted Files

| File | Replaced by |
|---|---|
| `frontend/src/app/(app)/jobs/page.tsx` | `app/(jobs)/jobs/page.tsx` |
| `frontend/src/app/(app)/jobs/[id]/page.tsx` | `app/(jobs)/jobs/[id]/page.tsx` |
| `frontend/src/app/(app)/jobs/my/page.tsx` | `app/(jobs)/jobs/my/page.tsx` |
| `frontend/src/app/(app)/jobs/post/page.tsx` | `app/(jobs)/jobs/post/page.tsx` |
| `frontend/src/app/(app)/jobs/applications/page.tsx` | `app/(jobs)/jobs/applications/page.tsx` |
| `frontend/src/components/jobs/JobsWorkspace.tsx` | Page-level components |
| `frontend/src/components/jobs/MyJobsWorkspace.tsx` | `my/page.tsx` + `MyJobDetailPanel.tsx` |
| `frontend/src/components/jobs/MyApplicationsWorkspace.tsx` | `applications/page.tsx` |
| `frontend/src/components/jobs/ApplicationPipelineBoard.tsx` | `KanbanBoard` + `KanbanColumn` + `KanbanCard` |

---

## Phase 1: Shell Foundation

### Task 1: Add `STAGE_TRANSITIONS` to jobsApi.ts

Move the stage transitions constant from `ApplicationPipelineBoard.tsx` to the shared API module so all new components can import it.

**Files:**
- Modify: `frontend/src/lib/jobsApi.ts`

- [ ] **Step 1: Read the file and locate the end of the type definitions section**

Read: `frontend/src/lib/jobsApi.ts`

- [ ] **Step 2: Add `STAGE_TRANSITIONS` constant after the type definitions**

Append after the `ApplicationStage` type definition:

```typescript
/** Valid stage transitions — mirrors backend STAGE_TRANSITIONS */
export const STAGE_TRANSITIONS: Record<ApplicationStage, ApplicationStage[]> = {
  applied: ["screening", "rejected"],
  screening: ["interview", "rejected"],
  interview: ["offer", "rejected"],
  offer: ["hired", "rejected"],
  hired: [],
  rejected: [],
  withdrawn: [],
};

export const TERMINAL_STAGES: ApplicationStage[] = ["hired", "rejected", "withdrawn"];
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/jobsApi.ts
git commit -m "feat(jobs): add STAGE_TRANSITIONS constant to jobsApi"
```

---

### Task 2: Create `JobsShell` component

The shell wrapper that replaces `AppShell` for all `/jobs/*` routes. Renders the top bar, sidebar, and main content area.

**Files:**
- Create: `frontend/src/components/jobs/layout/JobsShell.tsx`

- [ ] **Step 1: Create the layout directory**

```bash
mkdir -p frontend/src/components/jobs/layout
```

- [ ] **Step 2: Write `JobsShell.tsx`**

```tsx
"use client";

import type { ReactNode } from "react";
import JobsTopBar from "./JobsTopBar";
import JobsSidebar from "./JobsSidebar";

export default function JobsShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-dvh bg-[#080a10] text-foreground font-sans overflow-hidden">
      <JobsTopBar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <JobsSidebar />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/jobs/layout/JobsShell.tsx
git commit -m "feat(jobs): create JobsShell layout component"
```

---

### Task 3: Create `JobsTopBar` component

Contextual top bar that adapts based on the current route. Shows wordmark on Browse, `← Back` on sub-pages.

**Files:**
- Create: `frontend/src/components/jobs/layout/JobsTopBar.tsx`

- [ ] **Step 1: Write `JobsTopBar.tsx`**

```tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Search } from "lucide-react";
import Link from "next/link";

/** Route config: maps pathname to top bar content */
function useTopBarConfig() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEdit = searchParams.get("edit");

  if (pathname === "/jobs" || pathname === "/jobs/") {
    return { mode: "browse" as const };
  }
  if (pathname.startsWith("/jobs/saved")) {
    return { mode: "sub" as const, title: "Saved Jobs", showPost: false };
  }
  if (pathname.startsWith("/jobs/my")) {
    return { mode: "sub" as const, title: "My Posts", showPost: true };
  }
  if (pathname.startsWith("/jobs/post")) {
    return { mode: "sub" as const, title: isEdit ? "Edit Job" : "Post a Job", showPost: false };
  }
  if (pathname.startsWith("/jobs/pipeline")) {
    return { mode: "sub" as const, title: "My Pipeline", showPost: false };
  }
  if (pathname.startsWith("/jobs/applications")) {
    return { mode: "sub" as const, title: "My Applications", showPost: false };
  }
  // /jobs/[id] — same as browse
  return { mode: "browse" as const };
}

export default function JobsTopBar() {
  const router = useRouter();
  const config = useTopBarConfig();

  return (
    <header className="flex items-center gap-3 px-4 h-14 shrink-0 sticky top-0 z-40 bg-[#080a10] border-b border-[#1e2235]">
      {/* Left */}
      {config.mode === "browse" ? (
        <Link
          href="/jobs"
          className="flex items-center gap-2 no-underline shrink-0 group"
        >
          <span
            className="w-7 h-7 rounded-lg grid place-items-center shrink-0 transition-shadow duration-200 group-hover:shadow-[0_0_14px_rgba(14,165,233,0.4)]"
            style={{ background: "linear-gradient(135deg, #0EA5E9, #0284C7)" }}
          >
            <span className="font-bold text-white text-[10px] leading-none">◆</span>
          </span>
          <span className="font-serif text-[18px] font-bold text-[#e8eaf2] tracking-tight hidden min-[860px]:block">
            Khosh Jobs
          </span>
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => router.push("/jobs")}
          className="flex items-center gap-1.5 border-0 bg-transparent text-[#636f8d] hover:text-[#e8eaf2] cursor-pointer transition-colors text-[13px] font-medium shrink-0"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          <span className="hidden min-[860px]:inline">Back</span>
        </button>
      )}

      {/* Center */}
      <div className="flex-1 flex justify-center">
        {config.mode === "browse" ? (
          <button
            type="button"
            onClick={() => {
              /* TODO: focus search in list panel */
            }}
            className="hidden min-[860px]:flex items-center gap-2 h-9 px-4 rounded-full border border-[#1e2235] bg-[#10131d] text-[13px] text-[#636f8d] w-[240px] hover:border-[#1e2235]/80 transition-colors cursor-text"
          >
            <Search size={13} strokeWidth={2} className="shrink-0" />
            Search jobs...
          </button>
        ) : (
          <h1 className="text-[14px] font-semibold text-[#e8eaf2] tracking-tight">
            {config.title}
          </h1>
        )}
      </div>

      {/* Right */}
      {(config.mode === "browse" || (config.mode === "sub" && config.showPost)) && (
        <Link
          href="/jobs/post"
          className="hidden min-[860px]:flex items-center gap-1.5 h-8 px-3.5 rounded-full border-0 bg-[#0EA5E9] text-white text-[12.5px] font-semibold no-underline transition-all duration-150 hover:brightness-110 active:scale-[0.97] shrink-0"
        >
          <Plus size={13} strokeWidth={2.5} />
          Post a Job
        </Link>
      )}
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/jobs/layout/JobsTopBar.tsx
git commit -m "feat(jobs): create JobsTopBar contextual top bar"
```

---

### Task 4: Create `JobsSidebar` component

Collapsible sidebar with nav items, badges, user footer, and mobile tab mode.

**Files:**
- Create: `frontend/src/components/jobs/layout/JobsSidebar.tsx`

- [ ] **Step 1: Write `JobsSidebar.tsx`**

```tsx
"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Search, Bookmark, Briefcase, LayoutGrid, FileText, PenLine,
  Settings, LogOut,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useMyJobs, useSavedJobs, useMyApplications } from "@/hooks/useJobs";
import { avatarSeed, initials } from "@/lib/workspaceUtils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  badge?: number | "dot";
  isCta?: boolean;
}

export default function JobsSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { total: savedTotal } = useSavedJobs(1);
  const { total: myJobsTotal } = useMyJobs(1);
  const { applications: myApps } = useMyApplications();

  const [menuOpen, setMenuOpen] = useState(false);
  const isPipeline = pathname.startsWith("/jobs/pipeline");

  const navItems: NavItem[] = [
    { label: "Browse", href: "/jobs", icon: Search },
    { label: "Saved", href: "/jobs/saved", icon: Bookmark, badge: savedTotal },
    { label: "My Posts", href: "/jobs/my", icon: Briefcase, badge: myJobsTotal },
    { label: "Pipeline", href: "/jobs/pipeline", icon: LayoutGrid },
    { label: "Applied", href: "/jobs/applications", icon: FileText },
  ];

  const isActive = (href: string) => {
    if (href === "/jobs") return pathname === "/jobs" || pathname === "/jobs/";
    return pathname.startsWith(href);
  };

  const isPostActive = pathname.startsWith("/jobs/post");

  const name = user?.display_name ?? user?.username ?? "User";
  const [av1, av2] = avatarSeed(user?.id ?? "guest");

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={`
          hidden min-[860px]:flex flex-col shrink-0 z-30
          bg-[#080a10] border-r border-[#1e2235]
          h-[calc(100dvh-3.5rem)] sticky top-14
          transition-[width] duration-200 ease-out
          ${isPipeline ? "w-[56px]" : "min-[1280px]:w-[220px] w-[56px]"}
        `}
      >
        <nav className="flex-1 overflow-y-auto px-2 min-[1280px]:px-3 pt-4 pb-3 flex flex-col gap-1 min-h-0">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            const isCollapsed = isPipeline || false; // CSS handles the 56px vs 220px
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                title={item.label}
                className={`
                  flex items-center gap-3 w-full h-11 rounded-lg
                  border-0 text-[13.5px] font-medium font-sans
                  cursor-pointer text-left transition-all duration-150
                  ${isPipeline ? "px-0 justify-center" : "min-[1280px]:px-4 px-0 min-[1280px]:justify-start justify-center"}
                  ${active
                    ? "bg-[#0EA5E9]/10 text-[#0EA5E9] font-semibold border-l-2 border-[#0EA5E9]"
                    : "text-[#636f8d] hover:bg-white/5 hover:text-[#e8eaf2]"
                  }
                `}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.6} />
                <span className={`flex-1 ${isPipeline ? "hidden" : "hidden min-[1280px]:inline"}`}>
                  {item.label}
                </span>
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className={`rounded-full text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] inline-flex items-center justify-center bg-[#0EA5E9]/15 text-[#0EA5E9] ${isPipeline ? "hidden" : "hidden min-[1280px]:inline-flex"}`}>
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Divider */}
          <div className="my-2 h-px bg-[#1e2235]" />

          {/* Post a Job CTA */}
          <button
            type="button"
            onClick={() => router.push("/jobs/post")}
            title="Post a Job"
            className={`
              flex items-center gap-3 w-full h-11 rounded-lg
              border text-[13.5px] font-medium font-sans
              cursor-pointer text-left transition-all duration-150
              ${isPipeline ? "px-0 justify-center" : "min-[1280px]:px-4 px-0 min-[1280px]:justify-start justify-center"}
              ${isPostActive
                ? "bg-[#0EA5E9]/10 text-[#0EA5E9] font-semibold border-l-2 border-[#0EA5E9] border-t-0 border-r-0 border-b-0"
                : "text-[#0EA5E9] border-[#0EA5E9]/20 hover:bg-[#0EA5E9]/5"
              }
            `}
          >
            <PenLine size={18} strokeWidth={1.6} />
            <span className={`flex-1 ${isPipeline ? "hidden" : "hidden min-[1280px]:inline"}`}>
              Post a Job
            </span>
          </button>
        </nav>

        {/* Footer */}
        <div className={`border-t border-[#1e2235] px-3 py-3 ${isPipeline ? "px-1" : "min-[1280px]:px-3 px-1"}`}>
          {/* User row */}
          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className={`
                  flex items-center gap-2.5 w-full border-0 bg-transparent cursor-pointer rounded-lg p-1.5 hover:bg-white/5 transition-colors
                  ${isPipeline ? "justify-center" : "min-[1280px]:justify-start justify-center"}
                `}
              >
                <span
                  className="w-7 h-7 rounded-full grid place-items-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: `linear-gradient(135deg,${av1},${av2})` }}
                >
                  {initials(name)}
                </span>
                <span className={`text-[12px] text-[#e8eaf2] font-medium truncate ${isPipeline ? "hidden" : "hidden min-[1280px]:inline"}`}>
                  {name}
                </span>
              </button>

              {/* Dropdown */}
              {menuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-[160px] rounded-xl p-1.5 border border-[#1e2235] bg-[#10131d] shadow-xl z-50">
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); router.push("/settings"); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg border-0 bg-transparent text-[#e8eaf2]/75 text-[13px] cursor-pointer text-left transition-colors hover:bg-white/5 hover:text-[#e8eaf2]"
                  >
                    <Settings size={14} strokeWidth={1.7} />
                    Settings
                  </button>
                  <div className="h-px bg-[#1e2235] mx-2 my-1" />
                  <button
                    type="button"
                    onClick={async () => { setMenuOpen(false); await logout(); router.push("/login"); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg border-0 bg-transparent text-[#f06b6b] text-[13px] cursor-pointer text-left transition-colors hover:bg-[#f06b6b]/10"
                  >
                    <LogOut size={14} strokeWidth={1.7} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Back to KhoshGolpo */}
          <button
            type="button"
            onClick={() => router.push("/threads")}
            className={`
              flex items-center gap-2 w-full mt-2 border-0 bg-transparent cursor-pointer text-[12px] text-[#636f8d] hover:text-[#e8eaf2] transition-colors
              ${isPipeline ? "justify-center" : "min-[1280px]:justify-start justify-center"}
            `}
          >
            <span className="text-[14px]">←</span>
            <span className={`${isPipeline ? "hidden" : "hidden min-[1280px]:inline"}`}>KhoshGolpo</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile tab bar ── */}
      <nav className="min-[860px]:hidden flex items-center gap-0 overflow-x-auto border-b border-[#1e2235] bg-[#080a10] px-2 shrink-0">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className={`
                shrink-0 px-3 h-10 text-[13px] font-medium border-0 bg-transparent cursor-pointer transition-colors whitespace-nowrap
                ${active
                  ? "text-[#0EA5E9] border-b-2 border-[#0EA5E9]"
                  : "text-[#636f8d] hover:text-[#e8eaf2]"
                }
              `}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/jobs/layout/JobsSidebar.tsx
git commit -m "feat(jobs): create JobsSidebar with nav, badges, footer, mobile tabs"
```

---

### Task 5: Create Jobs route group layout

Wire the shell into the Next.js route group.

**Files:**
- Create: `frontend/src/app/(jobs)/layout.tsx`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p "frontend/src/app/(jobs)/jobs"
```

- [ ] **Step 2: Write the layout**

```tsx
import type { ReactNode } from "react";
import JobsShell from "@/components/jobs/layout/JobsShell";
import { ToastProvider } from "@/components/ui/toast";

export default function JobsLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <JobsShell>{children}</JobsShell>
    </ToastProvider>
  );
}
```

- [ ] **Step 3: Verify the shell renders**

Run `npm run dev` in `frontend/`, navigate to `/jobs`. The new shell (dark bg, no community sidebar) should appear. There may be a 404 for the page content since the page files haven't been created yet.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/(jobs)/layout.tsx
git commit -m "feat(jobs): create (jobs) route group layout with JobsShell"
```

---

## Phase 2: List Panel & Job Card Updates

### Task 6: Create `JobsListPanel` reusable component

Shared list panel used by Browse, Saved, and My Posts pages. Handles the filter button, card list, and auto-selection.

**Files:**
- Create: `frontend/src/components/jobs/JobsListPanel.tsx`

- [ ] **Step 1: Write `JobsListPanel.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import JobCard from "./JobCard";
import type { JobPostOut } from "@/lib/jobsApi";

interface Props {
  jobs: JobPostOut[];
  total: number;
  isLoading: boolean;
  /** Currently selected job ID (from ?job= param) */
  selectedId: string | null;
  /** Callback when a card is clicked */
  onSelect: (jobId: string) => void;
  /** Callback to toggle save */
  onSaveToggle?: (jobId: string, saved: boolean) => void;
  /** Number of active filters (shown on filter button) */
  activeFilterCount?: number;
  /** Toggle filter panel visibility */
  onToggleFilters?: () => void;
  /** Show filters button? (hidden on Saved page) */
  showFilters?: boolean;
  /** Header title override (e.g. "Saved Jobs", "My Posts") */
  headerTitle?: string;
  /** Empty state content */
  emptyState?: React.ReactNode;
}

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
  const autoSelected = useRef(false);

  // Auto-select first job on initial load
  useEffect(() => {
    if (!autoSelected.current && jobs.length > 0 && !selectedId) {
      autoSelected.current = true;
      onSelect(jobs[0].id);
    }
  }, [jobs, selectedId, onSelect]);

  return (
    <div className="w-full min-[860px]:w-[300px] min-[1280px]:w-[300px] shrink-0 border-r border-[#1e2235] flex flex-col h-full max-[859px]:border-r-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-[#1e2235] shrink-0">
        <span className="text-[13px] font-medium text-[#e8eaf2]">
          {headerTitle ?? `${total} jobs`}
        </span>
        {showFilters && onToggleFilters && (
          <button
            type="button"
            onClick={onToggleFilters}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-[#1e2235] bg-transparent text-[12px] text-[#636f8d] hover:text-[#e8eaf2] hover:border-[#1e2235]/80 cursor-pointer transition-colors"
          >
            <SlidersHorizontal size={12} />
            Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
          </button>
        )}
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-[13px] text-[#636f8d]">
            Loading...
          </div>
        ) : jobs.length === 0 ? (
          emptyState ?? (
            <div className="flex items-center justify-center h-32 text-[13px] text-[#636f8d]">
              No jobs found
            </div>
          )
        ) : (
          jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              selected={job.id === selectedId}
              onClick={() => onSelect(job.id)}
              onSaveToggle={onSaveToggle ? (saved) => onSaveToggle(job.id, saved) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/jobs/JobsListPanel.tsx
git commit -m "feat(jobs): create reusable JobsListPanel component"
```

---

### Task 7: Update `JobCard` selected state

Update the selected visual treatment to match spec: left border + glow shadow.

**Files:**
- Modify: `frontend/src/components/jobs/JobCard.tsx`

- [ ] **Step 1: Read `JobCard.tsx` and locate the outer container className**

Read: `frontend/src/components/jobs/JobCard.tsx`

- [ ] **Step 2: Update the selected state classes**

Find the container div/button's className and update the selected state to use:
- `border-l-2 border-[#0EA5E9]` (left accent)
- `bg-[#141824]` (elevated bg)
- `shadow-[0_0_20px_rgba(14,165,233,0.08)]` (glow)

And add hover state:
- `hover:translate-y-[-1px] hover:shadow-md transition-all duration-150`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/jobs/JobCard.tsx
git commit -m "feat(jobs): update JobCard selected state with glow shadow"
```

---

### Task 8: Update `JobDetailPanel` — add break-words and auth banner

**Files:**
- Modify: `frontend/src/components/jobs/JobDetailPanel.tsx`

- [ ] **Step 1: Read the file**

Read: `frontend/src/components/jobs/JobDetailPanel.tsx`

- [ ] **Step 2: Add `break-words` to the description div (line ~206)**

Find:
```tsx
className="text-[13px] text-[#c5ccd6] leading-relaxed whitespace-pre-wrap"
```
Replace with:
```tsx
className="text-[13px] text-[#c5ccd6] leading-relaxed whitespace-pre-wrap break-words"
```

- [ ] **Step 3: Add auth banner for unauthenticated users**

Below the actions section (after the `{user && (` block that renders Apply/Save/Report), add:

```tsx
{!user && (
  <div className="flex items-center justify-between px-4 py-2.5 mt-3 rounded-lg bg-[#0EA5E9]/5 border border-[#0EA5E9]/20">
    <span className="text-[13px] text-[#636f8d]">Sign in to apply or save jobs</span>
    <a
      href="/login"
      className="text-[13px] font-medium text-[#0EA5E9] no-underline hover:underline"
    >
      Sign In →
    </a>
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/jobs/JobDetailPanel.tsx
git commit -m "feat(jobs): add break-words and auth banner to JobDetailPanel"
```

---

## Phase 3: Browse, Saved & SEO Pages

### Task 9: Create Browse page (`/jobs`)

The main Browse page with three-panel layout: list + detail via `?job=<id>`.

**Files:**
- Create: `frontend/src/app/(jobs)/jobs/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useJobs, useJob } from "@/hooks/useJobs";
import { saveJob, unsaveJob } from "@/lib/jobsApi";
import JobsListPanel from "@/components/jobs/JobsListPanel";
import JobDetailPanel from "@/components/jobs/JobDetailPanel";
import JobFilters from "@/components/jobs/JobFilters";
import { Search } from "lucide-react";

export default function JobsBrowsePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("job");

  const [filters, setFilters] = useState({
    search: "",
    job_type: "",
    experience_level: "",
    is_remote: false,
    salary_min: undefined as number | undefined,
    salary_max: undefined as number | undefined,
  });
  const [showFilters, setShowFilters] = useState(false);

  const { jobs, total, isLoading, mutate: mutateList } = useJobs(filters);

  const { job: selectedJob } = useJob(selectedId);

  const activeFilterCount = [
    filters.job_type,
    filters.experience_level,
    filters.is_remote,
    filters.salary_min,
    filters.salary_max,
  ].filter(Boolean).length;

  const handleSelect = useCallback((jobId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("job", jobId);
    router.replace(`/jobs?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleSaveToggle = useCallback(async (jobId: string, saved: boolean) => {
    if (saved) await unsaveJob(jobId);
    else await saveJob(jobId);
    mutateList();
  }, [mutateList]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* List panel */}
      <div className="flex flex-col shrink-0 max-[859px]:flex-1">
        {/* Filter panel (slide-down) */}
        {showFilters && (
          <div className="w-[300px] max-[859px]:w-full border-r border-[#1e2235] border-b border-[#1e2235] p-3 bg-[#080a10]">
            <JobFilters filters={filters} onChange={setFilters} />
          </div>
        )}
        <JobsListPanel
          jobs={jobs}
          total={total}
          isLoading={isLoading}
          selectedId={selectedId}
          onSelect={handleSelect}
          onSaveToggle={handleSaveToggle}
          activeFilterCount={activeFilterCount}
          onToggleFilters={() => setShowFilters((v) => !v)}
          emptyState={
            <div className="flex flex-col items-center justify-center h-48 text-[#636f8d] gap-3">
              <Search size={32} strokeWidth={1.2} />
              <p className="text-[13px]">
                {activeFilterCount > 0 ? "No jobs found" : "No jobs posted yet"}
              </p>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilters({ search: "", job_type: "", experience_level: "", is_remote: false, salary_min: undefined, salary_max: undefined })}
                  className="text-[12px] text-[#0EA5E9] border-0 bg-transparent cursor-pointer hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          }
        />
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-y-auto max-[859px]:hidden">
        {selectedJob ? (
          <JobDetailPanel
            job={selectedJob}
            onApplied={() => mutateList()}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[13px] text-[#636f8d]">
            Select a job to view details
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page renders at `/jobs`**

Run `npm run dev`, navigate to `/jobs`. The browse page should render inside the Jobs shell with the list panel on left and detail on right.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/(jobs)/jobs/page.tsx
git commit -m "feat(jobs): create Browse page with three-panel layout"
```

---

### Task 10: Create SEO canonical page (`/jobs/[id]`)

SSR-rendered job detail for external sharing. Client-side redirects to Browse view.

**Files:**
- Create: `frontend/src/app/(jobs)/jobs/[id]/page.tsx`

- [ ] **Step 1: Create the directory and write the page**

```bash
mkdir -p "frontend/src/app/(jobs)/jobs/[id]"
```

```tsx
"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useJob } from "@/hooks/useJobs";
import JobDetailPanel from "@/components/jobs/JobDetailPanel";

export default function JobCanonicalPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const { job, isLoading } = useJob(jobId);

  // On client, redirect to Browse view with job selected
  useEffect(() => {
    if (jobId && typeof window !== "undefined") {
      // Small delay to let SSR content render for perceived performance
      const timer = setTimeout(() => {
        router.replace(`/jobs?job=${jobId}`);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [jobId, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-[13px] text-[#636f8d]">
        Loading...
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center h-full text-[13px] text-[#636f8d]">
        Job not found
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <JobDetailPanel job={job} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/(jobs)/jobs/[id]/page.tsx
git commit -m "feat(jobs): create SEO canonical page with client-side redirect"
```

---

### Task 11: Create Saved Jobs page

**Files:**
- Create: `frontend/src/app/(jobs)/jobs/saved/page.tsx`

- [ ] **Step 1: Create the directory and write the page**

```bash
mkdir -p "frontend/src/app/(jobs)/jobs/saved"
```

```tsx
"use client";

import { useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useSavedJobs, useJob } from "@/hooks/useJobs";
import { unsaveJob } from "@/lib/jobsApi";
import JobsListPanel from "@/components/jobs/JobsListPanel";
import JobDetailPanel from "@/components/jobs/JobDetailPanel";

export default function SavedJobsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("job");

  // Auth guard
  useEffect(() => {
    if (user === null) router.replace("/login?next=/jobs/saved");
  }, [user, router]);

  const { jobs, total, isLoading, mutate } = useSavedJobs(1);

  const { job: selectedJob } = useJob(selectedId);

  const handleSelect = useCallback((jobId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("job", jobId);
    router.replace(`/jobs/saved?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleUnsave = useCallback(async (jobId: string) => {
    await unsaveJob(jobId);
    mutate();
  }, [mutate]);

  if (!user) return null;

  return (
    <div className="flex h-full overflow-hidden">
      <JobsListPanel
        jobs={jobs}
        total={total}
        isLoading={isLoading}
        selectedId={selectedId}
        onSelect={handleSelect}
        showFilters={false}
        headerTitle={`${total} saved`}
        emptyState={
          <div className="flex flex-col items-center justify-center h-48 text-[#636f8d] gap-3">
            <Bookmark size={32} strokeWidth={1.2} />
            <p className="text-[13px]">No saved jobs yet</p>
            <button
              type="button"
              onClick={() => router.push("/jobs")}
              className="text-[12px] text-[#0EA5E9] border-0 bg-transparent cursor-pointer hover:underline"
            >
              Browse Jobs
            </button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto max-[859px]:hidden">
        {selectedJob ? (
          <JobDetailPanel job={selectedJob} onApplied={() => mutate()} />
        ) : (
          <div className="flex items-center justify-center h-full text-[13px] text-[#636f8d]">
            Select a saved job to view details
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/(jobs)/jobs/saved/page.tsx
git commit -m "feat(jobs): create Saved Jobs page with auth guard"
```

---

## Phase 4: Employer Pages

### Task 12: Create `MyJobDetailPanel` component

Employer detail panel showing job stats, actions, and applicant breakdown.

**Files:**
- Create: `frontend/src/components/jobs/MyJobDetailPanel.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Eye, Bookmark, PenLine, XCircle, ArrowRight } from "lucide-react";
import type { JobPostOut } from "@/lib/jobsApi";
import { closeJob } from "@/lib/jobsApi";
import { useApplications } from "@/hooks/useJobs";

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-[#3dd68c]/15", text: "text-[#3dd68c]", label: "Active" },
  pending_review: { bg: "bg-[#f5b64a]/15", text: "text-[#f5b64a]", label: "Under Review" },
  closed: { bg: "bg-[#1e2235]", text: "text-[#636f8d]", label: "Closed" },
  rejected: { bg: "bg-[#f06b6b]/15", text: "text-[#f06b6b]", label: "Rejected" },
  draft: { bg: "bg-[#1e2235]", text: "text-[#636f8d]", label: "Draft" },
};

const STAGE_COLORS: Record<string, string> = {
  applied: "#7c73f0",
  screening: "#f0834a",
  interview: "#0EA5E9",
  offer: "#f5b64a",
  hired: "#3dd68c",
};

interface Props {
  job: JobPostOut;
  onJobUpdated?: () => void;
}

export default function MyJobDetailPanel({ job, onJobUpdated }: Props) {
  const router = useRouter();
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);

  // Fetch applications to get stage breakdown
  const { applications: apps } = useApplications(job.id);

  const stageBreakdown = Object.entries(STAGE_COLORS).map(([stage, color]) => ({
    stage,
    color,
    count: apps.filter((a) => a.stage === stage).length,
  }));
  const maxCount = Math.max(...stageBreakdown.map((s) => s.count), 1);

  const badge = STATUS_BADGES[job.status] ?? STATUS_BADGES.draft;
  const daysAgo = Math.floor((Date.now() - new Date(job.created_at).getTime()) / 86400000);

  async function handleClose() {
    setClosing(true);
    try {
      await closeJob(job.id);
      onJobUpdated?.();
    } finally {
      setClosing(false);
      setConfirmClose(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#080a10] p-5">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-[18px] font-bold text-[#e8eaf2]">{job.title}</h2>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-[#636f8d]">
          <span>Posted {daysAgo}d ago</span>
          <span className="flex items-center gap-1"><Users size={12} /> {job.application_count} applicants</span>
          <span className="flex items-center gap-1"><Bookmark size={12} /> {job.save_count} saved</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => router.push(`/jobs/pipeline?job=${job.id}`)}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#0EA5E9] text-white text-[13px] font-medium border-0 cursor-pointer hover:brightness-110 transition-all"
        >
          View Pipeline <ArrowRight size={14} />
        </button>
        <button
          type="button"
          onClick={() => router.push(`/jobs/post?edit=${job.id}`)}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-[#1e2235] bg-transparent text-[#e8eaf2] text-[13px] font-medium cursor-pointer hover:bg-white/5 transition-colors"
        >
          <PenLine size={14} /> Edit Job
        </button>
        {job.status === "active" && (
          <button
            type="button"
            onClick={() => setConfirmClose(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-[#f06b6b]/30 bg-[#f06b6b]/5 text-[#f06b6b] text-[13px] font-medium cursor-pointer hover:bg-[#f06b6b]/10 transition-colors ml-auto"
          >
            <XCircle size={14} /> Close Job
          </button>
        )}
      </div>

      {/* Applicant breakdown */}
      {apps.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[13px] font-semibold text-[#e8eaf2] mb-3">Applicant Breakdown</h3>
          <div className="flex flex-col gap-2">
            {stageBreakdown.map(({ stage, color, count }) => (
              <div key={stage} className="flex items-center gap-3">
                <span className="text-[12px] text-[#636f8d] w-[80px] capitalize">{stage}</span>
                <div className="flex-1 h-5 bg-[#10131d] rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-300"
                    style={{
                      width: `${(count / maxCount) * 100}%`,
                      backgroundColor: `${color}30`,
                      minWidth: count > 0 ? "24px" : "0",
                    }}
                  />
                </div>
                <span className="text-[12px] text-[#e8eaf2] font-medium w-[24px] text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Job description preview */}
      <details className="group">
        <summary className="text-[13px] font-semibold text-[#e8eaf2] cursor-pointer list-none flex items-center gap-2 mb-2">
          <span className="transition-transform group-open:rotate-90">▶</span>
          Job Description
        </summary>
        <div className="text-[13px] text-[#c5ccd6] leading-relaxed whitespace-pre-wrap break-words mt-2">
          {job.description}
        </div>
      </details>

      {/* Close confirmation dialog */}
      {confirmClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[400px] rounded-xl bg-[#10131d] border border-[#1e2235] p-6 shadow-xl">
            <h3 className="text-[16px] font-semibold text-[#e8eaf2] mb-2">Close this job posting?</h3>
            <p className="text-[13px] text-[#636f8d] mb-5 leading-relaxed">
              This will stop accepting new applications. Existing applications remain in your pipeline.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmClose(false)}
                className="h-9 px-4 rounded-lg border border-[#1e2235] bg-transparent text-[#e8eaf2] text-[13px] font-medium cursor-pointer hover:bg-white/5 transition-colors"
              >
                Keep Open
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={closing}
                className="h-9 px-4 rounded-lg bg-[#f06b6b]/15 text-[#f06b6b] border border-[#f06b6b]/30 text-[13px] font-medium cursor-pointer hover:bg-[#f06b6b]/25 transition-colors disabled:opacity-50"
              >
                {closing ? "Closing..." : "Close Job"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/jobs/MyJobDetailPanel.tsx
git commit -m "feat(jobs): create MyJobDetailPanel with stats, actions, breakdown"
```

---

### Task 13: Create My Posts page (`/jobs/my`)

**Files:**
- Create: `frontend/src/app/(jobs)/jobs/my/page.tsx`

- [ ] **Step 1: Create directory and write page**

```bash
mkdir -p "frontend/src/app/(jobs)/jobs/my"
```

```tsx
"use client";

import { useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Briefcase } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useMyJobs, useJob } from "@/hooks/useJobs";
import JobsListPanel from "@/components/jobs/JobsListPanel";
import MyJobDetailPanel from "@/components/jobs/MyJobDetailPanel";

export default function MyPostsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("job");

  useEffect(() => {
    if (user === null) router.replace("/login?next=/jobs/my");
  }, [user, router]);

  const { jobs, total, isLoading, mutate } = useMyJobs(1);

  const selectedJob = jobs.find((j) => j.id === selectedId) ?? null;

  const handleSelect = useCallback((jobId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("job", jobId);
    router.replace(`/jobs/my?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  if (!user) return null;

  return (
    <div className="flex h-full overflow-hidden">
      <JobsListPanel
        jobs={jobs}
        total={total}
        isLoading={isLoading}
        selectedId={selectedId}
        onSelect={handleSelect}
        showFilters={false}
        headerTitle={`${total} posts`}
        emptyState={
          <div className="flex flex-col items-center justify-center h-48 text-[#636f8d] gap-3">
            <Briefcase size={32} strokeWidth={1.2} />
            <p className="text-[13px]">You haven't posted any jobs</p>
            <button
              type="button"
              onClick={() => router.push("/jobs/post")}
              className="flex items-center gap-1 text-[12px] text-[#0EA5E9] border-0 bg-transparent cursor-pointer hover:underline"
            >
              + Post a Job
            </button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto max-[859px]:hidden">
        {selectedJob ? (
          <MyJobDetailPanel job={selectedJob} onJobUpdated={() => mutate()} />
        ) : (
          <div className="flex items-center justify-center h-full text-[13px] text-[#636f8d]">
            Select a job to view stats
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/(jobs)/jobs/my/page.tsx
git commit -m "feat(jobs): create My Posts page with MyJobDetailPanel"
```

---

### Task 14: Create Post/Edit Job page (`/jobs/post`)

**Files:**
- Create: `frontend/src/app/(jobs)/jobs/post/page.tsx`

- [ ] **Step 1: Create directory and write page**

```bash
mkdir -p "frontend/src/app/(jobs)/jobs/post"
```

```tsx
"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useJob } from "@/hooks/useJobs";
import JobPostForm from "@/components/jobs/JobPostForm";

export default function PostJobPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  useEffect(() => {
    if (user === null) router.replace("/login?next=/jobs/post");
  }, [user, router]);

  const { job: existingJob, isLoading } = useJob(editId);

  if (!user) return null;

  if (editId && isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-[13px] text-[#636f8d]">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto py-8 px-6">
        <JobPostForm
          existingJob={editId ? existingJob : undefined}
          onSuccess={() => router.push("/jobs/my")}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/(jobs)/jobs/post/page.tsx
git commit -m "feat(jobs): create Post/Edit Job page with auth guard"
```

---

## Phase 5: Pipeline (Kanban)

### Task 15: Create `KanbanCard` component

Individual applicant card inside a Kanban column.

**Files:**
- Create: `frontend/src/components/jobs/KanbanCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
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
      className={`
        rounded-lg bg-[#141824] border border-[#1e2235] p-3 mb-2
        transition-opacity duration-200
        ${isMoving ? "opacity-30" : "opacity-100"}
      `}
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
          <div className="text-[13px] font-semibold text-[#e8eaf2] truncate">{name}</div>
          {username && <div className="text-[11px] text-[#636f8d] truncate">@{username}</div>}
        </div>
      </div>

      {/* Pipeline meta */}
      <div className="text-[11px] text-[#636f8d] mb-2.5">
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
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-[#1e2235] bg-transparent text-[11px] text-[#636f8d] hover:text-[#e8eaf2] hover:border-[#1e2235]/80 cursor-pointer transition-colors disabled:opacity-50 w-full justify-between"
          >
            Move <ChevronDown size={12} />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-full rounded-lg bg-[#10131d] border border-[#1e2235] shadow-xl z-20 py-1">
              <button
                type="button"
                onClick={() => { setDropdownOpen(false); onViewProfile(application.applicant_id); }}
                className="w-full text-left px-3 py-1.5 text-[12px] text-[#e8eaf2] hover:bg-white/5 cursor-pointer border-0 bg-transparent"
              >
                <User size={12} className="inline mr-1.5" />
                View Profile
              </button>
              <div className="h-px bg-[#1e2235] my-1" />
              {nextStages.map((stage) => (
                <button
                  key={stage}
                  type="button"
                  onClick={() => { setDropdownOpen(false); onMoveStage(stage); }}
                  className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-white/5 cursor-pointer border-0 bg-transparent capitalize ${stage === "rejected" ? "text-[#f06b6b]" : "text-[#e8eaf2]"}`}
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/jobs/KanbanCard.tsx
git commit -m "feat(jobs): create KanbanCard with Move dropdown"
```

---

### Task 16: Create `KanbanColumn` component

Single stage column with accent-colored header and card list.

**Files:**
- Create: `frontend/src/components/jobs/KanbanColumn.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import type { ApplicationOut, ApplicationStage } from "@/lib/jobsApi";
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
}

export default function KanbanColumn({ stage, applications, onMoveStage, onViewProfile, movingAppId }: Props) {
  const color = STAGE_COLORS[stage] ?? "#636f8d";

  return (
    <div className="w-[200px] shrink-0 flex flex-col h-full">
      {/* Header */}
      <div
        className="px-3 py-2.5 border-b border-[#1e2235] shrink-0"
        style={{ borderTop: `2px solid ${color}` }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-[#e8eaf2] capitalize">{stage}</span>
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
          <div className="text-[11px] text-[#636f8d] text-center py-4">No applicants</div>
        ) : (
          applications.map((app) => (
            <KanbanCard
              key={app.id}
              application={app}
              onMoveStage={(newStage, note) => onMoveStage(app.id, newStage, note)}
              onViewProfile={onViewProfile}
              isMoving={movingAppId === app.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/jobs/KanbanColumn.tsx
git commit -m "feat(jobs): create KanbanColumn with accent header"
```

---

### Task 17: Create `KanbanBoard` component

Container with horizontal scroll, rejected toggle, and columns.

**Files:**
- Create: `frontend/src/components/jobs/KanbanBoard.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import type { ApplicationOut, ApplicationStage } from "@/lib/jobsApi";
import KanbanColumn from "./KanbanColumn";

const VISIBLE_STAGES: ApplicationStage[] = ["applied", "screening", "interview", "offer", "hired"];

interface Props {
  applications: ApplicationOut[];
  onMoveStage: (appId: string, newStage: ApplicationStage, note?: string) => void;
  onViewProfile: (userId: string) => void;
  movingAppId?: string | null;
}

export default function KanbanBoard({ applications, onMoveStage, onViewProfile, movingAppId }: Props) {
  const [showRejected, setShowRejected] = useState(false);

  const rejectedCount = applications.filter((a) => a.stage === "rejected").length;

  const stages: ApplicationStage[] = showRejected
    ? [...VISIBLE_STAGES, "rejected"]
    : VISIBLE_STAGES;

  return (
    <div className="flex flex-col h-full">
      {/* Board header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e2235] shrink-0">
        <span className="text-[12px] text-[#636f8d]">
          {applications.length} total applicants
        </span>
        {rejectedCount > 0 && (
          <button
            type="button"
            onClick={() => setShowRejected((v) => !v)}
            className="text-[12px] text-[#636f8d] border-0 bg-transparent cursor-pointer hover:text-[#e8eaf2] transition-colors"
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
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/jobs/KanbanBoard.tsx
git commit -m "feat(jobs): create KanbanBoard with rejected toggle"
```

---

### Task 18: Create `JobsRail` component

Vertical list of employer's posted jobs for switching between pipelines.

**Files:**
- Create: `frontend/src/components/jobs/JobsRail.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { Briefcase } from "lucide-react";
import type { JobPostOut } from "@/lib/jobsApi";

interface Props {
  jobs: JobPostOut[];
  selectedId: string | null;
  onSelect: (jobId: string) => void;
  isLoading: boolean;
}

export default function JobsRail({ jobs, selectedId, onSelect, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="w-[200px] shrink-0 border-r border-[#1e2235] flex items-center justify-center text-[13px] text-[#636f8d]">
        Loading...
      </div>
    );
  }

  return (
    <div className="w-[200px] shrink-0 border-r border-[#1e2235] flex flex-col h-full overflow-y-auto">
      <div className="px-3 py-2.5 border-b border-[#1e2235] shrink-0">
        <span className="text-[12px] font-semibold text-[#e8eaf2]">Your Jobs</span>
      </div>
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-[#636f8d] gap-2 p-4">
          <Briefcase size={24} strokeWidth={1.2} />
          <p className="text-[12px] text-center">No posted jobs</p>
        </div>
      ) : (
        jobs.map((job) => (
          <button
            key={job.id}
            type="button"
            onClick={() => onSelect(job.id)}
            className={`
              w-full text-left px-3 py-3 border-0 cursor-pointer transition-colors
              ${job.id === selectedId
                ? "bg-[#0EA5E9]/10 text-[#0EA5E9] border-l-2 border-[#0EA5E9]"
                : "bg-transparent text-[#e8eaf2] hover:bg-white/5"
              }
            `}
          >
            <div className="text-[13px] font-medium truncate">{job.title}</div>
            <div className="text-[11px] text-[#636f8d] mt-0.5">
              {job.application_count} applicants
            </div>
          </button>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/jobs/JobsRail.tsx
git commit -m "feat(jobs): create JobsRail for pipeline job switching"
```

---

### Task 19: Create Pipeline page (`/jobs/pipeline`)

**Files:**
- Create: `frontend/src/app/(jobs)/jobs/pipeline/page.tsx`

- [ ] **Step 1: Create directory and write page**

```bash
mkdir -p "frontend/src/app/(jobs)/jobs/pipeline"
```

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useMyJobs, useApplications } from "@/hooks/useJobs";
import { moveApplicationStage } from "@/lib/jobsApi";
import type { ApplicationStage } from "@/lib/jobsApi";
import JobsRail from "@/components/jobs/JobsRail";
import KanbanBoard from "@/components/jobs/KanbanBoard";

export default function PipelinePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const selectedJobId = searchParams.get("job");
  const [movingAppId, setMovingAppId] = useState<string | null>(null);

  useEffect(() => {
    if (user === null) router.replace("/login?next=/jobs/pipeline");
  }, [user, router]);

  const { jobs: myJobs, isLoading: jobsLoading } = useMyJobs(1);

  // Auto-select first job if none selected
  useEffect(() => {
    if (!selectedJobId && myJobs.length > 0) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("job", myJobs[0].id);
      router.replace(`/jobs/pipeline?${params.toString()}`, { scroll: false });
    }
  }, [selectedJobId, myJobs, router, searchParams]);

  const { applications, isLoading: appsLoading, mutate: mutateApps } = useApplications(selectedJobId);

  const handleSelectJob = useCallback((jobId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("job", jobId);
    router.replace(`/jobs/pipeline?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleMoveStage = useCallback(async (appId: string, newStage: ApplicationStage, note?: string) => {
    if (!selectedJobId) return;
    setMovingAppId(appId);
    try {
      await moveApplicationStage(selectedJobId, appId, newStage, note);
      mutateApps();
    } finally {
      setMovingAppId(null);
    }
  }, [selectedJobId, mutateApps]);

  const handleViewProfile = useCallback((userId: string) => {
    window.open(`/profile/${userId}`, "_blank");
  }, []);

  if (!user) return null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Jobs Rail — hidden on mobile, replaced by dropdown */}
      <div className="hidden min-[860px]:block">
        <JobsRail
          jobs={myJobs}
          selectedId={selectedJobId}
          onSelect={handleSelectJob}
          isLoading={jobsLoading}
        />
      </div>

      {/* Mobile job selector */}
      <div className="min-[860px]:hidden w-full px-3 py-2 border-b border-[#1e2235] shrink-0">
        <select
          value={selectedJobId ?? ""}
          onChange={(e) => handleSelectJob(e.target.value)}
          className="w-full h-9 bg-[#151927] border border-[#1e2235] rounded-lg text-[13px] text-white px-3"
        >
          {myJobs.map((job) => (
            <option key={job.id} value={job.id}>{job.title} ({job.application_count})</option>
          ))}
        </select>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 min-w-0">
        {!selectedJobId ? (
          <div className="flex flex-col items-center justify-center h-full text-[#636f8d] gap-3">
            <Users size={32} strokeWidth={1.2} />
            <p className="text-[13px]">Select a job to view its pipeline</p>
          </div>
        ) : appsLoading ? (
          <div className="flex items-center justify-center h-full text-[13px] text-[#636f8d]">
            Loading applications...
          </div>
        ) : (
          <KanbanBoard
            applications={applications}
            onMoveStage={handleMoveStage}
            onViewProfile={handleViewProfile}
            movingAppId={movingAppId}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/(jobs)/jobs/pipeline/page.tsx
git commit -m "feat(jobs): create Pipeline page with JobsRail + KanbanBoard"
```

---

## Phase 6: Applications Page

### Task 20: Create Applications page (`/jobs/applications`)

Candidate's view of all their applications.

**Files:**
- Create: `frontend/src/app/(jobs)/jobs/applications/page.tsx`

- [ ] **Step 1: Create directory and write page**

```bash
mkdir -p "frontend/src/app/(jobs)/jobs/applications"
```

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useMyApplications } from "@/hooks/useJobs";
import ApplicationStatusBadge from "@/components/jobs/ApplicationStatusBadge";
import type { MyApplicationOut } from "@/lib/jobsApi";
import { TERMINAL_STAGES } from "@/lib/jobsApi";

function ApplicationRow({ app }: { app: MyApplicationOut }) {
  const daysAgo = Math.floor(
    (Date.now() - new Date(app.created_at).getTime()) / 86400000
  );

  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-[#1e2235] hover:bg-white/[0.02] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-[#e8eaf2] truncate">{app.job_title}</div>
        <div className="text-[12px] text-[#636f8d] mt-0.5">{app.company_name} · {daysAgo}d ago</div>
      </div>
      <ApplicationStatusBadge stage={app.stage} />
    </div>
  );
}

export default function ApplicationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user === null) router.replace("/login?next=/jobs/applications");
  }, [user, router]);

  const { applications, isLoading } = useMyApplications();
  const apps = applications ?? [];

  const activeApps = apps.filter((a) => !TERMINAL_STAGES.includes(a.stage));
  const completedApps = apps.filter((a) => TERMINAL_STAGES.includes(a.stage));

  if (!user) return null;

  return (
    <div className="flex-1 overflow-y-auto">
      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-[13px] text-[#636f8d]">Loading...</div>
      ) : apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-[#636f8d] gap-3 mt-16">
          <FileText size={32} strokeWidth={1.2} />
          <p className="text-[13px]">No applications yet</p>
          <button
            type="button"
            onClick={() => router.push("/jobs")}
            className="text-[12px] text-[#0EA5E9] border-0 bg-transparent cursor-pointer hover:underline"
          >
            Browse Jobs
          </button>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto py-6">
          {activeApps.length > 0 && (
            <div className="mb-8">
              <h2 className="text-[13px] font-semibold text-[#636f8d] uppercase tracking-wider px-5 mb-2">
                Active ({activeApps.length})
              </h2>
              {activeApps.map((app) => <ApplicationRow key={app.id} app={app} />)}
            </div>
          )}
          {completedApps.length > 0 && (
            <div>
              <h2 className="text-[13px] font-semibold text-[#636f8d] uppercase tracking-wider px-5 mb-2">
                Completed ({completedApps.length})
              </h2>
              {completedApps.map((app) => <ApplicationRow key={app.id} app={app} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/(jobs)/jobs/applications/page.tsx
git commit -m "feat(jobs): create Applications page for candidates"
```

---

## Phase 7: Cleanup & Migration

### Task 21: Delete old `(app)/jobs/*` routes and workspace components

Remove the old files that are now replaced by the `(jobs)` route group.

**Files to delete:**
- `frontend/src/app/(app)/jobs/page.tsx`
- `frontend/src/app/(app)/jobs/[id]/page.tsx`
- `frontend/src/app/(app)/jobs/my/page.tsx`
- `frontend/src/app/(app)/jobs/post/page.tsx`
- `frontend/src/app/(app)/jobs/applications/page.tsx`
- `frontend/src/components/jobs/JobsWorkspace.tsx`
- `frontend/src/components/jobs/MyJobsWorkspace.tsx`
- `frontend/src/components/jobs/MyApplicationsWorkspace.tsx`
- `frontend/src/components/jobs/ApplicationPipelineBoard.tsx`

- [ ] **Step 1: Delete old route files**

```bash
rm -f "frontend/src/app/(app)/jobs/page.tsx"
rm -f "frontend/src/app/(app)/jobs/[id]/page.tsx"
rm -rf "frontend/src/app/(app)/jobs/[id]"
rm -f "frontend/src/app/(app)/jobs/my/page.tsx"
rm -rf "frontend/src/app/(app)/jobs/my"
rm -f "frontend/src/app/(app)/jobs/post/page.tsx"
rm -rf "frontend/src/app/(app)/jobs/post"
rm -f "frontend/src/app/(app)/jobs/applications/page.tsx"
rm -rf "frontend/src/app/(app)/jobs/applications"
rmdir "frontend/src/app/(app)/jobs" 2>/dev/null || true
```

- [ ] **Step 2: Delete old workspace components**

```bash
rm -f "frontend/src/components/jobs/JobsWorkspace.tsx"
rm -f "frontend/src/components/jobs/MyJobsWorkspace.tsx"
rm -f "frontend/src/components/jobs/MyApplicationsWorkspace.tsx"
rm -f "frontend/src/components/jobs/ApplicationPipelineBoard.tsx"
```

- [ ] **Step 3: Check for broken imports**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -40
```

Fix any import errors referencing deleted files.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(jobs): remove old (app)/jobs routes and workspace components"
```

---

### Task 22: Mobile enhancements — top bar override + pipeline accordion

The spec requires two mobile-specific behaviors that aren't covered by the desktop implementations above.

**Files:**
- Modify: `frontend/src/components/jobs/layout/JobsTopBar.tsx`
- Modify: `frontend/src/app/(jobs)/jobs/pipeline/page.tsx`

- [ ] **Step 1: Add mobile detail view override to `JobsTopBar`**

In `JobsTopBar.tsx`, the `useTopBarConfig` function should detect when on mobile and viewing `/jobs/[id]`. Since the SEO page redirects to `/jobs?job=<id>`, the mobile override actually applies when any page has a `?job=` param AND the viewport is `<860px`. However, this is complex to implement in the top bar alone (requires media query detection in JS).

**Simpler approach:** On mobile, the Browse page hides the detail panel entirely and navigates to `/jobs/[id]` for full-screen detail. The SEO page (`/jobs/[id]`) should NOT redirect on mobile — instead it renders full-screen detail with a back button. Update the `[id]/page.tsx`:

In `frontend/src/app/(jobs)/jobs/[id]/page.tsx`, change the redirect logic:

```tsx
// On client, redirect to Browse view with job selected — desktop only
useEffect(() => {
  if (jobId && typeof window !== "undefined" && window.innerWidth >= 860) {
    const timer = setTimeout(() => {
      router.replace(`/jobs?job=${jobId}`);
    }, 100);
    return () => clearTimeout(timer);
  }
}, [jobId, router]);
```

Then in `useTopBarConfig`, add detection for `/jobs/[id]` on narrow viewports:

```tsx
// Must be checked before the fallback browse return at the end
if (/^\/jobs\/[a-f0-9]+/.test(pathname) && !pathname.includes("/saved") && !pathname.includes("/my")) {
  return { mode: "detail" as const, title: "" }; // title filled dynamically
}
```

And in the render, handle `mode === "detail"`:
```tsx
{config.mode === "detail" && (
  <button onClick={() => router.back()} className="...">
    <ArrowLeft size={16} /> Back
  </button>
)}
```

- [ ] **Step 2: Add mobile accordion to Pipeline page**

In `frontend/src/app/(jobs)/jobs/pipeline/page.tsx`, below the `<KanbanBoard>` render, add a mobile-only accordion view:

```tsx
{/* Mobile accordion view */}
<div className="min-[860px]:hidden flex-1 overflow-y-auto">
  {["applied", "screening", "interview", "offer", "hired"].map((stage, i) => {
    const stageApps = applications.filter((a) => a.stage === stage);
    return (
      <details key={stage} open={i === 0}>
        <summary className="flex items-center justify-between px-4 py-3 border-b border-[#1e2235] cursor-pointer text-[13px] font-semibold text-[#e8eaf2] capitalize">
          {stage}
          <span className="text-[11px] font-bold text-[#636f8d]">{stageApps.length}</span>
        </summary>
        <div className="px-3 py-2">
          {stageApps.length === 0 ? (
            <p className="text-[12px] text-[#636f8d] py-2 text-center">No applicants</p>
          ) : (
            stageApps.map((app) => (
              <KanbanCard
                key={app.id}
                application={app}
                onMoveStage={(newStage, note) => handleMoveStage(app.id, newStage, note)}
                onViewProfile={handleViewProfile}
                isMoving={movingAppId === app.id}
              />
            ))
          )}
        </div>
      </details>
    );
  })}
</div>
```

And wrap the existing `<KanbanBoard>` with `<div className="hidden min-[860px]:block flex-1 min-w-0">`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/jobs/layout/JobsTopBar.tsx frontend/src/app/(jobs)/jobs/\[id\]/page.tsx frontend/src/app/(jobs)/jobs/pipeline/page.tsx
git commit -m "feat(jobs): add mobile top bar override and pipeline accordion"
```

---

> **Spec deviation note (Applications page):** The spec defines a `?app=<id>` three-panel layout for `/jobs/applications`. However, `MyApplicationOut` has limited fields (job_title, company_name, stage, stage_history) — not enough for a rich detail panel. The existing `MyApplicationsWorkspace` also uses a flat list with expandable rows. Task 20 follows the existing pattern with Active/Completed sections. A full three-panel layout can be added later if the API returns richer application detail data.

---

### Task 23: Smoke test the full flow

- [ ] **Step 1: Start the dev server and verify no build errors**

```bash
cd frontend && npm run dev
```

- [ ] **Step 2: Test Browse**

Navigate to `/jobs`. Verify:
- Jobs shell renders (no community sidebar/navbar)
- "Khosh Jobs" wordmark in top bar
- Sidebar with Browse/Saved/My Posts/Pipeline/Applied
- List panel shows job cards
- First job auto-selected, detail panel visible
- Click different jobs — URL updates to `?job=<id>`
- Filters toggle works

- [ ] **Step 3: Test sub-pages**

- `/jobs/saved` — auth guard redirects if not logged in; shows saved jobs
- `/jobs/my` — shows posted jobs with `MyJobDetailPanel` stats
- `/jobs/post` — shows job creation form
- `/jobs/pipeline` — shows JobsRail + KanbanBoard
- `/jobs/applications` — shows candidate applications

- [ ] **Step 4: Test navigation**

- Sidebar nav items highlight correctly
- `← Back` on sub-pages goes to `/jobs`
- `← KhoshGolpo` goes to `/threads`
- `+ Post a Job` button works in top bar and sidebar

- [ ] **Step 5: Test responsive**

Resize to `<860px`:
- Sidebar becomes horizontal tab bar
- List panel goes full width
- Pipeline shows accordion (if implemented) or dropdown selector

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix(jobs): smoke test fixes for Khosh Jobs layout"
```
