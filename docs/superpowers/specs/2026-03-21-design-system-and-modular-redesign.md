# KhoshGolpo Design System & Modular Page Redesign

**Date:** 2026-03-21
**Status:** Draft
**Scope:** Phase 1 — Design system component library + token consolidation; Phase 2 outline — page-by-page application

---

## 1. Goals

1. **Consolidate tokens** — Merge `.app-shell` scoped CSS variables into `:root`/`.dark`, extend via `@theme inline`. Single source of truth.
2. **Build a component library** — 32 new components + 5 extended shadcn components. Covers ~95% of UI patterns across all workspace pages.
3. **Drop styled-jsx** — Migrate all workspace components from `<style jsx>` to Tailwind utility classes. One styling system across the entire app.
4. **Modularize monoliths** — Break 7 workspace files (total ~8,500 lines) into feature-folders with orchestrators, sub-components, and co-located hooks.
5. **Apply consistently** — Every in-app page uses design system components for visual consistency and reduced duplication.

---

## 2. Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Styling | Tailwind + shadcn everywhere | Consistent with existing shadcn primitives; eliminates styled-jsx/Tailwind split |
| Visual style | Dark OLED minimal + selective glass/glow | Readable for long sessions; personality via interactive elements |
| Density | Comfortable (40px rows, 12-16px padding) | Matches existing AppSidebar; density variants per component for Admin/data views |
| Component API | Hybrid: composition-first primitives, props-first patterns | Flexible where needed (Avatar, Badge), consistent where it matters (ThreadCard, UserCard) |
| File structure | Feature-folder with co-located hooks | Clear ownership, ~300 lines per file max, easy navigation |
| Token approach | `:root`/`.dark` + `@theme inline` (Tailwind v4) | Leverages existing system; no `tailwind.config.ts` needed |

---

## 3. Token System

### 3.1 Strategy

- **Merge** `.app-shell` / `.dark .app-shell` tokens (globals.css lines 1037–1074) into existing `:root` / `.dark` blocks
- **Extend** with new semantic tokens via `@theme inline`
- **Delete** the `.app-shell` and `.dark .app-shell` CSS blocks after merge
- **Keep** all existing shadcn tokens (`--background`, `--foreground`, `--card`, `--primary`, etc.) unchanged

### 3.2 New Tokens to Add

Added to `:root` (light values) and `.dark` (dark values):

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--card-hover` | `#f8fafc` | `#181b27` | Card hover state |
| `--card-active` | `#f0f7ff` | `#141824` | Card selected/active |
| `--surface-elevated` | `#ffffff` | `#1a1d2b` | Modals, popovers, drawers |
| `--border-subtle` | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.06)` | Dividers, separators |
| `--text-tertiary` | `#94a3b8` | `#636f8d` | Timestamps, hints, captions |
| `--success` | `#16a34a` | `#3dd68c` | Online, approve, save |
| `--warning` | `#d97706` | `#fbbf24` | Pending, caution |
| `--info` | `#6366f1` | `#818CF8` | Tags, badges, secondary accent |
| `--accent-glow` | `transparent` | `rgba(14,165,233,0.4)` | Glow effects (dark only) |
| `--accent-muted` | `rgba(14,165,233,0.08)` | `rgba(14,165,233,0.10)` | Active nav bg, subtle highlights |

### 3.3 `@theme inline` Additions

Map new tokens for Tailwind v4 consumption:

```css
@theme inline {
  /* ... existing mappings ... */
  --color-card-hover: var(--card-hover);
  --color-card-active: var(--card-active);
  --color-surface-elevated: var(--surface-elevated);
  --color-border-subtle: var(--border-subtle);
  --color-text-tertiary: var(--text-tertiary);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-info: var(--info);
  --color-accent-glow: var(--accent-glow);
  --color-accent-muted: var(--accent-muted);
}
```

### 3.4 Existing Tokens Retained

All shadcn tokens remain unchanged: `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--input`, `--ring`, `--border`, all `--sidebar-*`, all `--chart-*`.

### 3.5 Delete

- `.app-shell { ... }` block (lines 1037–1060)
- `.dark .app-shell { ... }` block (lines 1062–1074)

Values absorbed into `:root`/`.dark`. Components previously using `var(--app-card)` switch to `bg-card` Tailwind class.

---

## 4. Component Library

### 4.1 File Location

