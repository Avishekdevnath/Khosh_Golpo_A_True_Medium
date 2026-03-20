# KhoshGolpo — In-App UI/UX Redesign Phase 1: Shell + Threads

**Date:** 2026-03-20
**Phase:** 1 of 3 (Shell + Threads → Social → Admin + Settings)
**Scope:** AppShell (sidebar, header), WorkspaceShell, ThreadsWorkspace, ThreadDetailWorkspace, NewThreadPage
**Constraint:** UI/UX redesign only — no backend changes, no data model changes, no new features

---

## 1. Motivation

The in-app experience still uses the old orange/purple color scheme (`#f0834a`, `#7c73f0`), DM Sans / DM Serif Display fonts, and hardcoded hex values throughout styled-jsx workspace components. The public pages have been redesigned to sky blue + Plus Jakarta Sans + Sora, creating a jarring visual disconnect when users log in.

Phase 1 establishes the in-app design language — layout architecture, color tokens, typography, component specs, interaction patterns, and responsive behavior — that Phase 2 (Social) and Phase 3 (Admin + Settings) will inherit without re-deciding any of these fundamentals.

---

## 2. Design Decisions Summary

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Layout paradigm | Slack/Discord — persistent sidebar + contextual header | 6+ nav destinations, unread badges, nested views need a persistent sidebar |
| Sidebar organization | Grouped sections with headers (MAIN / YOU / ADMIN) | Clear grouping reduces cognitive load for a community platform |
| Thread feed layout | Master-detail split (desktop), single-column (mobile) | Lets users scan + read without losing scroll position |
| Color accent strategy | Sky blue primary + functional semantic colors | Content-dense app needs functional color for scanning (unread, flagged, online) |
| Card treatment | Flat cards with border only, hover border glow | Shadows on many simultaneous cards create visual noise |
| Header bar | Contextual — per-section actions | Threads/Messages/People have distinct action sets |
| Sidebar collapse | Deferred to Phase 2/3 | 240px fixed on desktop, drawer on mobile is sufficient for V1 |

---

## 3. Layout Architecture

### Desktop (≥1024px)
```
┌─────────┬──────────────────────────────────────────────────┐
│         │  Header (60px) — Section name + actions + icons  │
│ Sidebar ├──────────────┬───────────────────────────────────┤
│ (240px) │ Thread List   │ Thread Detail                    │
│         │ (360–420px)   │ (flex-1)                         │
│         │ scrollable    │ scrollable                       │
└─────────┴──────────────┴───────────────────────────────────┘
```

### Tablet (860–1023px)
```
┌─────────┬──────────────────────────────────────────────────┐
│ Sidebar │ Content (list OR detail, route-based)            │
│ (240px) │                                                  │
└─────────┴──────────────────────────────────────────────────┘
```

### Mobile (<860px)
```
┌──────────────────────────────────────────────────────────────┐
│ [≡]  Section Name                         [+]  [🔔]  [AV]  │
├──────────────────────────────────────────────────────────────┤
│ Content (full width, route-based)                            │
└──────────────────────────────────────────────────────────────┘
Sidebar = drawer overlay
```

**Key rules:**
- All panels scroll independently — no page-level scroll
- Header spans list + detail (not sidebar)
- Thread click: desktop → loads in detail panel (no route change), tablet/mobile → navigates to `/threads/[id]`
- Mobile sidebar: hamburger triggers slide-in drawer with scrim

---

## 4. In-App Color System

### 4.0 Token Migration Strategy

The `--app-*` tokens are **scoped to in-app pages only** via a `.app-shell` wrapper class on the AppShell container. They do NOT replace the global `--bg`, `--surface`, `--border` tokens in `:root` / `.dark` — those remain for public pages and shadcn/ui components.

**Coexistence rules:**
- In-app styled-jsx components use `--app-*` tokens exclusively
- shadcn/ui components (Button, Dialog, Dropdown, etc.) continue using their existing `--card`, `--popover`, `--background` variables — these already match the sky-blue palette from the public redesign and are close enough to the in-app values
- The `@theme inline` block stays untouched — Tailwind utilities map to the global tokens
- If a shadcn component appears inside the app shell (e.g., a Dialog), it inherits global tokens which are visually compatible (same accent, same font). No custom override needed.

