# Khosh Jobs — Separate Layout Design Spec

**Date:** 2026-03-23
**Status:** Approved for implementation
**Scope:** Full layout and shell redesign for the `/jobs/*` product surface

---

## Table of Contents

1. [Overview](#overview)
2. [Route Architecture](#route-architecture)
3. [Shell Structure](#shell-structure)
4. [Components](#components)
   - [JobsTopBar](#1-jobstopbar)
   - [JobsSidebar](#2-jobssidebar)
   - [Three-Panel Content Area](#3-three-panel-content-area)
   - [Pipeline Page](#4-pipeline-page)
   - [Mobile Layout](#5-mobile-layout)
5. [Visual Design](#visual-design)
6. [Key Files to Create / Modify](#key-files-to-create--modify)
7. [Out of Scope (V1)](#out-of-scope-v1)

---

## Overview

Khosh Jobs is a completely independent product surface within KhoshGolpo. It lives at `/jobs/*` but has its own full-screen shell — no `AppNavbar`, no `AppSidebar` from the main community. It feels like a separate professional app (similar to how Figma feels separate from figma.com).

The goals of this redesign are:

- Give Jobs a distinct identity that signals "professional hiring tool" vs the community feed.
- Eliminate layout inheritance from `(app)/layout.tsx` so Jobs can own its full viewport.
- Establish a scalable three-panel desktop pattern (sidebar + list + detail) and a graceful mobile collapse strategy.
- Keep all URLs at `/jobs/*` — route groups in Next.js do not affect URLs.

---

## Route Architecture

Jobs moves out of `app/(app)/` into its own route group `app/(jobs)/`:

```
app/
├── (app)/
│   ├── layout.tsx              ← AppShell (community: sidebar + navbar)
│   ├── threads/
│   ├── messages/
│   └── people/
│
└── (jobs)/
    ├── layout.tsx              ← JobsShell (fully independent, no AppShell)
    └── jobs/
        ├── page.tsx            → Browse (list + detail via `?job=<id>` query param)
        ├── [id]/page.tsx       → SEO/share canonical page (SSR job detail; client-side redirects to `/jobs?job=<id>`)
        ├── saved/page.tsx      → Saved jobs (list + detail via `?job=<id>`)
        ├── my/page.tsx         → My Posted Jobs (list + detail via `?job=<id>`)
        ├── post/page.tsx       → Post a Job form (create mode); also handles edit mode via `?edit=<id>` query param
        ├── pipeline/page.tsx   → Kanban Pipeline (rail + board via `?job=<id>` to select which job's pipeline)
        └── applications/page.tsx → My Applications (list + detail via `?app=<id>`)
```

> URLs remain `/jobs/*`. Route groups (`(jobs)`) are a Next.js layout-scoping mechanism only and do not appear in the URL.

> **Route priority note:** Next.js gives static segments (`/jobs/saved`, `/jobs/my`, `/jobs/post`, `/jobs/pipeline`, `/jobs/applications`) priority over the dynamic segment (`/jobs/[id]`). The `[id]` page only matches when no static segment matches. Do not add logic to `[id]/page.tsx` that attempts to handle these named routes — they will never reach it.

### URL State Pattern

All three-panel pages use **query params** to track the selected item in the URL:

| Page | Query param | Example |
|---|---|---|
| Browse | `?job=<id>` | `/jobs?job=67abc123` |
| Saved | `?job=<id>` | `/jobs/saved?job=67abc123` |
| My Posts | `?job=<id>` | `/jobs/my?job=67abc123` |
| Pipeline | `?job=<id>` | `/jobs/pipeline?job=67abc123` (selects which job's pipeline to show) |
| Applications | `?app=<id>` | `/jobs/applications?app=67abc123` |

This pattern ensures:
- Selected item survives browser refresh
- Deep-linkable and shareable URLs
- No page transitions when clicking list items (just param update)
- Browser back/forward cycles through selections

**`/jobs/[id]` — canonical deep-link page:**
This route exists solely for SEO and external sharing (e.g. posting a job link on social media). It SSR-renders the full job detail as a standalone page. On the client, after hydration, it redirects to `/jobs?job=<id>` to enter the three-panel Browse experience. Do NOT use this route for in-app navigation — all in-app job clicks update the `?job=` query param instead.

---

## Shell Structure

### JobsShell — `app/(jobs)/layout.tsx`

```
<JobsShell>
  <JobsTopBar />                   ← sticky h-14, contextual per route
  <div class="flex h-[calc(100dvh-3.5rem)]">
    <JobsSidebar />                ← w-[220px] at ≥1280px non-pipeline; w-[56px] at 860–1279px OR pipeline route; hidden on mobile
    <main class="flex-1 overflow-hidden">
      {children}
    </main>
  </div>
</JobsShell>
```

The shell background is `#080a10`. The top bar and sidebar share this background and are visually separated from content panels by `1px` borders (`#1e2235`) rather than color contrast.

---

## Components

### 1. JobsTopBar

Sticky `h-14` top bar. Its content is contextual per route.

| Route | Left (desktop) | Center (desktop) | Right (desktop) | Mobile override |
|---|---|---|---|---|
| `/jobs` (Browse) | `◆ Khosh Jobs` wordmark | `🔍 Search jobs...` pill | `[+ Post a Job]` | Same as desktop |
| `/jobs/[id]` (Browse + selected) | `◆ Khosh Jobs` wordmark | `🔍 Search jobs...` pill | `[+ Post a Job]` | `← Back` · job title (truncated) · no right action; tab bar hidden |
| `/jobs/saved` | `← Back` | `Saved Jobs` title | — | Same |
| `/jobs/my` | `← Back` | `My Posts` title | `[+ Post a Job]` | Same |
| `/jobs/post` (create) | `← Back` | `Post a Job` title | — | Same |
| `/jobs/post?edit=<id>` (edit) | `← Back` | `Edit Job` title | — | Same |
| `/jobs/pipeline` | `← Back` | `My Pipeline` title | — | Same |
| `/jobs/applications` | `← Back` | `My Applications` title | — | Same |

**Details:**

- The `◆` diamond icon uses a sky-blue gradient (`#0EA5E9`) — it is the sub-brand identity mark.
- Wordmark uses **DM Serif Display 18px**.
- `← Back` navigates to `/jobs` (Browse) on all sub-pages.
- `+ Post a Job` button: sky-blue filled pill — `bg-primary text-white`.
- Top bar is separated from content by `border-b border-[#1e2235]`.
- On mobile, the `/jobs/[id]` full-screen detail view overrides the entire top bar (no second bar). The tab bar is hidden during this view and restored on back navigation. `← Back` calls `router.back()`.

---

### 2. JobsSidebar

**Widths:**

| Viewport | Width | State |
|---|---|---|
| `≥1280px` (non-pipeline) | `220px` | Full — icons + labels |
| `860–1279px` or Pipeline route | `56px` | Collapsed — icons only |
| `<860px` | hidden | Replaced by mobile tab bar |

**Nav items:**

```
[Search icon]    Browse
[Bookmark icon]  Saved          [count badge]
[Briefcase icon] My Posts       [active jobs count badge]
[Kanban icon]    Pipeline       [new applicants badge — unread only]
[FileText icon]  Applied        [● update dot — stage change signal]
─────────────────────────────
[PenLine icon]   Post a Job     ← CTA-styled row (sky-blue text, no active state)
```

The **Post a Job** row is visually distinct from nav items — it uses `text-primary` always (never muted) and has a subtle `border border-primary/20 rounded-lg` treatment to signal it's an action, not a destination. It navigates to `/jobs/post` (and `/jobs/post?edit=<id>` for editing).

**Active state on `/jobs/post`:** The CTA row drops its border treatment and switches to the standard active nav style (`bg-primary/10` fill + `border-l-2 border-primary` left accent) — the two treatments do not stack. The `text-primary` color is unchanged. This makes it clear which page is active while keeping visual consistency with the other nav items.

**Nav item design:**

- Row height `h-11`, `px-4`, `rounded-lg`, `gap-3` between icon and label.
- **Active state:** full-row bg pill `bg-primary/10` + `text-primary` + `border-l-2 border-primary`.
- **Inactive state:** `text-muted-foreground`; hover `bg-white/5`.
- **Badges:** `bg-primary/15 text-primary` pill — shows meaningful counts only (unread/new events, not raw totals).
- **Applied tab signal:** colored dot (not a number) when an employer has moved your application to a new stage.

**Collapsed state (`56px`):**

- Icons only, centered horizontally, labels hidden.
- Tooltips on hover show the label.
- Badges remain visible as dots.

**Sidebar footer:**

```
[avatar 28px]  Display Name  ▾    ← dropdown: Settings, Sign out
────────────────────────────────
← KhoshGolpo                     ← muted text; hover brightens; navigates to /threads
```

---

### 3. Three-Panel Content Area

Applies to Browse, Saved, and Applied routes.

**Panel widths by viewport:**

| Viewport | Jobs Sidebar | List Panel | Detail Panel |
|---|---|---|---|
| `≥1280px` | `220px` | `300px` | `flex-1` (~760px+) |
| `860–1279px` | `56px` | `320px` | `flex-1` (~500px+) |
| `<860px` | hidden | full-screen (list or detail) | full-screen (list or detail) |

> **Width change from existing code:** `JobsWorkspace.tsx` currently uses `w-[320px]`. This spec deliberately reduces the list panel to `w-[300px]` to give the detail panel more breathing room. This is an intentional design decision.

**List Panel (`w-[300px]`, independently scrollable):**

- Sticky list header: result count + `[Filters]` button; when filters are active the button reads `[Filters · 2]` (count of active filters).
- Filters open in a **slide-down panel within the list column** on desktop (drops below the list header, pushes cards down); **bottom sheet** on mobile.
- `JobCard` list — clicking a card updates the URL to `?job=<id>` and highlights the card.
- On initial page load, the first job is auto-selected (no empty detail state on first visit).

**Detail Panel (`flex-1`, independently scrollable):**

- Renders `JobDetailPanel` when `?job=<id>` is present in the URL.
- Empty state only shown if the job list itself is empty (no results).
- Description text uses `whitespace-pre-wrap break-words` to prevent overflow.
- The top bar and sidebar remain fixed while this panel scrolls internally.

**JobCard anatomy:**

```
[company logo 36px]  [Job Title 14px semibold]          [Full-time badge — colored]
                     [Company · Location · 3d ago]       [Senior badge — neutral]
                     [$50k–$80k · Remote]
```

**JobCard states:**

- **Hover:** `translateY(-1px)` + shadow lift (`150ms ease`).
- **Selected:** `border-l-2 border-primary` + `bg-[#141824]` + `box-shadow: 0 0 20px rgba(14,165,233,0.08)`.

**My Posts — Detail Panel (`MyJobDetailPanel`):**

When a user clicks one of their posted jobs on `/jobs/my`, the detail panel renders `MyJobDetailPanel` — a new component distinct from `JobDetailPanel`. It shows:

```
[Job title + status badge (active/closed/pending_review)]
[Posted X days ago · Y applicants · Z saved]
─────────────────────────────────────────────
[View Pipeline →]   [Edit Job]   [Close Job]   ← action row
─────────────────────────────────────────────
Applicant breakdown:
  Applied    ██████  8
  Screening  ████    5
  Interview  ███     4
  Offer      █       1
─────────────────────────────────────────────
[Job description preview — read-only, collapsible]
```

- `View Pipeline →` navigates to `/jobs/pipeline` with this job pre-selected.
- `Edit Job` navigates to `/jobs/post?edit=<id>` (the post form in edit mode).
- `Close Job` triggers a confirmation dialog then calls `closeJob(id)`.
- This is a new file: `frontend/src/components/jobs/MyJobDetailPanel.tsx`.

**Job status badge colors (used in MyJobDetailPanel header):**

| Status | Badge style |
|---|---|
| `active` | `bg-[#3dd68c]/15 text-[#3dd68c]` (green) |
| `pending_review` | `bg-[#f5b64a]/15 text-[#f5b64a]` (yellow) |
| `closed` | `bg-[#1e2235] text-[#636f8d]` (neutral muted) |
| `rejected` (by admin) | `bg-[#f06b6b]/15 text-[#f06b6b]` (red) |
| `draft` | `bg-[#1e2235] text-[#636f8d]` (neutral muted) |

**Close Job confirmation dialog:**

```
Title:   "Close this job posting?"
Body:    "This will stop accepting new applications.
          Existing applications remain in your pipeline."
Cancel:  "Keep Open"   — secondary button, dismisses dialog
Confirm: "Close Job"   — destructive button: bg-[#f06b6b]/15 text-[#f06b6b] border border-[#f06b6b]/30
```

---

### 4. Pipeline Page

Pipeline breaks the list/detail split pattern and uses its own three-zone layout.

```
[Jobs sidebar 56px collapsed]  [Jobs Rail 200px]  [Kanban Board flex-1]
```

**Jobs Rail (`w-[200px]`):**

- Scrollable list of the employer's posted jobs.
- Each item: job title + applicant count badge.
- Selected job highlighted with primary accent.
- Clicking a job loads that job's pipeline in the Kanban board.

**Kanban Board:**

- **Columns (default visible):** `Applied · Screening · Interview · Offer · Hired`
- **Rejected column:** hidden by default; revealed via `Show rejected (n)` toggle at top right.
- Each column width: `200px`; the board scrolls horizontally when columns overflow.
- Column header: stage name + count + thin **top accent border** (per-stage color, muted — not a full background).

**Stage accent colors (column header border only):**

| Stage | Color |
|---|---|
| Applied | `#7c73f0` (purple) |
| Screening | `#f0834a` (orange) |
| Interview | `#0EA5E9` (sky blue) |
| Offer | `#f5b64a` (gold) |
| Hired | `#3dd68c` (green) |
| Rejected | `#f06b6b` (red) |

**Kanban Card anatomy:**

```
┌────────────────────────────────┐
│ [avatar 32px]  John Doe        │
│                @john           │
│ Senior React Developer         │  ← job title applied for
│ In pipeline 12d  · 3→          │  ← days in pipeline + stage transition count
│                    [Move ▼]    │  ← dropdown: View Profile + valid next stages
└────────────────────────────────┘
```

**Kanban Card behavior:**

- `[Move ▼]` dropdown: "View Profile" listed first, then a divider, then valid next stages only. Valid transitions are defined in `backend/app/models/job_application.py` and must be mirrored as a frontend constant in `frontend/src/lib/jobsApi.ts`:
  ```
  applied    → screening, rejected
  screening  → interview, rejected
  interview  → offer, rejected
  offer      → hired, rejected
  hired      → (terminal)
  rejected   → (terminal)
  withdrawn  → (terminal)
  ```
  Do not show terminal-stage targets that the current stage cannot transition to.
- **Terminal stages** (Hired / Rejected): replace `[Move ▼]` with a status badge — no move action available.

**Stage transition animation:**

1. Card fades out (`200ms`).
2. Destination column count badge bounces.
3. Card fades in at the top of the destination column (`200ms`).

> Drag-and-drop is out of scope for V1. All moves go through the `[Move ▼]` dropdown.

---

### 5. Mobile Layout (`<860px`)

**Top bar (mobile):**

```
[← KhoshGolpo]    [Khosh Jobs]    [user avatar]
```

Three items only — no overflow menu.

**Sub-navigation:**

- Horizontal scrollable tab bar pinned below the top bar.
- Tabs: `Browse · Saved · My Posts · Pipeline · Applied`
- Row height `h-10`, `text-[13px]`.
- Active tab: `border-b-2 border-primary`.

**Browse on mobile:**

- Full-width search bar below tabs.
- `[Filters · n ▼]` button (with active filter count) opens a bottom sheet.
- Job cards are full width.
- Tapping a card navigates to a full-screen detail view with a `← Back` button.

**Pipeline on mobile:**

- Full-width job selector dropdown at top (replaces Jobs Rail).
- Kanban columns collapse into **accordion sections**.
- `Applied` accordion defaults open; others closed.
- Cards within each accordion use the same anatomy as desktop Kanban cards.

### 6. Empty States

Each sub-page must define its own empty state. The detail panel empty state is only shown when the job list itself is empty.

| Page | Empty State |
|---|---|
| Browse (no results) | Centered icon + "No jobs found" + "Clear filters" button |
| Browse (list empty, no filters) | Centered icon + "No jobs posted yet" |
| Saved (no saved jobs) | Centered Bookmark icon + "No saved jobs yet" + "Browse Jobs" CTA |
| My Posts (never posted) | Centered Briefcase icon + "You haven't posted any jobs" + "+ Post a Job" CTA |
| Applied (no applications) | Centered FileText icon + "No applications yet" + "Browse Jobs" CTA |
| Pipeline (no applicants for selected job) | Centered Users icon + "No applicants yet for this job" |

---

### 7. Mobile Back Navigation

On mobile (`<860px`), within-Jobs navigation uses the tab bar. The `← KhoshGolpo` in the top bar always navigates to `/threads` (exit Jobs entirely).

When a user deep-links directly to a sub-page (e.g. `/jobs/pipeline`) on mobile with no prior navigation history, the tab bar provides the navigation context — there is no additional back button needed within the Jobs shell itself.

When tapping a job card on mobile (navigating to full-screen detail), the detail view renders a `← Back` button that calls `router.back()` — returning to whichever list the user came from (Browse, Saved, or Applied), not a hardcoded route.

---

## Visual Design

### Surfaces

| Layer | Color |
|---|---|
| Shell background | `#080a10` |
| Top bar + sidebar | `#080a10` (borders separate, not color) |
| List panel background | `#080a10` |
| Card background | `#10131d` |
| Card hover | `#141824` |
| Card selected | `#141824` + `border-l-2 #0EA5E9` + glow shadow |

### Typography

| Role | Font | Size | Weight | Color |
|---|---|---|---|---|
| Job title (primary) | DM Sans | 14px | semibold | `#e8eaf2` |
| Secondary info | DM Sans | 12px | normal | `#636f8d` |
| Wordmark | DM Serif Display | 18px | — | sky-blue gradient |

### Badge System

| Badge type | Style |
|---|---|
| Full-time | Sky blue — `bg-sky-500/15 text-sky-400` |
| Part-time | Purple — `bg-[#7c73f0]/15 text-[#7c73f0]` |
| Contract | Orange — `bg-[#f0834a]/15 text-[#f0834a]` |
| Internship | Green — `bg-[#3dd68c]/15 text-[#3dd68c]` |
| Freelance | Yellow — `bg-yellow-500/15 text-yellow-400` |
| Experience level | Neutral — `bg-[#1e2235] text-[#636f8d]` (no color competition) |
| Salary | Green (`#3dd68c`) when disclosed; muted when undisclosed — no market comparison |

### Micro-interactions

| Element | Animation |
|---|---|
| JobCard hover | `translateY(-1px)` + shadow lift (`150ms ease`) |
| JobCard select | Left border slides in (`120ms`) + bg transition |
| Detail panel load | `fade-in` + `translateY(4px → 0)` (`200ms ease-out`) |
| Kanban stage move | Card fades out (`200ms`) → column count bounces → card fades in at top (`200ms`) |
| `+ Post a Job` button | `scale(0.97)` on active + `brightness(1.1)` on hover |
| Sidebar nav item | Background fills full row (`150ms`) |
| Mobile bottom sheet | Slides up (`250ms spring`) |

---

## Key Files to Create / Modify

### New files

| File | Purpose |
|---|---|
| `app/(jobs)/layout.tsx` | JobsShell — root layout for all `/jobs/*` routes |
| `app/(jobs)/jobs/page.tsx` | Browse page |
| `app/(jobs)/jobs/[id]/page.tsx` | Browse with pre-selected job |
| `app/(jobs)/jobs/saved/page.tsx` | Saved jobs |
| `app/(jobs)/jobs/my/page.tsx` | My Posted Jobs |
| `app/(jobs)/jobs/pipeline/page.tsx` | Kanban Pipeline |
| `app/(jobs)/jobs/post/page.tsx` | Post a Job form — handles both create mode and edit mode (`?edit=<id>` query param); reads `searchParams.edit` to pre-populate form fields via `getJob(id)` |
| `app/(jobs)/jobs/applications/page.tsx` | My Applications (candidate) |
| `frontend/src/components/jobs/layout/JobsShell.tsx` | Shell wrapper component |
| `frontend/src/components/jobs/layout/JobsTopBar.tsx` | Contextual top bar |
| `frontend/src/components/jobs/layout/JobsSidebar.tsx` | Collapsible sidebar |
| `frontend/src/components/jobs/JobsListPanel.tsx` | List panel (search + cards) |
| `frontend/src/components/jobs/JobsRail.tsx` | Jobs rail for pipeline page |
| `frontend/src/components/jobs/KanbanBoard.tsx` | Kanban board container |
| `frontend/src/components/jobs/KanbanColumn.tsx` | Individual Kanban column |
| `frontend/src/components/jobs/KanbanCard.tsx` | Applicant card within a column |
| `frontend/src/components/jobs/MyJobDetailPanel.tsx` | Employer detail panel for My Posts |

### Modified files

| File | Change |
|---|---|
| `app/(app)/jobs/*` | **DELETE** — entire subtree (page.tsx, [id]/page.tsx, saved/, my/, post/, pipeline/, applications/) moved to `(jobs)` route group |
| `frontend/src/components/jobs/JobDetailPanel.tsx` | Add `break-words` class to the description `<div>` (line ~206 — `whitespace-pre-wrap` already present, only `break-words` is missing) |
| `frontend/src/components/jobs/JobsWorkspace.tsx` | **DELETE** — replaced by page-level components under `app/(jobs)/jobs/`. State (tab, filter, selectedJob, hooks) moves to individual pages. |
| `frontend/src/components/jobs/MyJobsWorkspace.tsx` | **DELETE** — replaced by `app/(jobs)/jobs/my/page.tsx` + `MyJobDetailPanel.tsx` |
| `frontend/src/components/jobs/MyApplicationsWorkspace.tsx` | **DELETE** — replaced by `app/(jobs)/jobs/applications/page.tsx` |
| `frontend/src/components/jobs/ApplicationPipelineBoard.tsx` | **DELETE** — replaced by the new `KanbanBoard.tsx` + `KanbanColumn.tsx` + `KanbanCard.tsx` trio. The new components add: jobs rail for multi-job switching, stage-colored column headers, richer card anatomy (days in pipeline, transition count, Move dropdown with View Profile), and rejected-column toggle. |

---

## Authentication Guards

| Route | Auth required | Redirect if unauthenticated |
|---|---|---|
| `/jobs` (Browse) | No — public | — |
| `/jobs/[id]` | No — public | — |
| `/jobs/saved` | Yes | `/login?next=/jobs/saved` |
| `/jobs/my` | Yes | `/login?next=/jobs/my` |
| `/jobs/post` | Yes | `/login?next=/jobs/post` |
| `/jobs/pipeline` | Yes | `/login?next=/jobs/pipeline` |
| `/jobs/applications` | Yes | `/login?next=/jobs/applications` |

Auth checks are handled at the page level using the existing `useAuthStore` pattern — if `user` is `null` after hydration, redirect via `router.replace(...)`. Do not add auth logic to `JobsShell` (the layout) — keep it at the individual page level so Browse and job detail remain publicly accessible.

**In-panel action auth (Save / Apply on `/jobs/[id]`):**
The Browse and job detail pages are publicly accessible, but Save and Apply require a logged-in user. When an unauthenticated user clicks either button, show an **inline prompt** within `JobDetailPanel` — a small banner below the action row:
```
"Sign in to apply or save jobs"  [Sign In →]
```
Do not redirect the user away from the job detail. This keeps the browsing experience intact for visitors.

---

## Out of Scope (V1)

The following features are explicitly excluded from this design iteration:

- Drag-and-drop Kanban (all pipeline moves use the `[Move ▼]` dropdown)
- Resizable panels
- Company profile pages
- Market salary benchmarking
- Job alerts / notifications for new matching jobs
