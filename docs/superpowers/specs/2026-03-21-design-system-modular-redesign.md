# KhoshGolpo Design System & Modular Redesign — Phase 1 Spec

**Date:** 2026-03-21
**Status:** Draft
**Scope:** Phase 1 (Design System) + Phase 2 Outline (Page Application)

---

## 1. Goals

1. Establish a shared component library (~32 components) that all in-app pages consume.
2. Standardize styling: **Tailwind + shadcn/ui everywhere**; remove all `styled-jsx` from components and workspace files.
3. Break monolithic workspace files into focused feature-folders with co-located hooks.
4. Extend the token system in `globals.css` (merge `.app-shell` scope into `:root`/`.dark`) and expose new tokens via `@theme inline`.
5. Future-proof: new pages should be buildable by composing existing design system components.

---

## 2. Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Styling system | Tailwind + shadcn everywhere, drop styled-jsx | Consistency with shadcn primitives; `cn()` utility works everywhere |
| Visual style | Dark OLED minimal + selective glass/glow on interactive elements | Readable for long sessions; lively on hover/active states |
| Density | Comfortable — 40px rows, 12–16px padding, size variants per component | Matches existing 40px touch targets; scannable without wasting space |
| Component API | Hybrid — props-first for patterns; composition-first for primitives | Patterns enforce consistent layouts; primitives need flexibility |
| File structure | Feature-folder with co-located hook per workspace section | Isolation; each orchestrator stays under ~100 lines |
| Spec scope | Phase 1 full spec + Phase 2 outline | Validates library covers all use cases before page work begins |

---

## 3. Token System

### 3.1 Action: Merge `.app-shell` scope into `:root`/`.dark`

Delete the `.app-shell { }` and `.dark .app-shell { }` blocks added in the previous phase. Their values are absorbed into `:root` / `.dark` so they work everywhere, not just inside `.app-shell`.

### 3.2 New tokens to ADD

Add to both `:root` (light values) and `.dark` (dark values):

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--card-hover` | `#f8fafc` | `#181b27` | Card hover background |
| `--card-active` | `#f0f7ff` | `#141824` | Selected/active card bg |
| `--surface-elevated` | `#ffffff` | `#1a1d2b` | Modals, popovers, drawers |
| `--border-subtle` | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.06)` | Dividers, separators |
| `--text-primary` | `#0f172a` | `#e8eaf2` | Body text |
| `--text-secondary` | `#475569` | `#8892a4` | Sub-labels, descriptions |
| `--text-tertiary` | `#94a3b8` | `#636f8d` | Timestamps, hints, meta |
| `--success` | `#16a34a` | `#3dd68c` | Online status, approve, save |
| `--warning` | `#d97706` | `#fbbf24` | Pending, caution |
| `--info` | `#6366f1` | `#818CF8` | Tags, badges, secondary accent |
| `--accent-glow` | `transparent` | `rgba(14,165,233,0.4)` | Glow filter (dark only) |
| `--accent-muted` | `rgba(14,165,233,0.08)` | `rgba(14,165,233,0.10)` | Active nav bg, subtle highlights |
| `--duration-fast` | `150ms` | `150ms` | Hover/focus transitions |
| `--duration-normal` | `220ms` | `220ms` | Open/close animations |
| `--duration-slow` | `300ms` | `300ms` | Page-level transitions |

### 3.3 Extend Tailwind via `@theme inline`

In `globals.css`, add an `@theme inline` block to register new tokens as Tailwind utilities:

```css
@theme inline {
  --color-card-hover:       var(--card-hover);
  --color-card-active:      var(--card-active);
  --color-surface-elevated: var(--surface-elevated);
  --color-text-primary:     var(--text-primary);
  --color-text-secondary:   var(--text-secondary);
  --color-text-tertiary:    var(--text-tertiary);
  --color-success:          var(--success);
  --color-warning:          var(--warning);
  --color-info:             var(--info);
  --color-accent-muted:     var(--accent-muted);
}
```

This makes `bg-card-hover`, `text-text-secondary`, `bg-accent-muted`, etc. available as Tailwind classes.