**Why not replace?** The global tokens serve public pages, auth pages, and shadcn defaults. Overriding them for in-app use would break those pages. A scoped `.app-shell` block is cleaner.

### 4.1 Dark Mode Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--app-bg` | `#060810` | Root app background |
| `--app-sidebar` | `#0a0c14` | Sidebar background |
| `--app-header` | `rgba(6, 8, 16, 0.85)` | Header with backdrop-blur |
| `--app-panel` | `#0f1117` | List panels, card containers |
| `--app-card` | `#13151f` | Individual cards resting |
| `--app-card-hover` | `#181b27` | Card hover state |
| `--app-card-active` | `#141824` | Selected/active card |
| `--app-input` | `#151821` | Input fields, textareas |
| `--app-border` | `#1c1f2e` | Default borders |
| `--app-border-subtle` | `rgba(20, 23, 34, 0.25)` | Very subtle dividers |

**Accent (inherited from public):**
- `--accent`: `#0EA5E9` (sky blue)
- `--accent-hover`: `#38BDF8`
- `--accent2`: `#818CF8` (indigo)

**Semantic / functional colors:**
| Token | Value | Usage |
|-------|-------|-------|
| `--status-online` | `#3dd68c` | Online dot, success, published |
| `--status-warning` | `#fbbf24` | Pending, flagged for review |
| `--status-danger` | `#ef4444` | Deleted, banned, errors |
| `--status-info` | `#0EA5E9` | Informational, unread |

**Tag colors:**
| Token | Value | Usage |
|-------|-------|-------|
| `--tag-tech` | `#818CF8` | Tech tag |
| `--tag-design` | `#38BDF8` | Design tag |
| `--tag-career` | `#3dd68c` | Career tag |
| `--tag-ml` | `#f87171` | ML/AI tag |
| `--tag-discuss` | `#fbbf24` | Discussion tag |

### 4.2 Light Mode Tokens

| Token | Value |
|-------|-------|
| `--app-bg` | `#f4f6f9` |
| `--app-sidebar` | `#ffffff` |
| `--app-header` | `rgba(255, 255, 255, 0.88)` |
| `--app-panel` | `#ffffff` |
| `--app-card` | `#ffffff` |
| `--app-card-hover` | `#f8fafc` |
| `--app-card-active` | `#f0f7ff` |
| `--app-input` | `#f1f5f9` |
| `--app-border` | `#e2e8f0` |
| `--app-border-subtle` | `rgba(226, 232, 240, 0.5)` |

Light mode accent: `--accent: #0369A1` (deeper sky blue for contrast).

---

## 5. In-App Typography

Fonts: Plus Jakarta Sans (body via `--sans`) + Sora (headings via `--serif`). Already loaded globally via `layout.tsx`.

**Font variable migration:** Existing styled-jsx components reference `var(--font-dm-sans)` and `var(--font-dm-serif)` (the old Next.js font CSS variables). All Phase 1 files must replace these with `var(--sans)` and `var(--serif)` respectively. This applies to every styled-jsx block in WorkspaceShell, WorkspaceSidebar, ThreadsWorkspace, ThreadDetailWorkspace, and NewThreadPage.

| Element | Size | Weight | Font |
|---------|------|--------|------|
| Header section title | 16px | 700 | Sora (`--serif`) |
| Thread title (list card) | 14px | 600 | Plus Jakarta Sans |
| Thread title (detail) | 22px | 700 | Sora |
| Body text / post content | 15px | 400 | Plus Jakarta Sans |
| Card meta (time, replies) | 12px | 500 | Plus Jakarta Sans |
| Sidebar nav items | 13px | 500 | Plus Jakarta Sans |
| Sidebar section headers | 11px | 700 | Plus Jakarta Sans, uppercase, `0.06em` tracking |
| Tag pills | 11px | 600 | Plus Jakarta Sans |
| Input text | 14px | 400 | Plus Jakarta Sans |
| Reply body | 14px | 400 | Plus Jakarta Sans |
| Action labels | 12px | 500 | Plus Jakarta Sans |

