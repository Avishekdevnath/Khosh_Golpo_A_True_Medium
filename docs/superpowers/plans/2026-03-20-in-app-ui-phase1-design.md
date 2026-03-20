# In-App UI/UX Phase 1: Shell + Threads — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old orange/purple dark theme with the sky-blue design system across all in-app Shell and Threads components, establishing the visual foundation for Phase 2 and Phase 3.

**Architecture:** Scoped `--app-*` CSS tokens defined in `globals.css` under `.app-shell` class, consumed by styled-jsx blocks in workspace components. Layout restructured to persistent sidebar (240px) + contextual header (60px) + scrollable content panels. No backend changes, no new features — purely visual reskin + layout restructure.

**Tech Stack:** Next.js (React 19), styled-jsx, Zustand, SWR, shadcn/ui (DropdownMenu, Dialog, Button, Badge), Lucide React icons, Plus Jakarta Sans + Sora fonts.

**Spec:** `docs/superpowers/specs/2026-03-20-in-app-ui-phase1-design.md`

---

## Token Mapping Reference

All tasks reference this mapping. Keep it open during implementation.

### Color Replacements (Dark Mode)

| Old Value | New Value | Token |
|-----------|-----------|-------|
| `#f0834a`, `#f4845f`, `#f97316` | `#0EA5E9` | `--accent` / accent |
| `rgba(240,131,74,X)`, `rgba(244,132,95,X)`, `rgba(249,115,22,X)` | `rgba(14,165,233,X)` | accent with opacity |
| `#ffb380`, `#249115` | `#38BDF8` | `--accent-hover` |
| `#7c73f0`, `#7b6ef6` | `#818CF8` | `--accent2` / indigo |
| `rgba(124,115,240,X)`, `rgba(123,110,246,X)` | `rgba(129,140,248,X)` | accent2 with opacity |
| `#080a10`, `#0c0e14`, `#0c0c10` | `#060810` | `--app-bg` |
| `#10131d`, `#0f1118` | `#0f1117` | `--app-panel` |
| `#0a0c14` | `#0a0c14` | `--app-sidebar` (unchanged) |
| `#13131a`, `#13151f` | `#13151f` | `--app-card` |
| `#151927`, `#151821` | `#151821` | `--app-input` |
| `#161a26`, `#1a1d2a`, `#181b27` | `#181b27` | `--app-card-hover` |
| `#141824` | `#141824` | `--app-card-active` |
| `#1e2235`, `#1c1f2e` | `#1c1f2e` | `--app-border` |
| `#252b40` | `#1c1f2e` | `--app-border` (consolidated) |
| `#0d1018` | `#0f1117` | `--app-panel` |

### Font Replacements

| Old Value | New Value |
|-----------|-----------|
| `var(--font-dm-sans)` | `var(--sans)` |
| `var(--font-dm-serif)` | `var(--serif)` |
| `var(--font-syne)` | `var(--serif)` |
| `'DM Sans'` (literal) | `'Plus Jakarta Sans'` |
| `'DM Serif Display'` (literal) | `'Sora'` |

### Text Colors

| Old Value | New Value | Usage |
|-----------|-----------|-------|
| `#e4e8f4`, `#e8e8f0`, `#e8eaf0`, `#d5dbee` | `var(--text, #e4e8f4)` | Primary text |
| `#9ba3be`, `#9090a8`, `#636f8d`, `#6b7080` | `var(--muted, #9ba3be)` | Muted text |
| `#545c7a`, `#5a5a72` | `var(--muted, #9ba3be)` | Dark muted (consolidate) |

### Semantic Colors (keep as-is)

| Color | Token | Usage |
|-------|-------|-------|
| `#3dd68c` | `--status-online` | Online, success, open |
| `#fbbf24` | `--status-warning` | Warning, pending |
| `#ef4444` / `#f06b6b` / `#e74c3c` | `--status-danger` | Danger, delete — standardize to `#ef4444` |
| `#0EA5E9` | `--status-info` | Info, unread |

---

## Task 1: Add `.app-shell` Scoped Tokens to globals.css

**Files:**
- Modify: `frontend/src/app/globals.css` (add block after line ~1035, before dark mode block)

- [ ] **Step 1: Add the `.app-shell` dark mode token block**

Insert this block in `globals.css` after the reveal animation utilities section (around line 1035) and before the mobile responsive overrides:

```css
/* ─── In-App Scoped Tokens (Phase 1) ─── */
.app-shell {
  --app-bg: #060810;
  --app-sidebar: #0a0c14;
  --app-header: rgba(6, 8, 16, 0.85);
  --app-panel: #0f1117;
  --app-card: #13151f;
  --app-card-hover: #181b27;
  --app-card-active: #141824;
  --app-input: #151821;
  --app-border: #1c1f2e;
  --app-border-subtle: rgba(20, 23, 34, 0.25);

  --status-online: #3dd68c;
  --status-warning: #fbbf24;
  --status-danger: #ef4444;
  --status-info: #0EA5E9;

  --tag-tech: #818CF8;
  --tag-design: #38BDF8;
  --tag-career: #3dd68c;
  --tag-ml: #f87171;
  --tag-discuss: #fbbf24;
}

/* Light mode in-app tokens */
:root .app-shell {
  --app-bg: #f4f6f9;
  --app-sidebar: #ffffff;
  --app-header: rgba(255, 255, 255, 0.88);
  --app-panel: #ffffff;
  --app-card: #ffffff;
  --app-card-hover: #f8fafc;
  --app-card-active: #f0f7ff;
  --app-input: #f1f5f9;
  --app-border: #e2e8f0;
  --app-border-subtle: rgba(226, 232, 240, 0.5);
}
```

- [ ] **Step 2: Add custom scrollbar utility**

Add below the token block:

```css
/* In-app custom scrollbar */
.app-shell ::-webkit-scrollbar {
  width: 4px;
}
.app-shell ::-webkit-scrollbar-track {
  background: transparent;
}
.app-shell ::-webkit-scrollbar-thumb {
  background: var(--app-border);
  border-radius: 4px;
}
.app-shell ::-webkit-scrollbar-thumb:hover {
  background: rgba(155, 163, 190, 0.4);
}
```

- [ ] **Step 3: Verify the dev server compiles without errors**