### 3.4 Existing tokens — keep as-is

`--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--muted`, `--destructive`, `--input`, `--border`, `--accent`, `--accent2`, `--ring`, all `--sidebar-*`, all `--chart-*`, `--sans`, `--serif`, `--radius`.

---

## 4. Component Library — Phase 1

All components live in `frontend/src/components/ui/`. Each gets its own file. All use Tailwind + `cn()`. No styled-jsx.

### 4.1 Layer 1: Primitives (composition-first)

#### `Avatar`
Shows user avatar image with initials fallback + optional status dot.

```tsx
// API
<Avatar src={url} name="Rahim" size="md" status="online" className="..." />

// size: "xs" (20px) | "sm" (28px) | "md" (36px) | "lg" (48px) | "xl" (80px)
// status: "online" | "away" | "offline" | undefined (no dot)
```

Implementation notes:
- `src` loads in `<img>` with `onError` fallback to initials
- Initials: first letter of first + last name word, uppercase
- Status dot: absolute-positioned bottom-right, colored via `--success` / `--warning` / `--text-tertiary`
- Accessible: `role="img"` + `aria-label={name}`

#### `Badge`
Inline label for status, tags, counts.

```tsx
<Badge variant="success" size="sm">Online</Badge>
<Badge variant="outline">General</Badge>

// variant: "default" | "success" | "warning" | "danger" | "info" | "outline"
// size: "sm" | "md"
```

Uses CVA for variant classes. Rounded-full, font-medium, uppercase tracking.

#### `Skeleton`
Loading placeholder.

```tsx
<Skeleton variant="text" className="w-32 h-4" />
<Skeleton variant="circle" className="w-10 h-10" />
<Skeleton variant="rect" className="w-full h-24 rounded-xl" />
```

Renders a `div` with `animate-pulse bg-muted`. `className` controls all sizing.

#### `EmptyState`
No-content placeholder.

```tsx
<EmptyState
  icon={<MessageSquare />}
  title="No threads yet"
  description="Be the first to start a discussion."
  action={{ label: "New Thread", onClick: () => {} }}
/>
```

Centered column layout. Icon in a rounded container with `bg-accent-muted`. Title in `--text-primary`, description in `--text-secondary`. Action renders a `Button`.

#### `Toast`
Global notification system via a hook.

```tsx
// Usage
const { toast } = useToast();
toast.success("Thread created");
toast.error("Failed to post reply");
toast.info("Saved to drafts");

// Options
toast.success("...", { duration: 3500 })
```

Implementation:
- Provider wraps the app in `(app)/layout.tsx`
- Toasts render in a fixed `bottom-right` portal via `createPortal`
- Auto-dismiss after `duration` ms (default 3500)
- Slide-in/out animation using `@keyframes` in globals.css
- Stack limit: 3 visible at once, oldest dismissed on overflow
- Accessible: `role="status"`, `aria-live="polite"`

#### `SearchInput`
Search field with icon and optional clear button.

```tsx
<SearchInput
  value={q}
  onChange={setQ}
  placeholder="Search threads..."
  size="md"
  debounceMs={300}
  onSearch={handleSearch}
  className="..."
/>
```

- Leading `<Search>` icon from lucide-react
- Clear `<X>` button appears when value is non-empty
- `debounceMs` debounces `onSearch` internally
- Focus ring: `ring-2 ring-accent`

#### `FilterChips`
Horizontally scrollable row of toggleable chips.

```tsx
<FilterChips
  items={[{ value: "all", label: "All" }, { value: "open", label: "Open" }]}
  value="all"
  onChange={setValue}
  variant="pill"
/>

// variant: "pill" (rounded-full bg) | "underline" (border-bottom only)
```

Single-select by default. `multiple` prop enables multi-select.

#### `TabBar`
Tab navigation.

```tsx
<TabBar
  tabs={[{ value: "posts", label: "Posts", count: 12 }, { value: "about", label: "About" }]}
  activeTab="posts"
  onChange={setTab}
/>
```

- Active tab: `border-b-2 border-accent text-accent`
- Inactive: `text-text-secondary hover:text-text-primary`
- Optional count badge per tab
- `role="tablist"` + `role="tab"` + `aria-selected`