All components live under `frontend/src/components/ui/`. This extends the existing shadcn directory.

```
components/ui/
  avatar.tsx          ← new
  badge.tsx           ← existing, extend
  button.tsx          ← existing, extend
  card.tsx            ← existing, extend
  checkbox.tsx        ← new
  confirm-dialog.tsx  ← new
  data-table.tsx      ← new
  dialog.tsx          ← existing, keep
  divider.tsx         ← new
  drawer.tsx          ← new
  dropdown-menu.tsx   ← existing, keep
  empty-state.tsx     ← new
  filter-chips.tsx    ← new
  form-field.tsx      ← new
  infinite-scroll-list.tsx ← new
  input.tsx           ← existing, extend
  load-more-button.tsx ← new
  modal.tsx           ← new
  page-header.tsx     ← new
  pagination.tsx      ← new
  password-input.tsx  ← new
  radio-group.tsx     ← new
  search-input.tsx    ← new
  select.tsx          ← new
  skeleton.tsx        ← new
  spinner.tsx         ← new
  stat-card.tsx       ← new
  tab-bar.tsx         ← new
  textarea.tsx        ← new
  toast.tsx           ← new (+ useToast hook)
  toggle-switch.tsx   ← new
```

Pattern components live in their feature-folders:

```
components/threads/ThreadCard.tsx
components/threads/PostCard.tsx
components/notifications/NotificationItem.tsx
components/people/UserCard.tsx
components/messages/MessageBubble.tsx
components/admin/StatCard.tsx  ← re-exports from ui/stat-card.tsx (backward compat during migration)
```

### 4.2 Layer 1: Primitives (composition-first API)

#### 4.2.1 Avatar

```tsx
interface AvatarProps {
  src?: string;
  fallback: string;         // initials or name (component extracts initials)
  size?: "sm" | "md" | "lg" | "xl";  // 28 | 34 | 44 | 64 px
  status?: "online" | "offline" | "away";
  className?: string;
}
```

- Renders `<img>` if `src` provided, otherwise gradient background with initials
- Status dot: absolute positioned, bottom-right, color from `--success`/`--warning`/`--muted`
- Online dot has subtle glow: `box-shadow: 0 0 6px var(--success)`
- Sizes: sm=28px, md=34px, lg=44px, xl=64px

#### 4.2.2 Badge (extend existing)

Add variants to existing shadcn badge:

```tsx
variant: "default" | "secondary" | "destructive" | "outline"
       | "success" | "warning" | "info"   // NEW
size?: "sm" | "md"                         // NEW: sm=20px height, md=24px
```

- `success`: `bg-success/15 text-success border-success/20`
- `warning`: `bg-warning/15 text-warning border-warning/20`
- `info`: `bg-info/15 text-info border-info/20`
- Font: 11px, weight 600, uppercase, `tracking-wider`

#### 4.2.3 Skeleton

```tsx
interface SkeletonProps {
  variant?: "text" | "circle" | "rect";
  className?: string;  // sizing via Tailwind: w-32 h-4, etc.
}
```

- `text`: rounded-md, h-4 default
- `circle`: rounded-full, equal w/h
- `rect`: rounded-lg, accepts any w/h
- Animation: `animate-pulse` (Tailwind built-in)

#### 4.2.4 Spinner

```tsx
interface SpinnerProps {
  size?: "sm" | "md" | "lg";   // 16 | 20 | 24 px
  className?: string;
}
```

- Uses Lucide `LoaderCircle` with `animate-spin`
- Color inherits from parent (`currentColor`)

#### 4.2.5 EmptyState

```tsx
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}
```

- Centered flex column, `py-16`
- Icon: 48px, `text-muted-foreground`
- Title: 16px, font-semibold, `text-foreground`
- Description: 14px, `text-muted-foreground`, max-w-sm
- Action: renders Button with `variant="outline"`, mt-4
- Border: `border border-dashed border-border rounded-lg`

#### 4.2.6 Toast (+ useToast hook)

```tsx
// Hook API
const { toast } = useToast();
toast.success("Thread created");
toast.error("Failed to delete");
toast.info("Connection request sent");

// Internal Toast component
interface ToastProps {
  variant: "success" | "error" | "info";
  message: string;
  duration?: number;  // default 3500ms
}
```