Run: `cd frontend && npm run dev` (check terminal for CSS parse errors)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "feat: add .app-shell scoped CSS tokens for in-app redesign"
```

---

## Task 2: Restructure AppShell Layout

**Files:**
- Modify: `frontend/src/components/app/AppShell.tsx` (currently 39 lines)

**Goal:** Add `.app-shell` wrapper class, restructure to sidebar + header + content grid layout. This is the foundation that all other components sit inside.

- [ ] **Step 1: Read the current AppShell.tsx**

Read `frontend/src/components/app/AppShell.tsx` to understand current route-based conditional logic.

- [ ] **Step 2: Rewrite AppShell with new layout structure**

Replace the component with a grid layout matching spec §3:

```tsx
"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import AppNavbar from "./AppNavbar";
import WorkspaceSidebar from "./WorkspaceSidebar";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  // Routes that use the full workspace layout
  const workspaceRoutes = [
    "/threads",
    "/notifications",
    "/messages",
    "/people",
    "/users",
    "/admin",
    "/settings",
  ];

  const isWorkspace = workspaceRoutes.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );

  if (!isWorkspace) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <WorkspaceSidebar />
      <div className="app-main">
        <AppNavbar />
        <main className="app-content">{children}</main>
      </div>
      <style jsx>{`
        .app-shell {
          display: grid;
          grid-template-columns: 240px 1fr;
          min-height: 100vh;
          background: var(--app-bg);
          color: var(--text, #e4e8f4);
          font-family: var(--sans);
        }
        .app-main {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          overflow: hidden;
        }
        .app-content {
          flex: 1;
          overflow: hidden;
        }
        @media (max-width: 859px) {
          .app-shell {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
```

**Key changes:**
- Removed `AppSidebar` import (replaced by `WorkspaceSidebar` which is the primary sidebar)
- Added `.app-shell` class for token scoping
- CSS grid: `240px 1fr` (desktop), `1fr` (mobile)
- `app-main` column holds header + content
- `app-content` is `flex: 1` with `overflow: hidden` (children handle their own scroll)

- [ ] **Step 3: Verify the page loads without crash**

Run: Navigate to `http://localhost:3000/threads` — should see sidebar + content (may look broken until other tasks complete)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/app/AppShell.tsx
git commit -m "feat: restructure AppShell with grid layout and .app-shell token scope"
```

---

## Task 3: Simplify WorkspaceShell

**Files:**
- Modify: `frontend/src/components/app/WorkspaceShell.tsx` (currently 162 lines)

**Goal:** Remove the internal sidebar rendering, background orbs, and drag-resize. WorkspaceShell now just provides the content panel wrapper inside AppShell's grid. The sidebar is handled by AppShell.

- [ ] **Step 1: Read the current WorkspaceShell.tsx**

Read `frontend/src/components/app/WorkspaceShell.tsx` to understand the grid layout, orb decorations, and drag resize logic.

- [ ] **Step 2: Rewrite to simplified content wrapper**

Replace the entire component. Remove: `WorkspaceSidebar` import, `useDragResize` import, orb divs, drag handle, grid layout. Keep: the children slot and styled-jsx for panel styling.

```tsx
"use client";

import { type ReactNode } from "react";

interface WorkspaceShellProps {
  children: ReactNode;
}

export default function WorkspaceShell({ children }: WorkspaceShellProps) {
  return (
    <div className="ws-root">
      {children}
      <style jsx>{`
        .ws-root {
          display: flex;
          flex: 1;
          min-height: 0;
          overflow: hidden;
          font-family: var(--sans);
        }
      `}</style>
    </div>
  );
}
```

**Key changes:**
- Removed `WorkspaceSidebar` (now in AppShell)
- Removed `useDragResize` hook
- Removed decorative orbs (`.ws-orb-1`, `.ws-orb-2`)
- Removed drag handle (`.ws-drag`)
- Removed panel gradient backgrounds
- Simplified to a flex container that fills the `app-content` area
- Font: `var(--sans)` replaces `var(--font-dm-sans)`

- [ ] **Step 3: Check that ThreadsWorkspace still renders inside WorkspaceShell**

Navigate to `/threads` — the content should still appear (layout may be off until Task 7)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/app/WorkspaceShell.tsx
git commit -m "refactor: simplify WorkspaceShell — remove sidebar, orbs, drag resize"
```

---

## Task 4: Rewrite WorkspaceSidebar

**Files:**
- Modify: `frontend/src/components/app/WorkspaceSidebar.tsx` (currently 497 lines)

**Goal:** Full rewrite to match spec §6.1 — grouped sections (MAIN / YOU / ADMIN), new nav items, user footer, mobile drawer. Replace all old colors and fonts.

- [ ] **Step 1: Read the current WorkspaceSidebar.tsx thoroughly**

Read `frontend/src/components/app/WorkspaceSidebar.tsx` — note the imports, state hooks, channels section, user profile section, and the entire styled-jsx block (lines 203–494).

- [ ] **Step 2: Rewrite the component JSX structure**

Replace the entire component. The new sidebar must have:

**Structure (top to bottom):**
1. **Logo row** (52px): Sky-blue 8px rounded square icon + "KhoshGolpo" text (Sora 16px 700)
2. **MAIN section header** (11px 700 uppercase, `0.06em` tracking, `--muted` color) → nav items: Threads (`MessageSquare`), Messages (`Mail`), People (`Users`)
3. **YOU section header** → nav items: Notifications (`Bell`), Settings (`Settings`)
4. **ADMIN section** (conditional on `user?.role === "admin"`) → Dashboard (`BarChart3`)
5. **User section** (sticky bottom): avatar 32px + online dot + name 13px 600 + @handle 11px `--muted` → click opens dropdown (Profile, Sign out)

**Nav item behavior:**
- Active state: check `pathname` starts with item's `href`
- Active style: `rgba(14,165,233,0.10)` bg, `#0EA5E9` text, 2px left border
- Hover: `var(--app-card-hover)` bg
- Badge: right-aligned pill for unread counts (Messages, Notifications)

**Mobile:**
- Sidebar hidden by default (`translateX(-100%)`)
- Hamburger button in header sets `isOpen` state
- Slide-in with scrim overlay (`rgba(0,0,0,0.4)`)
- Animation: open `250ms ease-out`, close `180ms ease-in`

**Imports needed:**
- `Link`, `usePathname` from next
- `MessageSquare`, `Mail`, `Users`, `Bell`, `Settings`, `BarChart3`, `LogOut`, `User`, `Menu`, `X` from lucide-react
- `useAuthStore` for user data + role check
- `useNotifications` for notification badge count
- `useMessageUnreadCount` for message badge count
- `avatarSeed`, `initials` from utils (existing)

**Key replacements in styled-jsx:**
- All `#f0834a` → `#0EA5E9` or `var(--accent)`
- All `rgba(240,131,74,...)` → `rgba(14,165,233,...)`
- All `#7c73f0` → `#818CF8` or `var(--accent2)`
- `var(--font-dm-serif)` → `var(--serif)`
- `var(--font-dm-sans)` → `var(--sans)`
- Background colors → `var(--app-sidebar)`, `var(--app-border)`, etc.
- `#10131d` → `var(--app-sidebar)`
- `#1e2235` → `var(--app-border)`
- `#161a26` → `var(--app-card-hover)`
- `#545c7a` / `#9ba3be` → `var(--muted, #9ba3be)`
- `#e4e8f4` → `var(--text, #e4e8f4)`

**Z-index:** Sidebar desktop = `30`, drawer overlay = `40`

- [ ] **Step 3: Write the complete styled-jsx block**

The styled-jsx must cover:
- `.sidebar` — fixed left, 240px width, `var(--app-sidebar)` bg, flex column, `border-right: 1px solid var(--app-border)`, `z-index: 30`, full height
- `.logo-row` — 52px height, flex row, 16px padding, gap 10px
- `.brand-icon` — 8px radius, sky-blue bg (`#0EA5E9`), 28px square, centered "K" letter white
- `.brand-name` — `var(--serif)`, 16px, 700 weight
- `.section-header` — 11px 700 uppercase, `0.06em` tracking, `var(--muted)` color, `24px 0 8px 16px` padding
- `.nav-item` — 36px height, 8px radius, 8px horizontal margin, `0 12px` padding, flex row, gap 10px, `cursor: pointer`, transition `0.2s ease`
- `.nav-item:hover` — `var(--app-card-hover)` bg
- `.nav-item.active` — `rgba(14,165,233,0.10)` bg, `#0EA5E9` color, `2px` left border `#0EA5E9`
- `.nav-icon` — 18px
- `.nav-label` — 13px 500
- `.badge` — right-aligned, `min-width: 18px`, 18px height, `999px` radius, 10px 600, `#0EA5E9` bg, white text
- `.user-section` — sticky bottom, `border-top: 1px solid var(--app-border)`, `12px 16px` padding
- `.user-avatar` — 32px, rounded, relative (for online dot)
- `.online-dot` — 8px circle, `var(--status-online)`, 2px white border, absolute bottom-right
- `.user-name` — 13px 600, truncate
- `.user-handle` — 11px `var(--muted)`, truncate
- Mobile: `.sidebar` → `position: fixed`, `transform: translateX(-100%)`, transition, `.sidebar.open` → `translateX(0)`
- `.scrim` — fixed full screen, `rgba(0,0,0,0.4)`, `z-index: 39`
- `@media (min-width: 860px)` — sidebar static, scrim hidden
- `@media (max-width: 859px)` — sidebar fixed, `z-index: 40`
- `prefers-reduced-motion` — all transitions `0ms`

- [ ] **Step 4: Verify sidebar renders correctly**

Navigate to `/threads` — sidebar should show with sky-blue accent, grouped sections, user footer.

- [ ] **Step 5: Test mobile drawer**

Resize browser to <860px — sidebar should hide. (Hamburger button won't work yet until AppNavbar is updated in Task 5.) Verify no console errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/app/WorkspaceSidebar.tsx
git commit -m "feat: rewrite WorkspaceSidebar with grouped nav, sky-blue tokens, mobile drawer"
```

---

## Task 5: Redesign AppNavbar as Contextual Header

**Files:**
- Modify: `frontend/src/components/app/AppNavbar.tsx` (currently 130 lines)

**Goal:** Transform from a top navbar with logo/menu into a 60px contextual header bar per spec §6.2 — section name left, search center, actions right.

- [ ] **Step 1: Read the current AppNavbar.tsx**

Read `frontend/src/components/app/AppNavbar.tsx` to understand current imports, menu structure, badge logic.

- [ ] **Step 2: Rewrite as contextual header**

Replace the component. New structure:

**Left zone:**
- Mobile: hamburger icon (`Menu`) that calls `WorkspaceSidebar`'s toggle (pass via props or context)
- Desktop: section name (Sora 16px 700) derived from `pathname`
- Thread detail: breadcrumb "Threads / {title}" with Threads as clickable link

**Center zone (desktop only):**
- Search input: `max-width: 320px`, 32px height, 8px radius, `var(--app-input)` bg, `Search` icon (Lucide) left
- Focus: border → `var(--accent)`, glow `0 0 0 2px rgba(14,165,233,0.15)`
- Placeholder: section-specific (e.g., "Search threads...")
- Debounce 300ms, clear button when has text

**Right zone:**
- Filter dropdowns (Sort: Latest/Popular/Unanswered) — use shadcn `DropdownMenu`
- Primary action button (e.g., "+ New Thread" for Threads section)
- `ThemeToggle` component (existing, relocated)
- Bell icon with badge (notification count)
- Avatar dropdown (existing user menu)

**Mobile header (52px):**
- Hamburger left, section name center, essential icons right
- Search → expandable overlay on icon tap

**Section name mapping:**
```
/threads → "Threads"
/threads/[id] → breadcrumb
/messages → "Messages"
/people → "People"
/notifications → "Notifications"
/settings → "Settings"
/admin → "Admin"
```

**Styled-jsx replacements:**
- Use `var(--app-header)` bg with `backdrop-filter: blur(12px)`
- Border: `1px solid var(--app-border)`
- Height: 60px desktop, 52px mobile
- `z-index: 20`

**Props/context needed:**
- `onToggleSidebar` callback for mobile hamburger
- Consider a simple React context or prop drilling through AppShell for sidebar toggle state

- [ ] **Step 3: Wire up search to ThreadsWorkspace**

The header search replaces the in-panel search. For now, wire it to update a URL search param or a shared state (Zustand or URL query) that `useThreads` reads.

Simplest approach: use URL query params. The search input updates `?search=term` in the URL. ThreadsWorkspace reads `searchParams` and passes to `useThreads({ search })`.

- [ ] **Step 4: Add filter dropdowns for Threads section**

When pathname starts with `/threads`, render Sort dropdown using shadcn `DropdownMenu`:
- Options: Latest (default), Popular, Unanswered
- Triggers state change that ThreadsWorkspace reads (URL param `?sort=latest|popular|unanswered`)

- [ ] **Step 5: Verify header renders with correct section names**

Navigate to `/threads`, `/messages`, `/people`, `/notifications` — header should show correct section name. Search and filters should appear on `/threads`.

- [ ] **Step 6: Test mobile layout**

Resize to <860px — header should be 52px, hamburger visible, search becomes icon.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/app/AppNavbar.tsx
git commit -m "feat: redesign AppNavbar as 60px contextual header with search and filters"
```

---

## Task 6: Clean Up AppSidebar

**Files:**
- Modify: `frontend/src/components/app/AppSidebar.tsx` (currently 80 lines)

**Goal:** This file is now redundant — `WorkspaceSidebar` (Task 4) is the primary sidebar and `AppShell` (Task 2) renders it directly. Either delete or reduce to a stub that re-exports WorkspaceSidebar.

- [ ] **Step 1: Check if any file imports AppSidebar**

Search for `import.*AppSidebar` across the codebase. After Task 2, `AppShell.tsx` should no longer import it.

- [ ] **Step 2: If no imports remain, delete or stub the file**

If nothing imports `AppSidebar`, keep the file as a minimal re-export to avoid breaking any dynamic imports:

```tsx
export { default } from "./WorkspaceSidebar";
```

If something still imports it, update that import to use `WorkspaceSidebar` directly, then stub.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/app/AppSidebar.tsx
git commit -m "refactor: reduce AppSidebar to re-export of WorkspaceSidebar"
```

---

## Task 7: Reskin ThreadsWorkspace

**Files:**
- Modify: `frontend/src/components/threads/ThreadsWorkspace.tsx` (currently ~2533 lines)

**Goal:** Full visual reskin of the styled-jsx block and any inline styles. Replace all old colors, fonts, and background values with new tokens. Update card structure to match spec §6.3. This is the largest file — work methodically through the styled-jsx block.

- [ ] **Step 1: Read the full ThreadsWorkspace.tsx**

Read the entire file, focusing on:
- Lines 2283+: the styled-jsx block (this is where most changes happen)
- Inline `style={}` props throughout the JSX
- Any hardcoded color strings in JSX (e.g., `text-[#f0834a]`, `bg-[#...]`)

- [ ] **Step 2: Replace all font references in styled-jsx**

Find and replace in the styled-jsx block:
- `var(--font-dm-sans)` → `var(--sans)` (all occurrences)
- `var(--font-dm-serif)` → `var(--serif)` (all occurrences)
- `var(--font-syne)` → `var(--serif)` (all occurrences)

- [ ] **Step 3: Replace all accent color references**

Find and replace in styled-jsx + JSX:
- `#f97316` → `#0EA5E9`
- `#f0834a` → `#0EA5E9`
- `rgba(249,115,22,` → `rgba(14,165,233,`
- `rgba(240,131,74,` → `rgba(14,165,233,`
- `#7c73f0` → `#818CF8`

- [ ] **Step 4: Replace all background/surface colors**

Find and replace in styled-jsx:
- `#0c0c10` → `var(--app-bg, #060810)` or `#060810`
- `#13131a` → `var(--app-card, #13151f)`
- `#1a1a24` → `var(--app-card-hover, #181b27)`
- `#161a26` → `var(--app-card-hover, #181b27)`
- `rgba(255,255,255,0.07)` → `var(--app-border, #1c1f2e)` (border consolidation)

- [ ] **Step 5: Replace text color references**

Find and replace:
- `#e8e8f0` → `var(--text, #e4e8f4)`
- `#9090a8` → `var(--muted, #9ba3be)`
- `#5a5a72` → `var(--muted, #9ba3be)`
- `#d5dbee` → `var(--text, #e4e8f4)`

- [ ] **Step 6: Update thread card styling to match spec §6.3**

Ensure thread cards have:
- Bg: `var(--app-card)`, bottom border: `1px solid var(--app-border)`, no radius
- Hover: bg → `var(--app-card-hover)`, border → `rgba(14,165,233,0.20)`
- Active/selected: bg → `var(--app-card-active)`, left `2px solid var(--accent)`
- Title: 14px 600, `line-clamp-2`
- Meta: 12px 500 `var(--muted)`
- Stats icons: `MessageCircle` + `ArrowUp` only (no `Eye` — views hidden per spec)

- [ ] **Step 7: Update tab bar styling**

Tab underline style (border-bottom) should use `var(--accent)` for active:
- Active tab: `border-bottom: 2px solid #0EA5E9`, `color: #0EA5E9`
- Inactive: `color: var(--muted)`, hover `var(--text)`

- [ ] **Step 8: Remove in-panel search box (relocated to header)**

The search input that currently lives inside the thread list panel has been relocated to the header (Task 5). Remove or hide the in-panel search UI. Keep the search state logic (it should now read from URL params set by the header search).

- [ ] **Step 9: Update inline styles in JSX**

Search for `style={{` in the JSX and replace any hardcoded colors:
- `color: '#f0834a'` → `color: '#0EA5E9'`
- `background: '#...'` → use appropriate `var(--app-*)` token

- [ ] **Step 10: Update skeleton loading colors**

Skeleton components should use:
- Base: `var(--app-border, #1c1f2e)`
- Pulse to: `var(--app-card-hover, #181b27)`

- [ ] **Step 11: Verify thread list renders correctly**

Navigate to `/threads` — cards should show sky-blue accents, correct fonts, proper hover states.

- [ ] **Step 12: Commit**

```bash
git add frontend/src/components/threads/ThreadsWorkspace.tsx
git commit -m "feat: reskin ThreadsWorkspace with sky-blue tokens and new card design"
```

---

## Task 8: Reskin ThreadDetailWorkspace

**Files:**
- Modify: `frontend/src/components/threads/ThreadDetailWorkspace.tsx` (currently 1130 lines)

**Goal:** Full visual reskin of thread detail view — title, author bar, action bar, reply tree, reply composer, modals, toasts. Replace all old colors and fonts.

- [ ] **Step 1: Read the full ThreadDetailWorkspace.tsx**

Read the entire file, focusing on:
- Lines 891–1127: the styled-jsx block
- PostItem component (lines 120–246): inline styles and class usage
- Modal JSX (lines 770–882)

- [ ] **Step 2: Replace all font references in styled-jsx**

- `var(--font-dm-serif)` → `var(--serif)` (all occurrences)
- `var(--font-dm-sans)` → `var(--sans)` (all occurrences)

- [ ] **Step 3: Replace all accent color references**

In styled-jsx + any inline JSX:
- `#f0834a` → `#0EA5E9`
- `rgba(240,131,74,` → `rgba(14,165,233,`
- `#7c73f0` → `#818CF8`
- `rgba(124,115,240,` → `rgba(129,140,248,`
- Any Tailwind classes like `text-[#f0834a]` → `text-[#0EA5E9]`

- [ ] **Step 4: Replace background/surface/border colors**

- `#10131d` → `var(--app-panel, #0f1117)`
- `#151927` → `var(--app-input, #151821)`
- `#0d1018` → `var(--app-panel, #0f1117)`
- `#1e2235` → `var(--app-border, #1c1f2e)`
- `#252b40` → `var(--app-border, #1c1f2e)`

- [ ] **Step 5: Replace text color references**

- `#e4e8f4` → `var(--text, #e4e8f4)`
- `#636f8d` → `var(--muted, #9ba3be)`
- `#9ba3be` → `var(--muted, #9ba3be)`

- [ ] **Step 6: Update thread detail typography per spec §6.4**

Verify these match spec:
- Thread title: Sora (`var(--serif)`) 22px 700, mobile 18px, letter-spacing `-0.02em`
- Body: 15px 400 `var(--text)`, `line-height: 1.75`, `max-width: 680px`
- Author name: 14px 600
- @username: 13px `var(--muted)`

- [ ] **Step 7: Update action bar per spec §6.4**

- Icons: `ArrowUp` (upvote), `MessageCircle` (replies), `Bookmark`, `ExternalLink` (share)
- Each: 32px height, 8px radius, `8px 12px` padding
- Resting: `var(--muted)`, hover: `var(--text)` with bg
- Upvoted: `#0EA5E9` icon + count
- **"Upvote" maps to `like_count` / `liked_by_me` API fields** (display label change only)

- [ ] **Step 8: Update reply tree per spec §6.5**

- Reply card: no border/radius, avatar 28px, name 13px 600, time 12px `var(--muted)`
- Body: 14px 400, `line-height: 1.7`
- Indent: 24px per level (mobile 16px)
- Vertical connecting line: `1px solid var(--app-border)` at 12px left of indent
- Hover: `rgba(14,165,233,0.03)` bg

- [ ] **Step 9: Update reply composer per spec §6.6**

- Sticky bottom, `var(--app-panel)` bg, `border-top: 1px solid var(--app-border)`
- Textarea: `var(--app-input)` bg, focus border `#0EA5E9`, glow
- Send button: 32px square, `#0EA5E9` bg, white `SendHorizontal` icon, disabled `opacity: 0.4`

- [ ] **Step 10: Update modal and toast styles**

- Modal scrim: `rgba(0,0,0,0.55)` + `backdrop-filter: blur(4px)`
- Modal bg: `var(--app-card)`, border `var(--app-border)`
- Toast: left border colors per type (success=green, error=red, info=blue)
- Delete button in modals: `var(--status-danger)` → `#ef4444`

- [ ] **Step 11: Standardize red/danger colors**

Replace all variants:
- `#f06b6b` → `#ef4444` (`var(--status-danger)`)
- `#e74c3c` → `#ef4444`

- [ ] **Step 12: Verify thread detail renders correctly**

Navigate to `/threads/[id]` — title, body, replies, composer should all show correct colors/fonts.

- [ ] **Step 13: Commit**

```bash
git add frontend/src/components/threads/ThreadDetailWorkspace.tsx
git commit -m "feat: reskin ThreadDetailWorkspace with sky-blue tokens and updated typography"
```

---

## Task 9: Reskin New Thread Page

**Files:**
- Modify: `frontend/src/app/(app)/threads/new/page.tsx` (currently 554 lines)

**Goal:** Replace old colors, fonts, and background orbs in the new thread creation form.

- [ ] **Step 1: Read the current new thread page**

Read `frontend/src/app/(app)/threads/new/page.tsx` — note the styled-jsx block (lines 239–550), inline CSS variables, and orb gradients.

- [ ] **Step 2: Replace font references**

- `var(--font-dm-serif)` → `var(--serif)`
- `var(--font-dm-sans)` → `var(--sans)`

- [ ] **Step 3: Replace accent colors**

- `#f97316` → `#0EA5E9`
- `#0EA5E9` → already correct (verify)
- `#7b6ef6` → `#818CF8`
- `rgba(244, 132, 95, 0.08)` → `rgba(14, 165, 233, 0.08)` (orb gradient)
- `rgba(123, 110, 246, 0.08)` → `rgba(129, 140, 248, 0.08)` (orb gradient)

- [ ] **Step 4: Replace background/surface colors**

- `#0c0e14` → `var(--app-bg, #060810)`
- `#13151e` → `var(--app-card, #13151f)`
- `#1a1d2a` → `var(--app-card-hover, #181b27)`
- `#252836` → `var(--app-border, #1c1f2e)`
- `#6b7080` → `var(--muted, #9ba3be)`
- `#e8eaf0` → `var(--text, #e4e8f4)`

- [ ] **Step 5: Update local CSS variables in styled-jsx**

The file defines its own `--accent` / `--accent2` in the styled-jsx. Update:
```css
--accent: #0EA5E9;   /* was possibly already this */
--accent2: #818CF8;   /* was #7b6ef6 */
```

- [ ] **Step 6: Verify new thread form renders**

Navigate to `/threads/new` — form should show sky-blue accent, correct fonts, updated orb colors.

- [ ] **Step 7: Commit**

```bash
git add "frontend/src/app/(app)/threads/new/page.tsx"
git commit -m "feat: reskin New Thread page with sky-blue tokens"
```

---

## Task 10: Final Sweep and Verification

**Files:**
- All 9 modified files

**Goal:** Comprehensive sweep for any remaining old color/font references, visual QA across breakpoints.

- [ ] **Step 1: Grep for remaining old colors**

Search all Phase 1 files for any leftover references:

```bash
grep -rn "#f0834a\|#f4845f\|#f97316\|#7c73f0\|#7b6ef6\|rgba(240,131,74\|rgba(244,132,95\|rgba(249,115,22\|rgba(124,115,240\|rgba(123,110,246" \
  frontend/src/components/app/AppShell.tsx \
  frontend/src/components/app/AppNavbar.tsx \
  frontend/src/components/app/AppSidebar.tsx \
  frontend/src/components/app/WorkspaceSidebar.tsx \
  frontend/src/components/app/WorkspaceShell.tsx \
  frontend/src/components/threads/ThreadsWorkspace.tsx \
  frontend/src/components/threads/ThreadDetailWorkspace.tsx \
  "frontend/src/app/(app)/threads/new/page.tsx"
```

Expected: 0 matches. If any found, fix them.

- [ ] **Step 2: Grep for remaining old font references**

```bash
grep -rn "font-dm-sans\|font-dm-serif\|font-syne\|DM Sans\|DM Serif\|Syne" \
  frontend/src/components/app/ \
  frontend/src/components/threads/ \
  "frontend/src/app/(app)/threads/"
```

Expected: 0 matches. If any found, fix them.

- [ ] **Step 3: Visual QA — Desktop (≥1024px)**

Check at 1440px and 1024px widths:
- [ ] Sidebar 240px with grouped sections, sky-blue active state
- [ ] Header 60px with section name, search, filters, theme toggle
- [ ] Thread list: flat cards, hover glow, selected left border
- [ ] Thread detail: correct title size, body text, action bar, reply tree
- [ ] New thread form: correct colors
- [ ] Dark mode: all `--app-*` tokens applied
- [ ] Light mode: toggle theme, verify light tokens apply

- [ ] **Step 4: Visual QA — Tablet (860–1023px)**

Check at 900px width:
- [ ] Sidebar visible, content single column
- [ ] Thread click navigates to `/threads/[id]` (route-based)

- [ ] **Step 5: Visual QA — Mobile (<860px)**

Check at 375px width:
- [ ] Sidebar hidden, hamburger in header
- [ ] Header 52px
- [ ] Cards: 12px padding, 24px avatars
- [ ] Thread detail: 18px title, 32px avatar
- [ ] Reply nesting: 16px indent, max 2 levels visible

- [ ] **Step 6: Fix any issues found**

Address any visual discrepancies found in steps 3–5.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "fix: final sweep — resolve remaining color/font references in Phase 1 files"
```

- [ ] **Step 8: Summary commit (if no issues found in step 6)**

If step 6 had no fixes needed, skip step 7 and confirm all 9 prior commits are clean.

---

## Execution Notes

- **Task dependencies:** Tasks 1 → 2 → 3 must be sequential (token foundation → shell → workspace). Tasks 4, 5, 6 can run in parallel after Task 3. Tasks 7, 8, 9 can run in parallel after Tasks 1+3. Task 10 runs last.
- **Largest files:** Task 7 (ThreadsWorkspace, 2533 lines) and Task 8 (ThreadDetailWorkspace, 1130 lines) are the heaviest — allocate most time here.
- **No tests:** This is a pure UI/UX reskin with no logic changes. Visual verification replaces unit tests.
- **No backend changes:** Spec constraint — zero backend file modifications.
- **Light mode:** Tasks 4–9 focus on dark mode tokens. Light mode tokens are defined in Task 1's `.app-shell` block and will apply automatically when theme toggles, but styled-jsx hardcoded hex values will NOT respond to theme changes. Consider using `var(--app-*)` tokens in styled-jsx wherever possible instead of hardcoded hex to get automatic light mode support.