#### `Modal`
Accessible dialog wrapper.

```tsx
<Modal open={open} onClose={onClose} title="Confirm Action" size="md">
  <Modal.Body>...</Modal.Body>
  <Modal.Footer>
    <Button variant="ghost" onClick={onClose}>Cancel</Button>
    <Button variant="primary" onClick={onConfirm}>Confirm</Button>
  </Modal.Footer>
</Modal>

// size: "sm" (400px) | "md" (540px) | "lg" (720px)
```

- Renders via `createPortal` to `document.body`
- Backdrop: `bg-black/60 backdrop-blur-sm`
- Focus trap: first focusable element on open; returns focus on close
- Escape key closes
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby`

#### `ConfirmDialog`
Destructive action confirmation, extends Modal.

```tsx
<ConfirmDialog
  open={open}
  onClose={onClose}
  onConfirm={handleDelete}
  variant="danger"
  title="Delete thread?"
  description="This cannot be undone."
  confirmLabel="Delete"
/>

// variant: "danger" | "warning"
```

Confirm button uses `destructive` variant for danger, `warning` color for warning.

#### `LoadMoreButton`
Trigger for paginated load-more.

```tsx
<LoadMoreButton loading={loading} hasMore={hasMore} onClick={loadMore} />
```

Full-width, dashed border, `text-text-secondary`. Shows spinner when loading. Hidden when `!hasMore`.

#### `PageHeader`
Section title row.

```tsx
<PageHeader
  title="Threads"
  count={42}
  action={{ label: "+ New Thread", onClick: () => {} }}
/>
```

Flexbox row: title (Sora, 18px, 700) + optional count Badge + optional action Button pushed to right.

#### `DataTable`
Sortable table with skeleton loading.

```tsx
<DataTable
  columns={[
    { key: "user", label: "User", sortable: true },
    { key: "joined", label: "Joined", sortable: true },
    { key: "status", label: "Status" },
  ]}
  data={rows}
  onSort={handleSort}
  loading={loading}
  emptyState={<EmptyState title="No users" />}
/>
```

- `loading=true` renders skeleton rows (5 rows, animated)
- Sortable columns show `<ArrowUpDown>` icon; active sort shows directional arrow
- Row height: 44px
- Sticky header

#### `Drawer`
Slide-in side panel from right edge.

```tsx
<Drawer open={open} onClose={onClose} title="User Details" size="md">
  ...content...
</Drawer>

// size: "sm" (360px) | "md" (480px) | "lg" (640px)
```

- `translateX(100%)` → `translateX(0)` with `--duration-normal`
- Backdrop closes on click
- Scrollable content area with sticky header + optional footer

#### `InfiniteScrollList`
Scroll-triggered load-more wrapper.

```tsx
<InfiniteScrollList onLoadMore={loadMore} hasMore={hasMore} loading={loading}>
  {items.map(item => <ThreadCard key={item.id} thread={item} />)}
</InfiniteScrollList>
```

Uses `IntersectionObserver` on a sentinel div at the bottom. Shows `Skeleton` rows when `loading`. No scroll event listeners.

#### `RichTextRenderer`
Markdown → safe HTML.

```tsx
<RichTextRenderer content={post.body} className="prose prose-invert" />
```

Re-exports and styles the existing `RichText.tsx`. Adds `prose` Tailwind typography classes. Sanitizes HTML via existing implementation.

#### `Divider`
Horizontal rule, optionally labeled.

```tsx
<Divider />
<Divider label="or" />
```

`border-t border-border-subtle`. Labeled variant: flex with spans either side.

### 4.2 Layer 2: Patterns (props-first)

#### `ThreadCard`

```tsx
<ThreadCard
  thread={thread}
  variant="list"
  selected={selected}
  onSelect={onSelect}
/>