- Fixed position bottom-right, `z-50`
- Stacks vertically (max 3 visible)
- Animation: slide up + fade in (150ms), slide down + fade out on dismiss
- Success: `bg-success/15 border-success/30 text-success`
- Error: `bg-destructive/15 border-destructive/30 text-destructive`
- Info: `bg-info/15 border-info/30 text-info`
- `pointer-events-none` so they don't block interaction
- Respects `prefers-reduced-motion`

#### 4.2.7 SearchInput

```tsx
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  size?: "sm" | "md";           // sm=36px, md=40px height
  debounceMs?: number;          // default 300
  className?: string;
}
```

- Left icon: Search (Lucide), `text-muted-foreground`
- Clear button (X) appears when value non-empty
- Focus ring: `ring-2 ring-accent/40`
- Background: `bg-secondary`, border: `border-border`

#### 4.2.8 FilterChips

```tsx
interface FilterChipsProps {
  items: { value: string; label: string; count?: number }[];
  value: string | string[];     // single or multi select
  onChange: (value: string | string[]) => void;
  variant?: "pill" | "underline";
  className?: string;
}
```

- `pill`: rounded-full chips, active has `bg-accent-muted border-accent text-accent`
- `underline`: text buttons, active has `border-b-2 border-accent text-accent`
- Inactive: `text-muted-foreground`, hover `text-foreground`
- Gap: 8px, scrollable overflow on mobile

#### 4.2.9 TabBar

```tsx
interface TabBarProps {
  tabs: { value: string; label: string; count?: number }[];
  activeTab: string;
  onChange: (value: string) => void;
  className?: string;
}
```

- Flex row with `border-b border-border`
- Active tab: `text-accent border-b-2 border-accent font-semibold`
- Inactive: `text-muted-foreground`, hover `text-foreground`
- Count rendered as Badge `size="sm"` next to label
- Transition: 150ms on border and color

#### 4.2.10 Modal

```tsx
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: "sm" | "md" | "lg";    // max-w-sm | max-w-md | max-w-lg
  children: ReactNode;
  footer?: ReactNode;
}
```

- Overlay: `fixed inset-0 bg-black/50 backdrop-blur-sm z-50`
- Box: `bg-surface-elevated border-border rounded-xl shadow-2xl`
- Header: title + close button (X icon, 44px touch target)
- Footer: flex justify-end gap-3
- Accessibility: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap, Escape closes
- Animation: fade + scale (0.95 → 1.0), 200ms ease-out
- Respects `prefers-reduced-motion`

#### 4.2.11 ConfirmDialog

```tsx
interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  variant?: "danger" | "warning";
  confirmLabel?: string;        // default "Confirm"
  loading?: boolean;
}
```

- Extends Modal `size="sm"`
- Confirm button: `variant="destructive"` for danger, `variant="default"` for warning
- Cancel button: `variant="outline"`
- Confirm button shows Spinner when `loading`

#### 4.2.12 Drawer

```tsx
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: "sm" | "md" | "lg";    // 320 | 420 | 560 px width
  children: ReactNode;
}
```

- Slides in from right edge
- Overlay: same as Modal
- Panel: `bg-surface-elevated`, full height, `border-l border-border`
- Header: title + close button
- Animation: translateX(100%) → translateX(0), 250ms ease-out; exit 200ms ease-in
- Accessibility: focus trap, Escape closes

#### 4.2.13 LoadMoreButton

```tsx
interface LoadMoreButtonProps {
  onClick: () => void;
  loading?: boolean;
  hasMore: boolean;
  className?: string;
}
```

- Full width, `border border-dashed border-border rounded-lg`
- Text: "Load more" with ChevronDown icon
- Loading: shows Spinner, disabled
- `!hasMore`: hidden
- Hover: `border-accent/40 text-accent`

#### 4.2.14 Pagination

```tsx
interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  onPageChange: (page: number) => void;
  className?: string;
}
```

- Flex row: Prev button | "Page X of Y" | Next button
- Optional: "· Z total" suffix
- Buttons: `variant="outline" size="sm"`, disabled at bounds
- Icons: ChevronLeft / ChevronRight

#### 4.2.15 PageHeader

```tsx
interface PageHeaderProps {
  title: string;
  count?: number;
  action?: { label: string; icon?: LucideIcon; onClick: () => void };
  className?: string;
}
```

- Flex row, justify-between, items-center
- Title: 18px, font-semibold, `font-[var(--serif)]` (Sora)
- Count: Badge `variant="secondary" size="sm"`
- Action: Button `variant="outline" size="sm"`