Line heights: `1.75` body/post content, `1.3` headings, `1.5` cards/meta.
Letter spacing: `-0.02em` on headings ≥ 22px.

---

## 6. Component Specs

### 6.1 Sidebar (240px)

**Structure:**
1. Logo row (52px): sky-blue 8px rounded square + "KhoshGolpo" Sora 16px 700, `16px` padding
2. MAIN section: Threads, Messages, People
3. YOU section: Notifications, Settings
4. ADMIN section (conditional): Dashboard
5. User section (sticky bottom): avatar + name + @handle + online dot

**Nav item spec:**
- Height: `36px`, radius: `8px`, horizontal margin: `8px`, padding: `0 12px`
- Icon: `18px` Lucide, label: `13px` 500, gap: `10px`
- Resting: transparent bg, `--muted` color
- Hover: `--app-card-hover` bg, `--text` color
- Active: `rgba(14,165,233,0.10)` bg, `#0EA5E9` color, `2px` left border `--accent`
- Badge: right-aligned, `min-width: 18px`, `18px` height, `999px` radius, `10px` 600, `--accent` bg, `#fff` text

**User section:**
- `border-top: 1px solid --app-border`, `12px 16px` padding
- Avatar 32px with gradient + 8px online dot (`--status-online`, 2px white border)
- Name: 13px 600, handle: 11px `--muted`, both truncated
- Click → dropdown: Profile, Sign out (danger, separated by divider)

**Mobile:** Hidden, hamburger in header triggers slide-in drawer. Scrim: `rgba(0,0,0,0.4)`. Slide: `translateX(-100%) → 0` at `250ms ease-out`. Close: `180ms ease-in`.

**Lucide icons per item:**
| Item | Icon |
|------|------|
| Threads | `MessageSquare` |
| Messages | `Mail` |
| People | `Users` |
| Notifications | `Bell` |
| Settings | `Settings` |
| Admin Dashboard | `BarChart3` |

### 6.2 Header Bar (60px)

- Bg: `--app-header` + `backdrop-filter: blur(12px)`, `border-bottom: 1px solid --app-border`
- Left: section name (Sora 16px 700). On thread detail: breadcrumb "Threads / Title" with Threads as clickable link in `--muted`
- Center: search input — `max-width: 320px`, `32px` height, `8px` radius, `--app-input` bg, `Search` icon left. Focus: border → `--accent`, glow `0 0 0 2px rgba(14,165,233,0.15)`
- Right: action button(s) + bell icon + avatar dropdown

**Per-section content:**

| Section | Search placeholder | Filters | Primary action |
|---------|-------------------|---------|----------------|
| Threads | "Search threads..." | Sort (Latest/Popular/Unanswered), Channel | + New Thread |
| Thread Detail | — | — | Breadcrumb back to list |

**Search behavior:**
- Scope: current section only (thread list when on Threads)
- Trigger: debounce 300ms after typing, no Enter required
- Clear button (X) appears when input has text
- Replaces the existing in-panel search — this is a relocation, not a new feature
- Uses existing SWR search hook (`useThreads` with `search` param)

**Filter dropdowns:** Use shadcn/ui `DropdownMenu` component (already installed at `@/components/ui/dropdown-menu`). Tokens adapt to `--app-*` palette via CSS variable inheritance. No custom dropdown implementation needed. (`Select` is not installed — use `DropdownMenu` instead.)

**Theme toggle:** Rendered in the header right zone, between the action button and bell icon. Uses existing `ThemeToggle` component (relocated from current AppNavbar position).

**Mobile header (52px):** Hamburger left, section name center, essential icons right. Search → expandable overlay on icon tap.

### 6.3 Thread Card (list panel)

- Bg: `--app-card`, bottom border: `1px solid --app-border`, no radius (grid effect)
- Padding: `16px` (mobile: `12px`)
- Top row: avatar 28px (mobile: 24px) + author 13px 600 + time 12px `--muted` right-aligned
- Title: 14px 600, `line-clamp-2`, `8px` top margin
- Preview: 13px `--muted`, `line-clamp-2`, `8px` top margin
- Bottom row: tag pill + stats (12px `--muted`, icons 14px: `MessageCircle`, `ArrowUp`), `12px` top margin
  - **Views stat (`Eye` icon):** Hidden until backend provides a `view_count` field. Currently no API support — do not render a fake counter.