// variant: "list" (full-width row) | "compact" (reduced padding/meta)
```

Layout (list variant):
- Left: Avatar (md, author)
- Body: Title (16px, 600), channel badge + tag chips (truncated), first-line excerpt, meta row (author name · timestamp · reply count · like count)
- Right: unread dot if applicable
- Active: `bg-card-active border-l-2 border-accent`
- Hover: `bg-card-hover`

#### `PostCard`

```tsx
<PostCard
  post={post}
  onLike={handleLike}
  onReply={handleReply}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onFlag={handleFlag}
  isAuthor={isAuthor}
/>
```

Layout:
- Header: Avatar (sm) + display_name + @username + timestamp
- Body: `RichTextRenderer`
- Footer: Like button (count) · Reply button · Edit (if `isAuthor`) · Delete (if `isAuthor`) · Flag
- Hover: `bg-card-hover` transition

#### `NotificationItem`

```tsx
<NotificationItem
  notification={notification}
  onAction={handleAction}
  onDismiss={handleDismiss}
/>
```

- Unread: `bg-accent-muted` left border `border-l-2 border-accent`
- Icon color by type: reply → `--info`, like → `--warning`, flag → `--danger`, system → `--text-tertiary`
- Contextual action button (e.g. "View Thread", "Appeal")

#### `UserCard`

```tsx
<UserCard
  user={user}
  onFollow={handleFollow}
  onConnect={handleConnect}
  variant="grid"
/>

// variant: "grid" (card layout) | "list" (row layout)
```

Grid variant: Avatar (xl, centered), name, @username, bio preview (2-line clamp), follower count, Follow + Connect buttons.
List variant: Avatar (md) + name + @username + bio (1-line) + action buttons right-aligned.

#### `ConversationItem`

```tsx
<ConversationItem
  conversation={conversation}
  selected={selected}
  onSelect={onSelect}
/>
```

- Avatar (md) + display_name + last message preview (1-line truncate) + timestamp
- Unread count badge (right)
- Active: `bg-card-active`

#### `StatCard`

```tsx
<StatCard
  label="Total Threads"
  value={1234}
  change={{ value: 12, direction: "up" }}
  icon={<MessageSquare />}
/>
```

- Icon in `bg-accent-muted` rounded container
- Value: Sora, 28px, 700
- Change: green arrow if up, red if down, `--text-tertiary` if neutral

---

## 5. Form Components

These extend shadcn primitives with consistent styling:

#### `FormField`

```tsx
<FormField label="Display Name" error={errors.name} hint="Max 40 chars" required>
  <Input {...register("name")} />
</FormField>
```

Wrapper: label → input slot → error message (red) or hint (muted). Consistent 4px spacing.

#### `PasswordInput`

```tsx
<PasswordInput {...register("password")} />
```

`Input` with eye-toggle button right-aligned. Toggles `type="password"` / `type="text"`.

#### `ToggleSwitch`

```tsx
<ToggleSwitch checked={checked} onChange={setChecked} label="Email notifications" />
```

Custom styled toggle (not browser checkbox). `bg-accent` when checked, `bg-input` when off.

---

## 6. File Structure

### 6.1 Design system location

All new components go into `frontend/src/components/ui/`:

```
frontend/src/components/ui/
  avatar.tsx
  badge.tsx
  skeleton.tsx
  empty-state.tsx
  toast.tsx              ← + useToast hook + ToastProvider
  search-input.tsx
  filter-chips.tsx
  tab-bar.tsx
  modal.tsx
  confirm-dialog.tsx
  load-more-button.tsx
  page-header.tsx
  data-table.tsx
  drawer.tsx
  infinite-scroll-list.tsx
  rich-text-renderer.tsx
  divider.tsx
  thread-card.tsx
  post-card.tsx
  notification-item.tsx
  user-card.tsx
  conversation-item.tsx
  stat-card.tsx
  form-field.tsx
  password-input.tsx
  toggle-switch.tsx
  index.ts               ← barrel export all