#### 4.2.16 Divider

```tsx
interface DividerProps {
  variant?: "line" | "labeled";
  label?: string;               // required if variant="labeled"
  className?: string;
}
```

- `line`: `<hr>` with `border-border-subtle`
- `labeled`: flex row with lines on each side of centered text, text in `text-muted-foreground text-xs`

### 4.3 Layer 2: Form Components

#### 4.3.1 FormField

```tsx
interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;           // the input element
  className?: string;
}
```

- Label: 12px, font-medium, uppercase, `tracking-wider`, `text-muted-foreground`
- Required: red asterisk after label
- Error: 12px, `text-destructive`, appears below input with `role="alert"`
- Hint: 12px, `text-muted-foreground`, appears below input (hidden when error shown)
- Gap: 6px between label → input → error/hint

#### 4.3.2 TextArea

```tsx
interface TextAreaProps {
  variant?: "fixed" | "autogrow";
  maxLength?: number;           // shows char counter when set
  rows?: number;                // default 3
  maxHeight?: number;           // for autogrow, default 180px
  // ...standard textarea props
}
```

- Styled like Input: `bg-secondary border-border rounded-md`
- Focus: `ring-2 ring-accent/40`
- `autogrow`: `resize-none`, height adjusts to scrollHeight, capped at maxHeight
- Char counter: right-aligned below, `text-xs text-muted-foreground`, turns `text-destructive` at 90%+

#### 4.3.3 PasswordInput

```tsx
interface PasswordInputProps extends InputProps {
  // extends existing shadcn Input
}
```

- Wraps Input with toggle button (Eye / EyeOff icon)
- Toggle: absolute positioned right, 40px touch target
- Switches `type` between "password" and "text"

#### 4.3.4 RadioGroup

```tsx
interface RadioGroupProps {
  options: { value: string; label: string; description?: string }[];
  value: string;
  onChange: (value: string) => void;
  name: string;
  className?: string;
}
```

- Vertical stack, gap-2
- Each option: flex row, custom radio circle (16px, border, accent fill when selected)
- Label: 14px, font-medium
- Description: 12px, `text-muted-foreground`

#### 4.3.5 Checkbox

```tsx
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
}
```

- Custom styled: 18px square, `border-border rounded`, accent fill + check icon when checked
- Label: 14px, inline with checkbox
- 40px touch target (padding extends hit area)

#### 4.3.6 Select

```tsx
interface SelectProps {
  options: { value: string; label: string; count?: number }[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  multiple?: boolean;
  className?: string;
}
```

- Trigger: styled like Input with ChevronDown icon
- Dropdown: `bg-surface-elevated border-border rounded-lg shadow-xl`, positioned below trigger
- Search field inside dropdown when `searchable`
- Options: 40px height, hover `bg-card-hover`, selected has check icon
- Keyboard: arrow keys to navigate, Enter to select, Escape to close
- Click outside closes

#### 4.3.7 ToggleSwitch

```tsx
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}
```

- Track: 44px × 24px, rounded-full
- Thumb: 20px circle, slides left/right
- Off: `bg-border` track, white thumb
- On: `bg-accent` track, white thumb
- Transition: 150ms ease
- Disabled: opacity 0.5, cursor not-allowed

### 4.4 Layer 3: Data Display

#### 4.4.1 DataTable

```tsx
interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  skeletonRows?: number;        // default 5
  onSort?: (key: string, direction: "asc" | "desc") => void;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  emptyState?: { icon: LucideIcon; title: string; description?: string };
  className?: string;
}
```

- Table with `border-collapse`, `border-border`
- Header: `bg-secondary text-muted-foreground text-xs uppercase tracking-wider font-semibold`
- Sortable headers: hover changes color, shows chevron icon for direction
- Rows: `border-b border-border-subtle`, hover `bg-card-hover`
- Loading: renders Skeleton rows matching column widths
- Empty: renders EmptyState centered in table body
- Row height: 48px (comfortable density), configurable via `size="compact"` (36px)

#### 4.4.2 ActivityLog

```tsx
interface ActivityItem {
  id: string;
  action: string;
  severity: "info" | "warning" | "critical";
  result: "success" | "failed";
  timestamp: string;
  meta?: Record<string, string>;
}

interface ActivityLogProps {
  items: ActivityItem[];
  loading?: boolean;
  className?: string;
}
```