- Hover: bg → `--app-card-hover`, border → `rgba(14,165,233,0.20)`
- Active/selected: bg → `--app-card-active`, left `2px solid --accent`
- Unread: title weight `700` (vs 600), `6px` sky-blue dot left of title
- Featured: top `2px` border `--accent`

### 6.4 Thread Detail Panel

**Header:**
- Tag pill → title (Sora 22px 700, mobile: 18px) → author bar (avatar 36px/32px + name 14px 600 + @username 13px `--muted` + time) → divider

**Body:**
- 15px 400 `--text`, `line-height: 1.75`, `max-width: 680px` (mobile: 100% with 16px padding)
- Paragraph margin: `16px`
- Code blocks: `--app-input` bg, `1px solid --app-border`, 13px mono, `12px 16px` padding, `8px` radius
- Links: `--accent`, underline on hover

**Action bar:**
- Divider → flex row: upvote (`ArrowUp` + count), replies (`MessageCircle` + count), bookmark (`Bookmark`), share (`ExternalLink`)
- Each: `32px` height, `8px` radius, `8px 12px` padding, `--muted` resting, hover `--text` with bg
- Upvoted state: `--accent` icon + count
- Bookmarked state: `--accent` filled icon

> **API mapping:** "Upvote" in the UI maps to the existing `like_count` / `liked_by_me` API fields. This is a display-only label change — no backend modification needed.

**Replies section:**
- Header: "REPLIES" 11px 700 uppercase `--muted` + count badge, `2px` divider below

### 6.5 Reply Tree

**Reply card:**
- No border/radius — open card
- Avatar 28px + name 13px 600 + time 12px `--muted`
- Body: 14px 400, `line-height: 1.7`
- Actions: upvote + "Reply" text button, 12px `--muted`, hover `--accent`
- Padding: `16px 0`, bottom `1px solid --app-border-subtle`
- Hover: bg `rgba(14,165,233,0.03)`, action row opacity `0.5 → 1.0`

**Nesting:**
- Indent: `24px` per level (mobile: `16px`)
- Vertical connecting line: `1px solid --app-border` at `12px` left of indent
- Max visible depth: 4 (desktop), 2 (mobile) — deeper shows "Continue thread →"
- Collapse toggle: `ChevronDown`/`ChevronRight` left of avatar on parent replies

### 6.6 Reply Composer (sticky bottom)

- Position: sticky bottom of detail panel
- Bg: `--app-panel`, `border-top: 1px solid --app-border`, `12px 16px` padding
- Avatar 28px + textarea + send button
- Textarea: `--app-input` bg, `1px solid --app-border`, `8px` radius, 14px, `min-height: 38px`, auto-grows to `max-height: 120px`
- Focus: border `--accent`, glow `rgba(14,165,233,0.15)`
- Send: `32px` square, `--accent` bg, white `SendHorizontal` icon, disabled at `opacity: 0.4` when empty
- Replying-to indicator: "Replying to @username" 12px `--accent` above textarea with X dismiss

---

## 7. Interaction Patterns

### 7.1 Loading States

| Scenario | Pattern | Trigger |
|----------|---------|---------|
| Initial page load | Skeleton screen matching card layout | Immediate |
| Thread detail loading | Skeleton (title block + 3 reply skeletons) | Immediate |
| Action (post, delete, vote) | Button spinner, button disabled | 0ms |
| Load more threads | 3 skeleton cards appended | On intersection |
| Search results | Skeleton for 300ms, then results or empty | 300ms |

Skeleton: `--app-border` bg, `animate-pulse` to `--app-card-hover`.

### 7.2 Hover & Active States

| Element | Resting | Hover (200ms ease) | Press |
|---------|---------|---------------------|-------|
| Thread card | `--app-card` bg | `--app-card-hover` bg, accent border | `scale(0.995)` |
| Sidebar nav | transparent | `--app-card-hover` bg | accent 10% bg |
| Icon button | `--muted` | `--text`, circle bg | `scale(0.92)` |
| Primary button | `#0EA5E9` | `#38BDF8` | `scale(0.97)`, `#0284C7` |
| Ghost button | transparent | `--app-card-hover` bg | `scale(0.97)` |
| Reply card | transparent | `rgba(14,165,233,0.03)` bg | — |