```

### 6.2 Workspace feature-folders

```
frontend/src/components/
  threads/
    ThreadsWorkspace.tsx       ← orchestrator (~80 lines)
    ThreadListPanel.tsx
    ThreadPreviewPanel.tsx
    ThreadComposeModal.tsx
    useThreadsPage.ts
    index.ts
  thread-detail/
    ThreadDetailWorkspace.tsx  ← orchestrator
    PostList.tsx
    ReplyComposer.tsx
    useThreadDetail.ts
    index.ts
  messages/
    MessagesWorkspace.tsx      ← orchestrator
    ConversationList.tsx
    ChatPanel.tsx
    MessageComposer.tsx
    useMessages.ts             ← already exists, keep
    index.ts
  notifications/
    NotificationsWorkspace.tsx ← orchestrator
    NotificationList.tsx
    AppealModal.tsx            ← already exists, keep
    useNotifications.ts        ← already exists, keep
    index.ts
  people/
    PeopleWorkspaceShell.tsx   ← keep
    PeopleExploreWorkspace.tsx ← reskin
    PeopleSearchWorkspace.tsx  ← reskin
    PeopleRequestsWorkspace.tsx ← reskin
    index.ts
    (PeopleCard.tsx deleted — replaced by UserCard)
  admin/
    AdminWorkspace.tsx         ← reskin, keep tabs/ structure
    tabs/                      ← reskin each tab file
    (shared/ deleted — replaced by design system)
    index.ts
  settings/
    SettingsWorkspace.tsx      ← orchestrator
    ProfileForm.tsx
    SecurityForm.tsx
    ActivityTab.tsx
    useSettings.ts
    index.ts
  user-profile/
    UserProfileWorkspace.tsx   ← orchestrator
    ProfileHeader.tsx
    ProfileThreadList.tsx
    useUserProfile.ts
    index.ts
  app/
    AppShell.tsx               ← reskin to Tailwind (keep structure)
    AppNavbar.tsx              ← reskin to Tailwind
    AppSidebar.tsx             ← reskin to Tailwind
    WorkspaceShell.tsx         ← reskin to Tailwind
    WorkspaceSidebar.tsx       ← keep (backward compat) or deprecate
  auth/
    AuthShell.tsx              ← reskin to Tailwind
  shared/
    (keep: FollowButton, ConnectionButton, FollowersModal, ReportModal, UserHoverCard, ThemeToggle, PageLoader, ScrollArea)