- Vertical list, each item: flex row with gap-3
- Severity badge: Badge with matching variant (`info`/`warning`/`destructive`)
- Action text: 14px, `text-foreground`, capitalized
- Result: Badge `size="sm"`, success=green, failed=red
- Timestamp: `text-xs text-tertiary`, right-aligned
- Meta row: `text-xs text-muted-foreground`, collapsible

#### 4.4.3 InfiniteScrollList

```tsx
interface InfiniteScrollListProps {
  onLoadMore: () => void;
  hasMore: boolean;
  loading?: boolean;
  threshold?: number;           // pixels from bottom, default 200
  children: ReactNode;
  className?: string;
}
```

- Wraps children in scrollable container
- IntersectionObserver triggers `onLoadMore` when sentinel enters viewport
- Loading: renders Spinner at bottom
- No more: renders nothing (clean end)

### 4.5 Layer 4: Pattern Components (props-first API)

#### 4.5.1 ThreadCard

```tsx
interface ThreadCardProps {
  thread: Thread;
  variant?: "list" | "compact";
  selected?: boolean;
  onSelect?: (id: string) => void;
  className?: string;
}
```

- `list` (default): Full card — avatar, title (font-semibold), author name, tags as Badge, reply count, like button, timestamp
- `compact`: Reduced — title + author + time only, no tags
- Selected: `bg-card-active border-l-2 border-accent`
- Hover: `bg-card-hover`, subtle shadow
- Bottom separator: `border-b border-border-subtle`
- Title: 15px, `font-[var(--serif)]` (Sora)
- Uses: Avatar, Badge from design system

#### 4.5.2 PostCard

```tsx
interface PostCardProps {
  post: Post;
  author: { display_name: string; username: string; avatar_url?: string };
  depth?: number;               // for nested reply indentation
  onLike?: (id: string) => void;
  onReply?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onFlag?: (id: string) => void;
  className?: string;
}
```

- Card with Avatar, author info, timestamp, body (RichText), action bar
- Nested replies: `padding-left: depth * 24px` (max depth 4)
- Action bar: Like (heart), Reply, Edit (own only), Delete (own only), Flag
- Actions: `text-tertiary`, hover `text-accent`
- Hover: `bg-card-hover` background
- Flagged indicator: Badge `variant="destructive" size="sm"`

#### 4.5.3 NotificationItem

```tsx
interface NotificationItemProps {
  notification: Notification;
  onAction?: (id: string, action: string) => void;
  onDismiss?: (id: string) => void;
  className?: string;
}
```

- Flex row: colored icon + content + time + actions
- Unread: `bg-accent-muted` background
- Icon colors by type: follow=blue, like=pink, reply=green, moderation=red, connection=purple
- Inline actions: contextual buttons (Follow back, Accept/Decline, Appeal)
- Action buttons use `success`/`danger` colors appropriately
- Time: `text-xs text-tertiary`

#### 4.5.4 UserCard

```tsx
interface UserCardProps {
  user: User;
  variant?: "grid" | "list";
  onFollow?: (id: string) => void;
  onConnect?: (id: string) => void;
  className?: string;
}
```

Replaces `PeopleCard.tsx`.

- `grid`: Card layout — avatar (lg), name, @username, role badge, bio (2-line clamp), follower count, signals (follows-you, shared interests), action buttons
- `list`: Row layout — avatar (md), name + username inline, bio snippet, actions
- Action buttons: FollowButton + ConnectionButton (existing shared components)
- Card: `bg-card border-border rounded-xl`, hover `bg-card-hover shadow-lg`

#### 4.5.5 MessageBubble

```tsx
interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  deliveryState?: "sending" | "sent" | "failed";
  onRetry?: (id: string) => void;
  className?: string;
}
```

- Own: `bg-accent text-white rounded-2xl rounded-br-sm`, right-aligned
- Other: `bg-card border-border rounded-2xl rounded-bl-sm`, left-aligned
- Failed: `border-destructive bg-card opacity-75`, retry button
- Meta: timestamp, delivery state text (`text-xs`)
- Max width: 75% of container

#### 4.5.6 StatCard

```tsx
interface StatCardProps {
  label: string;
  value: string | number;
  change?: { value: number; direction: "up" | "down" };
  icon?: LucideIcon;
  className?: string;
}
```