All transitions `0.2s ease`. `prefers-reduced-motion: reduce` → `0ms`.

### 7.3 Selection & Focus

- Selected thread card: `2px` left border `--accent`, bg `--app-card-active`
- Keyboard focus: `2px` outline `--accent` at 50% opacity, `2px` offset
- Unread thread: title `700` weight + `6px` sky-blue dot
- Online indicator: `8px` circle `--status-online`, `2px` white border, avatar bottom-right

### 7.4 Toast System

| Type | Left border | Icon | Auto-dismiss |
|------|-------------|------|-------------|
| Success | `--status-online` | Checkmark | 3.5s |
| Error | `--status-danger` | X | 5s (stays if action needed) |
| Info | `--status-info` | Info | 3.5s |
| Warning | `--status-warning` | Alert | 5s |

Position: bottom-right, stacks upward, max 3. Enter: `slide-in-right` 200ms. Exit: `fade-out` 150ms.

### 7.5 Empty States

| Screen | Lucide Icon | Message | Action |
|--------|-------------|---------|--------|
| No threads | `MessageSquare` | "No threads yet. Start a conversation." | "New Thread" button |
| No replies | `MessageCircle` | "No replies yet. Be the first to respond." | Focus composer |
| Search no results | `Search` | "No results for '{query}'" | "Try different keywords" |

Icon: 48px `--muted` at 40%. Text: 15px `--muted`. Action: ghost button or link in `--accent`.

### 7.6 Confirmation Dialogs

| Action | Confirm? | Button style |
|--------|----------|-------------|
| Delete own post | Yes | Danger (`--status-danger`) |
| Delete thread | Yes | Danger |
| Report content | Modal with reason | Primary |
| Unfollow user | No — instant | — |
| Sign out | No — instant | — |

Modal scrim: `rgba(0,0,0,0.55)` + `backdrop-filter: blur(4px)`. Enter: `scale(0.97→1)` + fade, 200ms. Exit: 150ms.

---

## 8. Responsive Behavior

### 8.1 Breakpoints

| Name | Width | Sidebar | Content |
|------|-------|---------|---------|
| Desktop XL | ≥1440px | 240px | List 420px + Detail flex-1 |
| Desktop | 1024–1439px | 240px | List 360px + Detail flex-1 |
| Tablet | 860–1023px | 240px | Single column (route-based) |
| Mobile | <860px | Drawer | Full width (route-based) |

### 8.2 Mobile Adjustments

| Element | Desktop | Mobile |
|---------|---------|--------|
| Header height | 60px | 52px |
| Search | Inline input | Icon → expandable overlay |
| Card padding | 16px | 12px |
| Thread detail title | 22px Sora | 18px Sora |
| Thread body max-width | 680px | 100% + 16px padding |
| Reply nesting indent | 24px | 16px |
| Reply max visible depth | 4 levels | 2 levels |
| Avatar sizes (list) | 28px | 24px |
| Avatar sizes (detail) | 36px | 32px |
| Stats font | 12px | 11px |

### 8.3 Page Transitions

| Transition | Animation | Duration |
|------------|-----------|----------|
| List → Detail (desktop) | Content crossfade | 150ms |
| List → Detail (tablet/mobile) | Slide-in from right | 200ms ease-out |
| Detail → Back (tablet/mobile) | Slide-out to right | 150ms ease-in |
| Sidebar drawer open | Slide from left + scrim | 250ms ease-out |
| Sidebar drawer close | Slide + scrim fade | 180ms ease-in |
| Modal open | Scale 0.97→1 + fade | 200ms ease-out |
| Modal close | Scale 1→0.97 + fade | 150ms ease-in |
| Toast enter | Slide-in right | 200ms |
| Toast exit | Fade out | 150ms |

All respect `prefers-reduced-motion: reduce` → instant.

### 8.4 Scroll Behavior