```

---

## 7. Styling Migration Rules

When migrating any component from styled-jsx to Tailwind:

1. **Colors** — Use token-based Tailwind classes (`bg-card`, `text-text-secondary`, `border-border-subtle`). Never hardcode hex values in className.
2. **Spacing** — Use Tailwind's spacing scale (4px = `p-1`, 8px = `p-2`, 12px = `p-3`, 16px = `p-4`).
3. **Typography** — `font-sans` maps to `var(--sans)` (Plus Jakarta Sans). `font-serif` maps to `var(--serif)` (Sora). Sizes: `text-sm` (14px), `text-base` (15px), `text-lg` (16px). Weights: `font-medium` (500), `font-semibold` (600), `font-bold` (700).
4. **Transitions** — `transition-colors duration-[150ms]` for color-only. `transition-all duration-[220ms]` for transforms + color.
5. **Hover/active states** — Use Tailwind's `hover:` and `data-[active]:` variants.
6. **Focus rings** — `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent` on all interactive elements.
7. **Grid layouts** — `grid grid-cols-[240px_1fr]` replaces `display: grid; grid-template-columns: 240px 1fr`. Use inline `style` for dynamic grid values.
8. **cn() utility** — Always use `cn(baseClasses, conditionalClasses, className)` signature to allow className pass-through.
9. **No styled-jsx** — Zero `<style jsx>` blocks in any component. All dynamic styles via inline `style={{ }}` for truly dynamic values (e.g., scroll position).
10. **Reduced motion** — Add `motion-safe:` Tailwind variant prefix on all transition/animation classes instead of separate `@media (prefers-reduced-motion)` blocks.

---

## 8. Accessibility Requirements

All components MUST:

- Have keyboard navigation (Tab, Enter, Space, Escape, Arrow keys where applicable)
- Have visible focus indicators (`ring-2 ring-accent` outline)
- Have ARIA labels on icon-only buttons
- Use semantic HTML (`<button>`, `<nav>`, `<dialog>`, `<article>`)
- Pattern components (`ThreadCard`, `PostCard`, etc.) use `<article>` with `aria-label`
- Lists use `<ul>` / `<li>`
- `Modal` and `Drawer`: focus trap + Escape closes + `aria-modal`
- `TabBar`: `role="tablist"` + `role="tab"` + `aria-selected` + arrow key navigation
- `DataTable`: `<table>` with `<th scope="col">`
- Color is never the only differentiator (icons + text labels accompany color)

---

## 9. Component Flexibility Rules

To ensure components can accommodate future page restructuring:

1. **All components accept `className`** — Consumers can override layout without forking the component.
2. **Pattern components expose sub-parts** — e.g., `ThreadCard.Title`, `ThreadCard.Meta` are exported separately for exceptional use cases.
3. **WorkspaceShell is optional** — Pages can render directly inside `app-content` without WorkspaceShell if the layout requires it.
4. **Variant props, not forks** — New visual requirements go into `variant` or `size` props, not new components. E.g., adding kanban board view adds `variant="kanban"` to ThreadCard, not a new KanbanThreadCard.
5. **No hardcoded pixel dimensions** — All sizing is via props (`size="sm|md|lg"`) or className override, never hardcoded in component internals.

---

## 10. Phase 2 Outline — Page Application

This outline documents how each page section consumes the design system. Full implementation details will be specified in a separate Phase 2 spec.

### 10.1 Threads Page (`/threads`)

**Feature folder:** `components/threads/`
**Layout:** WorkspaceShell 2-panel grid (`grid-cols-[360px_1fr]`)
**Components consumed:** ThreadCard, SearchInput, FilterChips, TabBar, EmptyState, Skeleton, LoadMoreButton, Modal (compose), ConfirmDialog, Toast, Badge, Avatar, PageHeader
**Modular breakup:**
- `ThreadsWorkspace.tsx` — layout grid + wires panels together
- `ThreadListPanel.tsx` — search bar, filter chips, thread list with InfiniteScrollList
- `ThreadPreviewPanel.tsx` — selected thread details, reply preview
- `ThreadComposeModal.tsx` — new thread form (title, body, channel, tags)
- `useThreadsPage.ts` — thread list fetch, filter state, selected thread state, pagination

### 10.2 Thread Detail Page (`/threads/[id]`)

**Feature folder:** `components/thread-detail/`
**Layout:** WorkspaceShell single column, max-width 720px centered
**Components consumed:** PostCard, Avatar, Badge, EmptyState, Skeleton, Modal (edit/delete), ConfirmDialog, Toast, RichTextRenderer
**Modular breakup:**
- `ThreadDetailWorkspace.tsx` — header (thread info) + PostList + ReplyComposer
- `PostList.tsx` — renders PostCard list, handles nested replies
- `ReplyComposer.tsx` — auto-grow textarea, submit, retry on error
- `useThreadDetail.ts` — thread fetch, post CRUD, like/flag, author resolution

### 10.3 New Thread Page (`/threads/new`)

**Layout:** Centered form card, max-width 720px
**Components consumed:** FormField, TextArea, FilterChips (tag selection), Button, Toast
**No feature-folder needed** — stays as `app/(app)/threads/new/page.tsx` with inline component (~200 lines)

### 10.4 Messages Page (`/messages`)

**Feature folder:** `components/messages/`
**Layout:** WorkspaceShell 2-panel (`grid-cols-[300px_1fr]`)
**Components consumed:** SearchInput, ConversationItem, Avatar, EmptyState, Skeleton, Divider (day separators), Toast
**Modular breakup:**
- `MessagesWorkspace.tsx` — 2-panel layout
- `ConversationList.tsx` — search + ConversationItem list
- `ChatPanel.tsx` — message bubbles + day dividers
- `MessageComposer.tsx` — auto-grow textarea, send
- `useMessages.ts` — already exists, keep

### 10.5 Notifications Page (`/notifications`)

**Feature folder:** `components/notifications/`
**Layout:** WorkspaceShell single column, max-width 680px
**Components consumed:** NotificationItem, FilterChips, TabBar, EmptyState, Skeleton, Toast, Avatar, Modal (appeal)
**Modular breakup:**
- `NotificationsWorkspace.tsx` — TabBar + filter + NotificationList
- `NotificationList.tsx` — renders NotificationItem with InfiniteScrollList
- `AppealModal.tsx` — already exists, keep
- `useNotifications.ts` — already exists, keep

### 10.6 People Pages

**Feature folder:** `components/people/`
**Layout:** PeopleWorkspaceShell hero + tab nav (keep, reskin)
**Components consumed:** UserCard (replaces PeopleCard), SearchInput, FilterChips, LoadMoreButton, EmptyState, Skeleton, Badge, Avatar, Toast
**Changes:** Delete `PeopleCard.tsx`; replace with `UserCard` from design system. Reskin all 3 workspace files to Tailwind.

### 10.7 Admin Page (`/admin`)

**Feature folder:** `components/admin/`
**Layout:** WorkspaceShell single column + TabBar
**Components consumed:** TabBar, StatCard, DataTable, SearchInput, FilterChips, PageHeader, EmptyState, Skeleton, Drawer (user detail), Modal, ConfirmDialog, Toast, Badge, Avatar
**Changes:** Delete `components/admin/shared/` — all replaced by design system. Reskin `tabs/` files. `AdminWorkspace.tsx` orchestrator reskinned.

### 10.8 Settings Page (`/settings`)

**Feature folder:** `components/settings/`
**Layout:** WorkspaceShell single column, max-width 640px
**Components consumed:** TabBar, FormField, PasswordInput, TextArea, ToggleSwitch, Avatar, Badge, Button, Divider, Toast
**Modular breakup:**
- `SettingsWorkspace.tsx` — TabBar orchestrator
- `ProfileForm.tsx` — name, bio, slug, gender
- `SecurityForm.tsx` — password change
- `ActivityTab.tsx` — activity log with DataTable
- `useSettings.ts` — profile fetch/update, slug validation

### 10.9 User Profile Page (`/users/[id]`, `/[username]`)

**Feature folder:** `components/user-profile/`
**Layout:** WorkspaceShell single column, scrollable
**Components consumed:** Avatar (xl), Badge, ThreadCard, StatCard, EmptyState, Skeleton, Modal (followers, admin edit), FormField, Button, PageHeader
**Modular breakup:**
- `UserProfileWorkspace.tsx` — orchestrator
- `ProfileHeader.tsx` — cover, avatar, name, stats, follow/connect
- `ProfileThreadList.tsx` — user's threads using ThreadCard + InfiniteScrollList
- `useUserProfile.ts` — profile fetch, follow/connect state

### 10.10 Auth Pages

**Reskin only** — no structural change.
**Components consumed:** FormField, PasswordInput, Checkbox (from shadcn), Button, Divider (labeled "or"), Spinner
AuthShell layout stays. Swap inline form HTML for design system components.

### 10.11 Public Pages (Homepage, Features, Community)

**Out of scope.** These are marketing pages with their own styling system and don't share components with the in-app design system. They will be addressed in a separate spec.

---

## 11. Non-Goals (Explicitly Out of Scope)

- Public/marketing pages (Homepage, Features, Community)
- Backend API changes
- New features (not currently in V1)
- Animation library (Framer Motion etc.) — CSS transitions only
- Storybook or component documentation site
- Unit tests for UI components (design system stability is validated by page integration)

---

## 12. Success Criteria

Phase 1 is complete when:
- [ ] All 32 components exist in `components/ui/` with Tailwind styling
- [ ] `globals.css` has the new token additions and `.app-shell` scope removed
- [ ] `@theme inline` block exposes all new tokens as Tailwind utilities
- [ ] All components pass keyboard navigation and have correct ARIA attributes
- [ ] No `styled-jsx` in any file under `components/ui/`

Phase 2 is complete when:
- [ ] All 8 workspace sections are restructured into feature-folders
- [ ] All workspace files use Tailwind + design system components
- [ ] No `styled-jsx` in any file under `components/`
- [ ] `components/admin/shared/` and `PeopleCard.tsx` deleted
- [ ] All pages render correctly in both light and dark mode