- Card: `bg-card border-border rounded-xl p-4`
- Icon: 20px, `text-muted-foreground`, top-right
- Value: 28px, font-bold
- Label: 12px, `text-muted-foreground`, uppercase
- Change: `text-success` for up (with TrendingUp icon), `text-destructive` for down

### 4.6 Extended Existing Components

#### button.tsx — Add variants

```tsx
// New variants added to existing CVA config:
variant: "danger"   // bg-destructive text-destructive-foreground
       | "link"     // text-accent underline, no bg/border
       | "back"     // ghost + ChevronLeft icon prepended
```

All button sizes ensure minimum 40px height for touch targets.

#### input.tsx — Styling update

- Focus ring: `ring-2 ring-accent/40` (currently uses `ring`)
- Background: `bg-secondary` (currently uses `bg-background`)
- Ensure 40px minimum height

#### card.tsx — Add hover/active support

```tsx
// New optional props:
hoverable?: boolean;   // adds hover:bg-card-hover transition
active?: boolean;      // adds bg-card-active + accent left border
```

---

## 5. Workspace Modular Breakup

### 5.1 General Pattern

Every workspace follows the same architecture:

```
components/<feature>/
  <Feature>Workspace.tsx      ← Orchestrator: layout, shared state, modals, toasts
  <Panel>.tsx                 ← Stateless sub-component, receives data + callbacks
  use<Feature>.ts             ← Hook: data fetching, mutations, derived state
  index.ts                    ← Barrel export
```

**Orchestrator responsibilities:** data fetching (via hook), shared state (tab, selection, panel toggle), modal visibility, toast dispatching, layout grid.

**Sub-component responsibilities:** rendering, local UI state (hover, collapse), calling callbacks passed from orchestrator.

**Rule:** If 2+ sections mutate the same data, state lives in orchestrator. If state is panel-local (hover, scroll position), it stays in the panel.

### 5.2 ThreadsWorkspace (2,501 → 4 files)

```
components/threads/
  ThreadsWorkspace.tsx        ← orchestrator (~200 lines)
                                 Manages: tab state, cross-tab mutations (like/delete
                                 patches all 4 buckets), right-panel toggle, drag resize
  ThreadListPanel.tsx         ← TabBar, SearchInput, sort FilterChips, ThreadCard list,
                                 LoadMoreButton
  ThreadDetailPanel.tsx       ← Selected thread preview + inline edit/delete modals
  useThreadsPage.ts           ← 4-tab bucket state, fetch per tab, CRUD handlers,
                                 topic management
```

**Shared state in orchestrator:** `tabState` (4 buckets), `activeThreadId`, `rightPanel`, `contentColumns`
**Why:** Liking/deleting a thread must patch ALL tab buckets simultaneously.

### 5.3 ThreadDetailWorkspace (1,129 → 5 files)

```
components/thread-detail/
  ThreadDetailWorkspace.tsx   ← orchestrator (~120 lines)
                                 Manages: modal state (4 modals), user cache, toasts
  ThreadHeader.tsx            ← back button, title breadcrumb, thread body, actions
  PostTree.tsx                ← recursive nested reply rendering using PostCard
  ReplyComposer.tsx           ← auto-grow TextArea, mention suggestions, reply-to banner
  useThreadDetail.ts          ← thread/post fetch, CRUD, like/flag, user cache batch fetch
```

**Shared state in orchestrator:** `thread`, `posts`, `replyToPost`, all modal open/close states
**Why:** Replying to a post inserts into the post tree AND clears the composer.

### 5.4 MessagesWorkspace (664 → 3 files)

```
components/messages/
  MessagesWorkspace.tsx       ← orchestrator (~100 lines)
                                 Manages: drag resize, optimistic message state
  ConversationListPanel.tsx   ← SearchInput, connection suggestions, conversation items
  ChatPanel.tsx               ← MessageBubble list, day Dividers, inline composer
  useMessages.ts              ← already exists, keep as-is
```

**Shared state in orchestrator:** `convWidth` (drag resize), `optimisticMessages`, `activeConversation`
**Why:** Optimistic messages must sync between conversation list (last message preview) and chat panel.

### 5.5 NotificationsWorkspace (929 → 3 files)

```
components/notifications/
  NotificationsWorkspace.tsx  ← orchestrator (~80 lines)
  NotificationList.tsx        ← NotificationItem list with inline actions
  useNotifications.ts         ← already exists, keep
```