| Panel | Scroll | Preservation |
|-------|--------|-------------|
| Sidebar | `overflow-y: auto`, 4px custom scrollbar | Persists across routes |
| Thread list | `overflow-y: auto` | Preserved on back navigation |
| Thread detail | `overflow-y: auto` | Resets to top on new thread |
| Reply composer | Sticky bottom, textarea internal scroll | — |

Custom scrollbar: `4px` width, `--app-border` thumb, transparent track. Hover: thumb → `--muted` at 40%.

### 8.5 Z-Index Scale

| Layer | z-index | Usage |
|-------|---------|-------|
| Base content | `0` | Cards, panels, list items |
| Sticky composer | `10` | Reply composer sticky bottom |
| Header | `20` | App header bar |
| Sidebar | `30` | Sidebar (desktop) |
| Drawer overlay | `40` | Mobile sidebar drawer + scrim |
| Dropdown / Popover | `50` | shadcn Select, DropdownMenu |
| Modal | `60` | Dialog, confirmation modals |
| Toast | `70` | Toast notifications |

---

## 9. File Change Map

### Files to create:
- None — all changes are to existing files

### Files to modify:

| File | Changes |
|------|---------|
| `frontend/src/app/globals.css` | Add `.app-shell` scoped `--app-*` token block (dark + light) |
| `frontend/src/components/app/AppShell.tsx` | Restructure layout: add `.app-shell` wrapper, sidebar + header + content |
| `frontend/src/components/app/AppNavbar.tsx` | Redesign to contextual header bar (60px), add ThemeToggle |
| `frontend/src/components/app/AppSidebar.tsx` | Minimal wrapper — may merge into AppShell |
| `frontend/src/components/app/WorkspaceSidebar.tsx` | **Primary sidebar file.** Full rewrite: grouped sections (MAIN/YOU/ADMIN), new nav items, user footer, mobile drawer. Replace all `#f0834a` / `rgba(240,131,74,...)` / `--font-dm-sans` / `--font-dm-serif` references |
| `frontend/src/components/app/WorkspaceShell.tsx` | Simplify: remove internal sidebar/orbs, delegate to AppShell |
| `frontend/src/components/threads/ThreadsWorkspace.tsx` | Full visual reskin: new tokens, cards, layout. Replace all old color/font references |
| `frontend/src/components/threads/ThreadDetailWorkspace.tsx` | Full visual reskin: detail panel, reply tree, composer. Replace all old color/font references |
| `frontend/src/app/(app)/threads/new/page.tsx` | Reskin to match new tokens and typography. Replace old font/color references |

### Files NOT changed (Phase 2/3):
- Messages, People, Notifications, Settings, Admin workspaces
- User profile, UserHoverCard
- All backend files

---

## 10. What Does NOT Change

- Component architecture (WorkspaceShell pattern retained)
- Routing structure (all existing routes kept)
- Data fetching (SWR hooks, ky client unchanged)
- Zustand auth store
- Backend API
- styled-jsx pattern (retained, values updated)
- shadcn/ui component usage

---

## 11. Acceptance Criteria

- [ ] No old orange (`#f0834a`, `#f4845f`) or purple (`#7c73f0`, `#7b6ef6`) visible in any Phase 1 file
- [ ] Sky blue accent (`#0EA5E9` dark / `#0369A1` light) used for all primary actions and active states
- [ ] Plus Jakarta Sans renders for all body text, Sora for headings
- [ ] Sidebar: 240px with grouped sections, correct active states, user section at bottom
- [ ] Header: 60px contextual, per-section actions work
- [ ] Thread list: flat cards with border grid, hover/active states, unread indicators
- [ ] Thread detail: correct typography scale, action bar, reply tree with nesting lines
- [ ] Reply composer: sticky bottom, auto-grow, disabled send when empty
- [ ] Skeleton loading states on initial load
- [ ] Toast notifications functional (success/error)
- [ ] Dark + light mode both complete
- [ ] Mobile (375px): drawer sidebar, single column, no horizontal scroll
- [ ] Tablet (860–1023px): sidebar + single column content
- [ ] Desktop (≥1024px): sidebar + list + detail, all panels scroll independently
- [ ] `prefers-reduced-motion` disables all animations
- [ ] All interactive elements have `cursor: pointer`
- [ ] Focus states visible for keyboard navigation