AppealModal stays as separate file (already extracted).

### 5.6 People (minimal change, reskin only)

- `PeopleCard.tsx` → deleted, replaced by `UserCard` from design system
- `PeopleWorkspaceShell.tsx` → reskin: drop styled-jsx, use Tailwind
- `PeopleExploreWorkspace.tsx` → reskin, use UserCard + design system components
- `PeopleSearchWorkspace.tsx` → reskin, use SearchInput + FilterChips + UserCard
- `PeopleRequestsWorkspace.tsx` → reskin, use design system components

### 5.7 AdminWorkspace (already modular, reskin only)

- Drop styled-jsx from orchestrator and all tabs
- Replace `admin/shared/` components with design system equivalents:
  - `AdminStatCard` → `StatCard`
  - `AdminEmptyState` → `EmptyState`
  - `AdminSkeleton` → `Skeleton`
  - `AdminSectionHeader` → `PageHeader`
- `admin/shared/` folder deleted after migration

### 5.8 SettingsWorkspace (1,006 → 5 files)

```
components/settings/
  SettingsWorkspace.tsx       ← orchestrator (~80 lines): auth check, tab state, header
  ProfileTab.tsx              ← FormField (name, bio, gender), slug editor with async validation
  PasswordTab.tsx             ← PasswordInput fields, security question, Divider
  ActivityTab.tsx             ← ActivityLog component, category FilterChips, Pagination
  useSettings.ts              ← profile save, slug validation, password change handlers
```

FeedTopicsSettings already extracted — stays as-is.

### 5.9 UserProfileWorkspace (888 → 4 files)

```
components/user-profile/
  UserProfileWorkspace.tsx    ← orchestrator (~100 lines): data fetch, modal state
  ProfileHeader.tsx           ← cover gradient, Avatar (xl), name, badges, stats row,
                                 follow/connect buttons, mobile menu
  ProfileThreadList.tsx       ← ThreadCard list + EmptyState
  useUserProfile.ts           ← profile fetch, follow/connect state, thread pagination
```

### 5.10 Auth Pages (no structural change)

`login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx` — swap inline form markup for FormField, PasswordInput, Checkbox, Divider. Keep as page components.

---

## 6. Phase 2 Outline: Page-by-Page Application

Each page drops styled-jsx and rebuilds with Tailwind + design system components. This is a brief outline, not a full spec — a detailed Phase 2 spec will be written after Phase 1 is built.

### 6.1 Threads (`/threads`)

**Components:** ThreadCard, SearchInput, FilterChips, TabBar, EmptyState, Skeleton, LoadMoreButton, Modal, ConfirmDialog, Toast, Badge, Avatar, PageHeader
**Layout:** WorkspaceShell 2-panel grid (list + detail/create)
**Key changes:** All colors via tokens. Hover → `bg-card-hover`. Active thread → `bg-card-active` + accent left border.

### 6.2 Thread Detail (`/threads/[id]`)

**Components:** PostCard, Avatar, Badge, TextArea (autogrow), Modal, ConfirmDialog, Toast, EmptyState, Skeleton, RichTextRenderer
**Layout:** WorkspaceShell single column, scrollable
**Key changes:** Thread body `text-foreground`, meta `text-muted-foreground`. Actions `text-tertiary` → `text-accent` on hover.

### 6.3 New Thread (`/threads/new`)

**Components:** FormField, TextArea, Select (tags), Button
**Layout:** Centered form, max-w-2xl
**Key changes:** Form card `bg-card border-border`. Drop styled-jsx orb effects.

### 6.4 Messages (`/messages`)

**Components:** SearchInput, MessageBubble, Avatar, EmptyState, Skeleton, Divider (day), TextArea (autogrow), Spinner
**Layout:** WorkspaceShell 2-panel + drag resize
**Key changes:** Own bubbles `bg-accent`. Other bubbles `bg-card`. Day dividers use Divider `variant="labeled"`.

### 6.5 Notifications (`/notifications`)

**Components:** NotificationItem, FilterChips, TabBar, Pagination, EmptyState, Skeleton, Toast, Badge, Avatar, Modal
**Layout:** WorkspaceShell single column
**Key changes:** Unread → `bg-accent-muted`. Action buttons use `text-success`/`text-destructive`.

### 6.6 People (`/people/*`)

**Components:** UserCard, SearchInput, FilterChips, LoadMoreButton, EmptyState, Skeleton, Badge, Avatar, Toast
**Layout:** PeopleWorkspaceShell hero header + responsive grid
**Key changes:** Hero gradient with accent tint. Cards grid `grid-cols-[repeat(auto-fill,minmax(280px,1fr))]`.

### 6.7 Admin (`/admin`)

**Components:** TabBar, StatCard, DataTable, SearchInput, FilterChips, PageHeader, EmptyState, Skeleton, Drawer, Modal, ConfirmDialog, Toast, Badge, Avatar, Pagination, ActivityLog
**Layout:** WorkspaceShell single column with tab orchestrator
**Key changes:** Delete `admin/shared/` folder. All tab files use design system components.

### 6.8 Settings (`/settings`)

**Components:** TabBar, FormField, PasswordInput, TextArea, ToggleSwitch, Select, ActivityLog, Pagination, Avatar, Badge, Button, Divider, Toast
**Layout:** WorkspaceShell single column, max-w-xl
**Key changes:** Form sections use `bg-card` cards. Slug validator uses inline Badge.

### 6.9 User Profile (`/users/[id]`, `/[username]`)

**Components:** Avatar (xl), Badge, ThreadCard, StatCard, EmptyState, Skeleton, Modal, FormField, Button, PageHeader
**Layout:** WorkspaceShell single column, scrollable
**Key changes:** Cover banner stays custom gradient. Stats use `text-muted-foreground`.

### 6.10 Auth Pages (`/login`, `/register`, `/forgot-password`, `/reset-password`)

**Components:** FormField, PasswordInput, Checkbox, Button, Divider, Spinner
**Layout:** AuthShell centered card
**Key changes:** Swap inline HTML for design system form components.

### 6.11 Public Pages — OUT OF SCOPE

Homepage, Features, Community pages use separate marketing design language. Not part of this redesign.

---

## 7. Flexibility Safeguards

Design decisions that protect against future restructuring:

1. **All pattern components accept `className`** — layout overrides without forking components
2. **WorkspaceShell is optional** — pages can render directly inside `app-content` for non-standard layouts
3. **Tokens are semantic** — changing `--accent` from sky blue to any color updates the entire app
4. **Feature-folders are independent** — adding/removing a feature doesn't affect others
5. **Density variants** — `size="compact"` on DataTable, TabBar, etc. for data-dense views
6. **Pattern components expose variant prop** — `ThreadCard variant="compact"` for future use cases without new components

---

## 8. Out of Scope

- Public/marketing pages (Homepage, Features, Community)
- Backend API changes
- New features or functionality — this is a visual + structural redesign only
- Mobile-native responsive behavior changes (existing media queries preserved)
- Dark/light theme toggle logic (already works via next-themes)

---

## 9. Migration Notes

### 9.1 styled-jsx Removal Order

1. Build design system components (all Tailwind)
2. Migrate workspace files one at a time, starting with smallest (MessagesWorkspace → NotificationsWorkspace → UserProfile → Settings → ThreadDetail → People → Admin → ThreadsWorkspace)
3. For each workspace: create feature-folder, extract sub-components, drop `<style jsx>` blocks, replace with Tailwind classes
4. After all workspaces migrated: remove `styled-jsx` from dependencies if no other consumers

### 9.2 shadcn Compatibility

All new components follow shadcn conventions:
- CVA for variant management
- `cn()` utility for class merging
- `forwardRef` where applicable
- Props extend HTML element props where relevant
- Components are unstyled containers that accept `className`

### 9.3 Token Migration in Components

When migrating a workspace from styled-jsx to Tailwind:
- `var(--app-bg)` → `bg-background`
- `var(--app-panel)` → `bg-card`
- `var(--app-card)` → `bg-card`
- `var(--app-card-hover)` → `bg-card-hover`
- `var(--app-border)` → `border-border`
- `var(--app-input)` → `bg-secondary`
- `color: #e4e8f4` → `text-foreground`
- `color: #9ba3be` → `text-muted-foreground`
- `color: #636f8d` → `text-tertiary`
- `#0EA5E9` → `text-accent` / `bg-accent` / `border-accent`
- `#818CF8` → `text-info` / `bg-info`
- `#3dd68c` → `text-success`
- `#ef4444` → `text-destructive`
- `#fbbf24` → `text-warning`
