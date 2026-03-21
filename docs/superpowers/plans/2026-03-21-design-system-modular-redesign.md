# Design System & Modular Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shared component library (~30 components) in Tailwind + shadcn, then apply it to all in-app pages while breaking monolithic workspaces into feature-folders.

**Architecture:** Phase 1 builds the design system in `components/ui/` — tokens first, then primitives, then patterns. Phase 2 migrates each workspace from styled-jsx to Tailwind + design system components, splitting monoliths into feature-folders. Each task is independently committable.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS v4, shadcn/ui, CVA, Radix UI, Lucide React icons, `cn()` from `@/lib/utils`

**Spec:** `docs/superpowers/specs/2026-03-21-design-system-modular-redesign.md`

---

## Phase 1: Design System

### Task 1: Token System — Extend globals.css

**Files:**
- Modify: `frontend/src/app/globals.css`

This task adds new semantic tokens to `:root` / `.dark`, extends `@theme inline`, and deletes the `.app-shell` scoped token blocks.

- [ ] **Step 1: Add new tokens to `:root`**

After line 49 (after `--sidebar-ring`), add inside the existing `:root { }` block:

```css
  /* ─── Design System Tokens ─── */
  --card-hover: #f8fafc;
  --card-active: #f0f7ff;
  --surface-elevated: #ffffff;
  --border-subtle: rgba(0,0,0,0.06);
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-tertiary: #94a3b8;
  --success: #16a34a;
  --warning: #d97706;
  --info: #6366f1;
  --accent-glow: transparent;
  --accent-muted: rgba(14,165,233,0.08);
  --duration-fast: 150ms;
  --duration-normal: 220ms;
  --duration-slow: 300ms;
```

- [ ] **Step 2: Add new tokens to `.dark`**

Inside the existing `.dark { }` block (after `--sidebar-ring: #818CF8;`), add:

```css
  /* ─── Design System Tokens ─── */
  --card-hover: #181b27;
  --card-active: #141824;
  --surface-elevated: #1a1d2b;
  --border-subtle: rgba(255,255,255,0.06);
  --text-primary: #e8eaf2;
  --text-secondary: #8892a4;
  --text-tertiary: #636f8d;
  --success: #3dd68c;
  --warning: #fbbf24;
  --info: #818CF8;
  --accent-glow: rgba(14,165,233,0.4);
  --accent-muted: rgba(14,165,233,0.10);
  --duration-fast: 150ms;
  --duration-normal: 220ms;
  --duration-slow: 300ms;
```

- [ ] **Step 3: Extend `@theme inline`**

Inside the existing `@theme inline { }` block (after `--color-sidebar-ring`), add:

```css
  /* ─── Design System Colors ─── */
  --color-card-hover: var(--card-hover);
  --color-card-active: var(--card-active);
  --color-surface-elevated: var(--surface-elevated);
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-tertiary: var(--text-tertiary);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-info: var(--info);
  --color-accent-muted: var(--accent-muted);
  --color-border-subtle: var(--border-subtle);
  --color-accent2: var(--accent2);
```

- [ ] **Step 4: Delete `.app-shell` scoped token blocks**

Remove the entire block from `/* ─── In-App Scoped Tokens (Phase 1) ─── */` through the `.app-shell ::-webkit-scrollbar-thumb:hover` rule (lines 1037–1089). This removes:
- `.app-shell { ... }` (light tokens)
- `.dark .app-shell { ... }` (dark tokens)
- `.app-shell ::-webkit-scrollbar` rules

Replace with a simpler global scrollbar rule:

```css
/* ─── Custom scrollbar (in-app) ─── */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-tertiary); }
```

- [ ] **Step 5: Update AppShell references**

In `frontend/src/components/app/AppShell.tsx`, remove the `app-shell` CSS class name from the wrapper div if it's only used for token scoping. The tokens are now global. Keep the class only if it's used for layout (grid).

- [ ] **Step 6: Verify the app still renders**

Run: `cd frontend && npm run dev`
Open `http://localhost:3000/threads` in browser. Verify colors haven't visually changed (the new global tokens should produce the same result as the scoped ones).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/globals.css frontend/src/components/app/AppShell.tsx
git commit -m "feat: extend token system — merge app-shell scope into :root/.dark, add design system tokens"
```

---

### Task 2: Primitives — Avatar, Badge extension, Skeleton, Spinner, Divider

**Files:**
- Create: `frontend/src/components/ui/avatar.tsx`
- Create: `frontend/src/components/ui/skeleton.tsx`
- Create: `frontend/src/components/ui/spinner.tsx`
- Create: `frontend/src/components/ui/divider.tsx`
- Modify: `frontend/src/components/ui/badge.tsx` (add `success`, `warning`, `info`, `danger` variants + `size` prop)

- [ ] **Step 1: Create Avatar component**

```tsx
// frontend/src/components/ui/avatar.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const avatarVariants = cva(
  "relative inline-flex items-center justify-center rounded-full bg-muted font-medium text-muted-foreground select-none shrink-0 overflow-hidden",
  {
    variants: {
      size: {
        xs: "size-5 text-[9px]",
        sm: "size-7 text-xs",
        md: "size-9 text-sm",
        lg: "size-12 text-base",
        xl: "size-20 text-2xl",
      },
    },
    defaultVariants: { size: "md" },
  }
)

const statusDot = cva(
  "absolute bottom-0 right-0 rounded-full border-2 border-background",
  {
    variants: {
      status: {
        online: "bg-success",
        away: "bg-warning",
        offline: "bg-text-tertiary",
      },
      size: {
        xs: "size-1.5",
        sm: "size-2",
        md: "size-2.5",
        lg: "size-3",
        xl: "size-4",
      },
    },
    defaultVariants: { size: "md" },
  }
)

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? ""
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface AvatarProps extends VariantProps<typeof avatarVariants> {
  src?: string | null
  name: string
  status?: "online" | "away" | "offline"
  className?: string
}

function Avatar({ src, name, size, status, className }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false)

  return (
    <span
      role="img"
      aria-label={name}
      className={cn(avatarVariants({ size }), className)}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={name}
          className="size-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
      {status && (
        <span className={cn(statusDot({ status, size }))} aria-label={`${status}`} />
      )}
    </span>
  )
}

export { Avatar, avatarVariants, getInitials }
```

- [ ] **Step 2: Create Skeleton component**

```tsx
// frontend/src/components/ui/skeleton.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circle" | "rect"
}

function Skeleton({ variant = "rect", className, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse bg-muted",
        variant === "circle" && "rounded-full",
        variant === "text" && "rounded-md",
        variant === "rect" && "rounded-lg",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
```

- [ ] **Step 3: Create Spinner component**

```tsx
// frontend/src/components/ui/spinner.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const spinnerVariants = cva("animate-spin", {
  variants: {
    size: {
      sm: "size-4",
      md: "size-5",
      lg: "size-7",
    },
  },
  defaultVariants: { size: "md" },
})

function Spinner({ size, className }: VariantProps<typeof spinnerVariants> & { className?: string }) {
  return (
    <svg
      className={cn(spinnerVariants({ size }), className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export { Spinner, spinnerVariants }
```

- [ ] **Step 4: Create Divider component**

```tsx
// frontend/src/components/ui/divider.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

interface DividerProps {
  label?: string
  className?: string
}

function Divider({ label, className }: DividerProps) {
  if (label) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <span className="h-px flex-1 bg-border-subtle" />
        <span className="text-xs font-medium text-text-tertiary select-none">{label}</span>
        <span className="h-px flex-1 bg-border-subtle" />
      </div>
    )
  }
  return <hr className={cn("border-t border-border-subtle", className)} />
}

export { Divider }
```

- [ ] **Step 5: Extend Badge with new variants and size**

Replace `frontend/src/components/ui/badge.tsx` — keep existing API, add `success`, `warning`, `danger`, `info` variants + `size` prop:

```tsx
// frontend/src/components/ui/badge.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none gap-1 transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive: "bg-destructive text-white [a&]:hover:bg-destructive/90",
        outline: "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
        success: "bg-success/15 text-success border-success/20",
        warning: "bg-warning/15 text-warning border-warning/20",
        danger: "bg-destructive/15 text-destructive border-destructive/20",
        info: "bg-info/15 text-info border-info/20",
      },
      size: {
        sm: "px-1.5 py-px text-[10px] [&>svg]:size-2.5",
        md: "px-2 py-0.5 text-xs [&>svg]:size-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "md",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ui/avatar.tsx frontend/src/components/ui/skeleton.tsx frontend/src/components/ui/spinner.tsx frontend/src/components/ui/divider.tsx frontend/src/components/ui/badge.tsx
git commit -m "feat: add Avatar, Skeleton, Spinner, Divider primitives + extend Badge"
```

---

### Task 3: Primitives — EmptyState, SearchInput, FilterChips, LoadMoreButton, PageHeader

**Files:**
- Create: `frontend/src/components/ui/empty-state.tsx`
- Create: `frontend/src/components/ui/search-input.tsx`
- Create: `frontend/src/components/ui/filter-chips.tsx`
- Create: `frontend/src/components/ui/load-more-button.tsx`
- Create: `frontend/src/components/ui/page-header.tsx`

- [ ] **Step 1: Create EmptyState**

```tsx
// frontend/src/components/ui/empty-state.tsx
import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16 px-6 text-center", className)}>
      {icon && (
        <div className="flex size-12 items-center justify-center rounded-xl bg-accent-muted text-primary [&_svg]:size-6">
          {icon}
        </div>
      )}
      <h3 className="font-serif text-base font-semibold text-text-primary">{title}</h3>
      {description && <p className="max-w-xs text-sm text-text-secondary">{description}</p>}
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      )}
    </div>
  )
}

export { EmptyState }
```

- [ ] **Step 2: Create SearchInput**

```tsx
// frontend/src/components/ui/search-input.tsx
"use client"

import * as React from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onSearch?: (value: string) => void
  placeholder?: string
  size?: "sm" | "md"
  debounceMs?: number
  className?: string
}

function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = "Search...",
  size = "md",
  debounceMs = 0,
  className,
}: SearchInputProps) {
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    onChange(v)
    if (onSearch && debounceMs > 0) {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => onSearch(v), debounceMs)
    } else if (onSearch) {
      onSearch(v)
    }
  }

  React.useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  return (
    <div className={cn(
      "flex items-center gap-2 rounded-lg border border-border bg-input/30 transition-colors duration-[var(--duration-fast)]",
      "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
      size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm",
      className
    )}>
      <Search className={cn("shrink-0 text-text-tertiary", size === "sm" ? "size-3.5" : "size-4")} />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none placeholder:text-text-tertiary"
      />
      {value && (
        <button
          type="button"
          onClick={() => { onChange(""); onSearch?.("") }}
          className="shrink-0 rounded-sm p-0.5 text-text-tertiary hover:text-text-primary transition-colors"
          aria-label="Clear search"
        >
          <X className={size === "sm" ? "size-3" : "size-3.5"} />
        </button>
      )}
    </div>
  )
}

export { SearchInput }
```

- [ ] **Step 3: Create FilterChips**

```tsx
// frontend/src/components/ui/filter-chips.tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface FilterChip {
  value: string
  label: string
  count?: number
}

interface FilterChipsProps {
  items: FilterChip[]
  value: string | string[]
  onChange: (value: string | string[]) => void
  multiple?: boolean
  variant?: "pill" | "underline"
  className?: string
}

function FilterChips({
  items,
  value,
  onChange,
  multiple = false,
  variant = "pill",
  className,
}: FilterChipsProps) {
  const selected = Array.isArray(value) ? value : [value]

  const toggle = (v: string) => {
    if (multiple) {
      const next = selected.includes(v)
        ? selected.filter(s => s !== v)
        : [...selected, v]
      onChange(next)
    } else {
      onChange(v)
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 overflow-x-auto scrollbar-none",
        variant === "underline" && "border-b border-border-subtle gap-0",
        className
      )}
      role="group"
    >
      {items.map(item => {
        const isActive = selected.includes(item.value)
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => toggle(item.value)}
            className={cn(
              "shrink-0 font-medium transition-colors duration-[var(--duration-fast)]",
              variant === "pill" && [
                "rounded-full px-3 py-1.5 text-xs",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-text-secondary hover:text-text-primary hover:bg-secondary/80",
              ],
              variant === "underline" && [
                "px-3 pb-2 pt-1 text-sm border-b-2 -mb-px",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary",
              ]
            )}
            aria-pressed={isActive}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={cn(
                "ml-1.5 text-[10px]",
                isActive ? "opacity-70" : "text-text-tertiary"
              )}>
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export { FilterChips, type FilterChip }
```

- [ ] **Step 4: Create LoadMoreButton**

```tsx
// frontend/src/components/ui/load-more-button.tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Spinner } from "./spinner"

interface LoadMoreButtonProps {
  loading?: boolean
  hasMore?: boolean
  onClick: () => void
  className?: string
}

function LoadMoreButton({ loading, hasMore, onClick, className }: LoadMoreButtonProps) {
  if (!hasMore) return null

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "w-full rounded-lg border border-dashed border-border py-2.5 text-sm font-medium text-text-secondary",
        "hover:border-primary hover:text-primary transition-colors duration-[var(--duration-fast)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
        className
      )}
    >
      {loading ? <Spinner size="sm" className="mx-auto" /> : "Load more"}
    </button>
  )
}

export { LoadMoreButton }
```

- [ ] **Step 5: Create PageHeader**

```tsx
// frontend/src/components/ui/page-header.tsx
import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "./badge"
import { Button } from "./button"

interface PageHeaderProps {
  title: string
  count?: number
  action?: { label: string; onClick: () => void; icon?: React.ReactNode }
  className?: string
  children?: React.ReactNode
}

function PageHeader({ title, count, action, className, children }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center gap-3 px-1", className)}>
      <h2 className="font-serif text-lg font-bold text-text-primary">{title}</h2>
      {count !== undefined && (
        <Badge variant="secondary" size="sm">{count}</Badge>
      )}
      <div className="flex-1" />
      {children}
      {action && (
        <Button size="sm" onClick={action.onClick}>
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  )
}

export { PageHeader }
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ui/empty-state.tsx frontend/src/components/ui/search-input.tsx frontend/src/components/ui/filter-chips.tsx frontend/src/components/ui/load-more-button.tsx frontend/src/components/ui/page-header.tsx
git commit -m "feat: add EmptyState, SearchInput, FilterChips, LoadMoreButton, PageHeader"
```

---

### Task 4: Primitives — TabBar, Toast system

**Files:**
- Create: `frontend/src/components/ui/tab-bar.tsx`
- Create: `frontend/src/components/ui/toast.tsx`

- [ ] **Step 1: Create TabBar**

```tsx
// frontend/src/components/ui/tab-bar.tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "./badge"

interface Tab {
  value: string
  label: string
  count?: number
}

interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onChange: (value: string) => void
  className?: string
}

function TabBar({ tabs, activeTab, onChange, className }: TabBarProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center border-b border-border-subtle overflow-x-auto scrollbar-none",
        className
      )}
    >
      {tabs.map(tab => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={tab.value === activeTab}
          onClick={() => onChange(tab.value)}
          className={cn(
            "relative shrink-0 px-4 pb-2.5 pt-1.5 text-sm font-medium transition-colors duration-[var(--duration-fast)] -mb-px border-b-2 outline-none",
            "focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:rounded-t",
            tab.value === activeTab
              ? "border-primary text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary"
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <Badge variant="secondary" size="sm" className="ml-2">{tab.count}</Badge>
          )}
        </button>
      ))}
    </div>
  )
}

export { TabBar, type Tab }
```

- [ ] **Step 2: Create Toast system**

```tsx
// frontend/src/components/ui/toast.tsx
"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastType = "success" | "error" | "info"

interface ToastItem {
  id: string
  type: ToastType
  message: string
  duration: number
}

interface ToastContextValue {
  toast: {
    success: (message: string, opts?: { duration?: number }) => void
    error: (message: string, opts?: { duration?: number }) => void
    info: (message: string, opts?: { duration?: number }) => void
  }
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="size-4 text-success" />,
  error: <AlertCircle className="size-4 text-destructive" />,
  info: <Info className="size-4 text-info" />,
}

const MAX_TOASTS = 3

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  const add = React.useCallback((type: ToastType, message: string, duration = 3500) => {
    const id = crypto.randomUUID()
    setToasts(prev => {
      const next = [...prev, { id, type, message, duration }]
      return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next
    })
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const toast = React.useMemo(() => ({
    success: (msg: string, opts?: { duration?: number }) => add("success", msg, opts?.duration),
    error: (msg: string, opts?: { duration?: number }) => add("error", msg, opts?.duration),
    info: (msg: string, opts?: { duration?: number }) => add("info", msg, opts?.duration),
  }), [add])

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted && createPortal(
        <div
          className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
          aria-live="polite"
          role="status"
        >
          {toasts.map(t => (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex items-center gap-2.5 rounded-lg border border-border-subtle bg-surface-elevated px-4 py-3 text-sm text-text-primary shadow-lg",
                "animate-in slide-in-from-right-5 fade-in duration-200"
              )}
            >
              {ICONS[t.type]}
              <span className="flex-1">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-sm p-0.5 text-text-tertiary hover:text-text-primary transition-colors"
                aria-label="Dismiss"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}
```

- [ ] **Step 3: Wire ToastProvider into app layout**

In `frontend/src/app/(app)/layout.tsx`, wrap children with `<ToastProvider>`:

```tsx
import { ToastProvider } from "@/components/ui/toast"

// In the return:
<ToastProvider>
  {/* existing layout */}
</ToastProvider>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/tab-bar.tsx frontend/src/components/ui/toast.tsx frontend/src/app/\(app\)/layout.tsx
git commit -m "feat: add TabBar and Toast system with ToastProvider"
```

---

### Task 5: Primitives — Modal, ConfirmDialog, Drawer

**Files:**
- Create: `frontend/src/components/ui/modal.tsx`
- Create: `frontend/src/components/ui/confirm-dialog.tsx`
- Create: `frontend/src/components/ui/drawer.tsx`

- [ ] **Step 1: Create Modal**

```tsx
// frontend/src/components/ui/modal.tsx
"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  size?: "sm" | "md" | "lg"
  children: React.ReactNode
  className?: string
}

const SIZE_MAP = { sm: "max-w-[400px]", md: "max-w-[540px]", lg: "max-w-[720px]" }

function Modal({ open, onClose, title, size = "md", children, className }: ModalProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null)
  const previousFocus = React.useRef<HTMLElement | null>(null)
  const titleId = React.useId()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  React.useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement
      requestAnimationFrame(() => {
        const first = dialogRef.current?.querySelector<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
        )
        first?.focus()
      })
    } else {
      previousFocus.current?.focus()
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          "relative z-10 w-full rounded-xl border border-border-subtle bg-surface-elevated shadow-2xl",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200",
          SIZE_MAP[size],
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
            <h2 id={titleId} className="font-serif text-base font-semibold text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-text-tertiary hover:text-text-primary hover:bg-secondary transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}

function ModalBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>
}

function ModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-end gap-2 border-t border-border-subtle px-5 py-3", className)}>
      {children}
    </div>
  )
}

Modal.Body = ModalBody
Modal.Footer = ModalFooter

export { Modal }
```

- [ ] **Step 2: Create ConfirmDialog**

```tsx
// frontend/src/components/ui/confirm-dialog.tsx
"use client"

import * as React from "react"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Modal } from "./modal"
import { Button } from "./button"

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  variant?: "danger" | "warning"
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
}

function ConfirmDialog({
  open, onClose, onConfirm, variant = "danger",
  title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", loading,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <Modal.Body className="flex flex-col items-center gap-3 text-center pt-6">
        <div className={cn(
          "flex size-11 items-center justify-center rounded-full",
          variant === "danger" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
        )}>
          <AlertTriangle className="size-5" />
        </div>
        <h3 className="font-serif text-base font-semibold text-text-primary">{title}</h3>
        {description && <p className="text-sm text-text-secondary max-w-xs">{description}</p>}
      </Modal.Body>
      <Modal.Footer className="justify-center gap-3">
        <Button variant="ghost" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
        <Button
          variant={variant === "danger" ? "destructive" : "default"}
          onClick={onConfirm}
          disabled={loading}
        >
          {confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export { ConfirmDialog }
```

- [ ] **Step 3: Create Drawer**

```tsx
// frontend/src/components/ui/drawer.tsx
"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  size?: "sm" | "md" | "lg"
  children: React.ReactNode
  className?: string
}

const DRAWER_SIZE = { sm: "max-w-[360px]", md: "max-w-[480px]", lg: "max-w-[640px]" }

function Drawer({ open, onClose, title, size = "md", children, className }: DrawerProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  React.useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 flex h-full w-full flex-col border-l border-border-subtle bg-surface-elevated shadow-2xl",
          "motion-safe:animate-in motion-safe:slide-in-from-right motion-safe:duration-[var(--duration-normal)]",
          DRAWER_SIZE[size],
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
            <h2 className="font-serif text-base font-semibold text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-text-tertiary hover:text-text-primary hover:bg-secondary transition-colors"
              aria-label="Close drawer"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

export { Drawer }
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/modal.tsx frontend/src/components/ui/confirm-dialog.tsx frontend/src/components/ui/drawer.tsx
git commit -m "feat: add Modal, ConfirmDialog, Drawer overlay components"
```

---

### Task 6: Primitives — DataTable, InfiniteScrollList, RichTextRenderer

**Files:**
- Create: `frontend/src/components/ui/data-table.tsx`
- Create: `frontend/src/components/ui/infinite-scroll-list.tsx`
- Create: `frontend/src/components/ui/rich-text-renderer.tsx`

- [ ] **Step 1: Create DataTable**

```tsx
// frontend/src/components/ui/data-table.tsx
"use client"

import * as React from "react"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"

interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onSort?: (key: string, direction: "asc" | "desc") => void
  sortKey?: string
  sortDirection?: "asc" | "desc"
  loading?: boolean
  emptyState?: React.ReactNode
  className?: string
  rowKey?: (row: T) => string
}

function DataTable<T extends Record<string, unknown>>({
  columns, data, onSort, sortKey, sortDirection, loading, emptyState, className, rowKey,
}: DataTableProps<T>) {
  const handleSort = (key: string) => {
    if (!onSort) return
    const dir = sortKey === key && sortDirection === "asc" ? "desc" : "asc"
    onSort(key, dir)
  }

  return (
    <div className={cn("overflow-auto rounded-lg border border-border-subtle", className)}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-secondary/50 backdrop-blur-sm">
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  "px-4 py-3 text-left font-medium text-text-secondary",
                  col.sortable && "cursor-pointer select-none hover:text-text-primary",
                  col.className
                )}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1.5">
                  {col.label}
                  {col.sortable && (
                    sortKey === col.key
                      ? sortDirection === "asc"
                        ? <ArrowUp className="size-3.5" />
                        : <ArrowDown className="size-3.5" />
                      : <ArrowUpDown className="size-3.5 opacity-40" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3">
                    <Skeleton variant="text" className="h-4 w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-0">
                {emptyState}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={rowKey ? rowKey(row) : i}
                className="h-11 hover:bg-card-hover transition-colors duration-[var(--duration-fast)]"
              >
                {columns.map(col => (
                  <td key={col.key} className={cn("px-4 py-2.5 text-text-primary", col.className)}>
                    {col.render ? col.render(row) : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export { DataTable, type Column }
```

- [ ] **Step 2: Create InfiniteScrollList**

```tsx
// frontend/src/components/ui/infinite-scroll-list.tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"

interface InfiniteScrollListProps {
  onLoadMore: () => void
  hasMore: boolean
  loading?: boolean
  children: React.ReactNode
  className?: string
  skeletonCount?: number
}

function InfiniteScrollList({
  onLoadMore, hasMore, loading, children, className, skeletonCount = 3,
}: InfiniteScrollListProps) {
  const sentinelRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !loading) onLoadMore() },
      { rootMargin: "200px" }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, onLoadMore])

  return (
    <div className={cn("flex flex-col", className)}>
      {children}
      {loading && (
        <div className="flex flex-col gap-3 py-3">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <Skeleton key={i} variant="rect" className="h-16 w-full" />
          ))}
        </div>
      )}
      {hasMore && <div ref={sentinelRef} className="h-1" aria-hidden="true" />}
    </div>
  )
}

export { InfiniteScrollList }
```

- [ ] **Step 3: Create RichTextRenderer**

Read the existing `frontend/src/components/shared/RichText.tsx` first to understand its API. Then create a wrapper:

```tsx
// frontend/src/components/ui/rich-text-renderer.tsx
import * as React from "react"
import { cn } from "@/lib/utils"
import RichText from "@/components/shared/RichText"

interface RichTextRendererProps {
  content: string
  className?: string
}

function RichTextRenderer({ content, className }: RichTextRendererProps) {
  return (
    <div className={cn(
      "prose prose-sm dark:prose-invert max-w-none",
      "prose-headings:font-serif prose-headings:text-text-primary",
      "prose-p:text-text-primary prose-p:leading-relaxed",
      "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
      "prose-code:text-info prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded",
      className
    )}>
      <RichText content={content} />
    </div>
  )
}

export { RichTextRenderer }
```

Note: If `RichText` does not accept a `content` prop, adjust to match its actual API (read the file first).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/data-table.tsx frontend/src/components/ui/infinite-scroll-list.tsx frontend/src/components/ui/rich-text-renderer.tsx
git commit -m "feat: add DataTable, InfiniteScrollList, RichTextRenderer"
```

---

### Task 7: Form Components — FormField, PasswordInput, TextArea, ToggleSwitch

**Files:**
- Create: `frontend/src/components/ui/form-field.tsx`
- Create: `frontend/src/components/ui/password-input.tsx`
- Create: `frontend/src/components/ui/text-area.tsx`
- Create: `frontend/src/components/ui/toggle-switch.tsx`

- [ ] **Step 1: Create FormField**

```tsx
// frontend/src/components/ui/form-field.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

function FormField({ label, error, hint, required, children, className }: FormFieldProps) {
  const id = React.useId()

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-text-primary">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      <div>{React.isValidElement(children) ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id }) : children}</div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!error && hint && <p className="text-xs text-text-tertiary">{hint}</p>}
    </div>
  )
}

export { FormField }
```

- [ ] **Step 2: Create PasswordInput**

```tsx
// frontend/src/components/ui/password-input.tsx
"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "./input"

const PasswordInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false)

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pr-10", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-1 text-text-tertiary hover:text-text-primary transition-colors"
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
```

- [ ] **Step 3: Create TextArea**

```tsx
// frontend/src/components/ui/text-area.tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  value: string
  onChange: (value: string) => void
  autoGrow?: boolean
  minRows?: number
  maxRows?: number
}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ value, onChange, autoGrow = false, minRows = 3, maxRows = 12, className, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement>(null)
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) ?? internalRef

    React.useEffect(() => {
      if (!autoGrow || !textareaRef.current) return
      const el = textareaRef.current
      el.style.height = "auto"
      const lineHeight = parseInt(getComputedStyle(el).lineHeight) || 22
      const minH = lineHeight * minRows
      const maxH = lineHeight * maxRows
      el.style.height = `${Math.min(Math.max(el.scrollHeight, minH), maxH)}px`
    }, [value, autoGrow, minRows, maxRows, textareaRef])

    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={minRows}
        className={cn(
          "flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-text-primary shadow-xs transition-colors",
          "placeholder:text-text-tertiary",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          autoGrow && "resize-none overflow-y-auto",
          className
        )}
        {...props}
      />
    )
  }
)
TextArea.displayName = "TextArea"

export { TextArea }
```

- [ ] **Step 4: Create ToggleSwitch**

```tsx
// frontend/src/components/ui/toggle-switch.tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  className?: string
}

function ToggleSwitch({ checked, onChange, label, disabled, className }: ToggleSwitchProps) {
  const id = React.useId()

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-[var(--duration-fast)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-primary" : "bg-input"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform duration-[var(--duration-fast)]",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text-primary cursor-pointer select-none">
          {label}
        </label>
      )}
    </div>
  )
}

export { ToggleSwitch }
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/form-field.tsx frontend/src/components/ui/password-input.tsx frontend/src/components/ui/text-area.tsx frontend/src/components/ui/toggle-switch.tsx
git commit -m "feat: add FormField, PasswordInput, TextArea, ToggleSwitch form components"
```

---

### Task 8: Pattern Components — ThreadCard, PostCard, StatCard

**Files:**
- Create: `frontend/src/components/ui/thread-card.tsx`
- Create: `frontend/src/components/ui/post-card.tsx`
- Create: `frontend/src/components/ui/stat-card.tsx`

These are props-first components. Before building, read the existing ThreadsWorkspace.tsx and ThreadDetailWorkspace.tsx to extract the exact data shapes and rendering logic.

- [ ] **Step 1: Read existing thread card markup**

Read `frontend/src/components/threads/ThreadsWorkspace.tsx` — find the thread card rendering section (the `.tc-*` CSS classes). Extract the data shape and layout.

- [ ] **Step 2: Create ThreadCard**

Build `frontend/src/components/ui/thread-card.tsx`:
- Accept a `thread` prop matching the existing thread data shape from the API
- `variant="list"` (default, full-width row) and `variant="compact"` (reduced padding)
- `selected`, `onSelect` props
- Uses Avatar, Badge from the design system
- Active state: `bg-card-active border-l-2 border-primary`
- Hover state: `bg-card-hover`
- Export `ThreadCard` as default and also `ThreadCardTitle`, `ThreadCardMeta`, `ThreadCardTags` as named sub-parts

- [ ] **Step 3: Create PostCard**

Build `frontend/src/components/ui/post-card.tsx`:
- Read `ThreadDetailWorkspace.tsx` to understand the post rendering
- Accept `post`, `onLike`, `onReply`, `onEdit`, `onDelete`, `onFlag`, `isAuthor`
- Uses Avatar, Badge, RichTextRenderer
- Action buttons: visible at 45% opacity, 100% on hover
- `<article>` wrapper with `aria-label`

- [ ] **Step 4: Create StatCard**

Build `frontend/src/components/ui/stat-card.tsx`:
- Accept `label`, `value`, `change`, `icon`
- Icon in `bg-accent-muted` rounded container
- Value styled with Sora font, large
- Change arrow: green for up, red for down

```tsx
// frontend/src/components/ui/stat-card.tsx
import * as React from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  change?: { value: number; direction: "up" | "down" }
  icon?: React.ReactNode
  className?: string
}

function StatCard({ label, value, change, icon, className }: StatCardProps) {
  return (
    <div className={cn(
      "flex items-start gap-4 rounded-xl border border-border-subtle bg-card p-4 transition-colors hover:bg-card-hover",
      className
    )}>
      {icon && (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-muted text-primary [&_svg]:size-5">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-text-secondary">{label}</span>
        <span className="font-serif text-2xl font-bold text-text-primary">{value}</span>
        {change && (
          <span className={cn(
            "inline-flex items-center gap-1 text-xs font-medium",
            change.direction === "up" ? "text-success" : "text-destructive"
          )}>
            {change.direction === "up" ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {change.value}%
          </span>
        )}
      </div>
    </div>
  )
}

export { StatCard }
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/thread-card.tsx frontend/src/components/ui/post-card.tsx frontend/src/components/ui/stat-card.tsx
git commit -m "feat: add ThreadCard, PostCard, StatCard pattern components"
```

---

### Task 9: Pattern Components — NotificationItem, UserCard, ConversationItem

**Files:**
- Create: `frontend/src/components/ui/notification-item.tsx`
- Create: `frontend/src/components/ui/user-card.tsx`
- Create: `frontend/src/components/ui/conversation-item.tsx`

- [ ] **Step 1: Read existing markup**

Read `NotificationsWorkspace.tsx`, `PeopleCard.tsx` or `PeopleExploreWorkspace.tsx`, and `MessagesWorkspace.tsx` to understand existing data shapes and rendering.

- [ ] **Step 2: Create NotificationItem**

Build `frontend/src/components/ui/notification-item.tsx`:
- Accept `notification`, `onAction`, `onDismiss`
- Unread: `bg-accent-muted` with `border-l-2 border-primary`
- Icon by type: reply → info, like → warning, flag → danger, system → tertiary
- Contextual action button
- Uses Avatar, Badge
- `<article>` wrapper

- [ ] **Step 3: Create UserCard**

Build `frontend/src/components/ui/user-card.tsx`:
- Accept `user`, `onFollow`, `onConnect`, `variant="grid"|"list"`
- Grid: centered Avatar (xl), name, username, bio (2-line clamp), follow/connect buttons
- List: Avatar (md) + info + action buttons right-aligned
- Uses Avatar, Badge, Button

- [ ] **Step 4: Create ConversationItem**

Build `frontend/src/components/ui/conversation-item.tsx`:
- Accept `conversation`, `selected`, `onSelect`
- Avatar (md) + display name + last message (1-line truncate) + timestamp
- Unread badge (right)
- Active: `bg-card-active`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/notification-item.tsx frontend/src/components/ui/user-card.tsx frontend/src/components/ui/conversation-item.tsx
git commit -m "feat: add NotificationItem, UserCard, ConversationItem pattern components"
```

---

### Task 10: Barrel Export + Design System Smoke Test

**Files:**
- Create: `frontend/src/components/ui/index.ts`

- [ ] **Step 1: Create barrel export**

```tsx
// frontend/src/components/ui/index.ts
export { Avatar, avatarVariants, getInitials } from "./avatar"
export { Badge, badgeVariants } from "./badge"
export { Button, buttonVariants } from "./button"
export { Skeleton } from "./skeleton"
export { Spinner, spinnerVariants } from "./spinner"
export { Divider } from "./divider"
export { EmptyState } from "./empty-state"
export { SearchInput } from "./search-input"
export { FilterChips, type FilterChip } from "./filter-chips"
export { LoadMoreButton } from "./load-more-button"
export { PageHeader } from "./page-header"
export { TabBar, type Tab } from "./tab-bar"
export { ToastProvider, useToast } from "./toast"
export { Modal } from "./modal"
export { ConfirmDialog } from "./confirm-dialog"
export { Drawer } from "./drawer"
export { DataTable, type Column } from "./data-table"
export { InfiniteScrollList } from "./infinite-scroll-list"
export { RichTextRenderer } from "./rich-text-renderer"
export { FormField } from "./form-field"
export { PasswordInput } from "./password-input"
export { TextArea } from "./text-area"
export { ToggleSwitch } from "./toggle-switch"
export { ThreadCard } from "./thread-card"
export { PostCard } from "./post-card"
export { StatCard } from "./stat-card"
export { NotificationItem } from "./notification-item"
export { UserCard } from "./user-card"
export { ConversationItem } from "./conversation-item"
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx next build`
Expected: Build succeeds with no type errors related to the new components.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/index.ts
git commit -m "feat: add barrel export for design system components"
```

---

## Phase 2: Page Application (Outline)

> Phase 2 tasks migrate each workspace from styled-jsx to Tailwind + design system components. Each task follows the same pattern: read existing file → extract sub-components into feature-folder → rewrite orchestrator with Tailwind → delete old styled-jsx → commit.

### Task 11: Migrate AppShell + AppNavbar + AppSidebar to Tailwind

**Files:**
- Modify: `frontend/src/components/app/AppShell.tsx`
- Modify: `frontend/src/components/app/AppNavbar.tsx`
- Modify: `frontend/src/components/app/AppSidebar.tsx`
- Modify: `frontend/src/components/app/WorkspaceShell.tsx`

- [ ] **Step 1: Read all 4 files, understand layout logic**
- [ ] **Step 2: Rewrite AppShell — replace `<style jsx>` with Tailwind classes**
- [ ] **Step 3: Rewrite AppNavbar — replace `<style jsx>` with Tailwind classes, use SearchInput, Avatar, Badge from design system**
- [ ] **Step 4: Rewrite AppSidebar — replace `<style jsx>` with Tailwind classes, use Avatar, Badge from design system**
- [ ] **Step 5: Rewrite WorkspaceShell — replace `<style jsx>` with Tailwind classes**
- [ ] **Step 6: Verify `/threads` layout still works**
- [ ] **Step 7: Commit**

```bash
git commit -m "refactor: migrate AppShell, AppNavbar, AppSidebar, WorkspaceShell to Tailwind"
```

---

### Task 12: Migrate ThreadsWorkspace — Feature-folder Breakup

**Files:**
- Modify: `frontend/src/components/threads/ThreadsWorkspace.tsx` (reduce to orchestrator)
- Create: `frontend/src/components/threads/ThreadListPanel.tsx`
- Create: `frontend/src/components/threads/ThreadPreviewPanel.tsx`
- Create: `frontend/src/components/threads/ThreadComposeModal.tsx`
- Create: `frontend/src/components/threads/useThreadsPage.ts`
- Create: `frontend/src/components/threads/index.ts`

- [ ] **Step 1: Read ThreadsWorkspace.tsx fully, map all sections**
- [ ] **Step 2: Extract useThreadsPage hook — all fetching, filtering, selection, pagination state**
- [ ] **Step 3: Extract ThreadListPanel — search, filters, thread list using ThreadCard + InfiniteScrollList**
- [ ] **Step 4: Extract ThreadPreviewPanel — selected thread detail**
- [ ] **Step 5: Extract ThreadComposeModal — new/edit thread form using Modal, FormField, TextArea**
- [ ] **Step 6: Rewrite ThreadsWorkspace as orchestrator (~80 lines) — WorkspaceShell grid, imports panels**
- [ ] **Step 7: Remove all `<style jsx>` — everything is Tailwind now**
- [ ] **Step 8: Verify `/threads` page works: list loads, selection works, compose works**
- [ ] **Step 9: Commit**

```bash
git commit -m "refactor: break ThreadsWorkspace into feature-folder with Tailwind migration"
```

---

### Task 13: Migrate ThreadDetailWorkspace — Feature-folder Breakup

**Files:**
- Modify: `frontend/src/components/threads/ThreadDetailWorkspace.tsx` → move to `frontend/src/components/thread-detail/`
- Create: `frontend/src/components/thread-detail/ThreadDetailWorkspace.tsx`
- Create: `frontend/src/components/thread-detail/PostList.tsx`
- Create: `frontend/src/components/thread-detail/ReplyComposer.tsx`
- Create: `frontend/src/components/thread-detail/useThreadDetail.ts`
- Create: `frontend/src/components/thread-detail/index.ts`
- Modify: `frontend/src/app/(app)/threads/[id]/page.tsx` (update import path)

- [ ] **Step 1: Read ThreadDetailWorkspace.tsx fully**
- [ ] **Step 2: Extract useThreadDetail hook**
- [ ] **Step 3: Extract PostList — renders PostCard list**
- [ ] **Step 4: Extract ReplyComposer — auto-grow textarea, submit**
- [ ] **Step 5: Rewrite ThreadDetailWorkspace as orchestrator**
- [ ] **Step 6: Update import in page.tsx**
- [ ] **Step 7: Remove all `<style jsx>`, verify `/threads/[id]` works**
- [ ] **Step 8: Commit**

```bash
git commit -m "refactor: break ThreadDetailWorkspace into feature-folder with Tailwind migration"
```

---

### Task 14: Migrate MessagesWorkspace — Feature-folder Breakup

**Files:**
- Modify/Move: `frontend/src/components/messages/MessagesWorkspace.tsx`
- Create: `frontend/src/components/messages/ConversationList.tsx`
- Create: `frontend/src/components/messages/ChatPanel.tsx`
- Create: `frontend/src/components/messages/MessageComposer.tsx`
- Create: `frontend/src/components/messages/index.ts`

- [ ] **Step 1: Read MessagesWorkspace.tsx fully**
- [ ] **Step 2: Extract ConversationList — SearchInput + ConversationItem list**
- [ ] **Step 3: Extract ChatPanel — message bubbles + day dividers**
- [ ] **Step 4: Extract MessageComposer — auto-grow textarea + send**
- [ ] **Step 5: Rewrite MessagesWorkspace as orchestrator**
- [ ] **Step 6: Remove all `<style jsx>`, verify `/messages` works**
- [ ] **Step 7: Commit**

```bash
git commit -m "refactor: break MessagesWorkspace into feature-folder with Tailwind migration"
```

---

### Task 15: Migrate NotificationsWorkspace

**Files:**
- Modify: `frontend/src/components/notifications/NotificationsWorkspace.tsx`
- Create: `frontend/src/components/notifications/NotificationList.tsx`
- Create: `frontend/src/components/notifications/index.ts`

- [ ] **Step 1: Read NotificationsWorkspace.tsx fully**
- [ ] **Step 2: Extract NotificationList — renders NotificationItem with InfiniteScrollList**
- [ ] **Step 3: Rewrite NotificationsWorkspace — TabBar + FilterChips + NotificationList**
- [ ] **Step 4: Remove all `<style jsx>`, verify `/notifications` works**
- [ ] **Step 5: Commit**

```bash
git commit -m "refactor: modularize NotificationsWorkspace with Tailwind migration"
```

---

### Task 16: Migrate People Pages

**Files:**
- Modify: `frontend/src/components/people/PeopleWorkspaceShell.tsx`
- Modify: `frontend/src/components/people/PeopleExploreWorkspace.tsx`
- Modify: `frontend/src/components/people/PeopleSearchWorkspace.tsx`
- Modify: `frontend/src/components/people/PeopleRequestsWorkspace.tsx`
- Delete: `frontend/src/components/people/PeopleCard.tsx`
- Create: `frontend/src/components/people/index.ts`

- [ ] **Step 1: Read all 4 People files**
- [ ] **Step 2: Reskin PeopleWorkspaceShell to Tailwind**
- [ ] **Step 3: Reskin PeopleExploreWorkspace — replace PeopleCard with UserCard**
- [ ] **Step 4: Reskin PeopleSearchWorkspace — use SearchInput, UserCard**
- [ ] **Step 5: Reskin PeopleRequestsWorkspace — use UserCard, Button**
- [ ] **Step 6: Delete PeopleCard.tsx**
- [ ] **Step 7: Remove all `<style jsx>`, verify `/people` pages work**
- [ ] **Step 8: Commit**

```bash
git commit -m "refactor: migrate People pages to Tailwind + design system UserCard"
```

---

### Task 17: Migrate AdminWorkspace

**Files:**
- Modify: `frontend/src/components/admin/AdminWorkspace.tsx`
- Modify: all files in `frontend/src/components/admin/tabs/`
- Delete: `frontend/src/components/admin/shared/` (all files)
- Create: `frontend/src/components/admin/index.ts`

- [ ] **Step 1: Read AdminWorkspace.tsx and all shared/ + tabs/ files**
- [ ] **Step 2: Reskin AdminWorkspace — use TabBar**
- [ ] **Step 3: Reskin each tab file — replace AdminStatCard→StatCard, AdminEmptyState→EmptyState, AdminSkeleton→Skeleton, AdminSectionHeader→PageHeader**
- [ ] **Step 4: Delete admin/shared/ directory**
- [ ] **Step 5: Remove all `<style jsx>`, verify `/admin` works**
- [ ] **Step 6: Commit**

```bash
git commit -m "refactor: migrate Admin pages to design system, delete admin/shared"
```

---

### Task 18: Migrate SettingsWorkspace — Feature-folder Breakup

**Files:**
- Modify: `frontend/src/components/settings/SettingsWorkspace.tsx`
- Create: `frontend/src/components/settings/ProfileForm.tsx`
- Create: `frontend/src/components/settings/SecurityForm.tsx`
- Create: `frontend/src/components/settings/ActivityTab.tsx`
- Create: `frontend/src/components/settings/useSettings.ts`
- Create: `frontend/src/components/settings/index.ts`

- [ ] **Step 1: Read SettingsWorkspace.tsx fully**
- [ ] **Step 2: Extract useSettings hook**
- [ ] **Step 3: Extract ProfileForm — FormField, TextArea, Avatar**
- [ ] **Step 4: Extract SecurityForm — FormField, PasswordInput**
- [ ] **Step 5: Extract ActivityTab — DataTable**
- [ ] **Step 6: Rewrite SettingsWorkspace as TabBar orchestrator**
- [ ] **Step 7: Remove all `<style jsx>`, verify `/settings` works**
- [ ] **Step 8: Commit**

```bash
git commit -m "refactor: break SettingsWorkspace into feature-folder with Tailwind migration"
```

---

### Task 19: Migrate UserProfileWorkspace — Feature-folder Breakup

**Files:**
- Modify/Move: `frontend/src/components/users/UserProfileWorkspace.tsx` → `frontend/src/components/user-profile/`
- Create: `frontend/src/components/user-profile/UserProfileWorkspace.tsx`
- Create: `frontend/src/components/user-profile/ProfileHeader.tsx`
- Create: `frontend/src/components/user-profile/ProfileThreadList.tsx`
- Create: `frontend/src/components/user-profile/useUserProfile.ts`
- Create: `frontend/src/components/user-profile/index.ts`
- Modify: `frontend/src/app/(app)/users/[id]/page.tsx` (update import)
- Modify: `frontend/src/app/[username]/page.tsx` (update import)

- [ ] **Step 1: Read UserProfileWorkspace.tsx fully**
- [ ] **Step 2: Extract useUserProfile hook**
- [ ] **Step 3: Extract ProfileHeader — Avatar (xl), stats, follow/connect**
- [ ] **Step 4: Extract ProfileThreadList — ThreadCard + InfiniteScrollList**
- [ ] **Step 5: Rewrite UserProfileWorkspace as orchestrator**
- [ ] **Step 6: Update import paths in page files**
- [ ] **Step 7: Remove all `<style jsx>`, verify profile pages work**
- [ ] **Step 8: Commit**

```bash
git commit -m "refactor: break UserProfileWorkspace into feature-folder with Tailwind migration"
```

---

### Task 20: Migrate Auth Pages + New Thread Page

**Files:**
- Modify: `frontend/src/app/(auth)/login/page.tsx`
- Modify: `frontend/src/app/(auth)/register/page.tsx`
- Modify: `frontend/src/app/(auth)/forgot-password/page.tsx`
- Modify: `frontend/src/app/(auth)/reset-password/page.tsx`
- Modify: `frontend/src/components/auth/AuthShell.tsx`
- Modify: `frontend/src/app/(app)/threads/new/page.tsx`

- [ ] **Step 1: Read all auth page files + AuthShell**
- [ ] **Step 2: Reskin AuthShell to Tailwind**
- [ ] **Step 3: Reskin login/register pages — use FormField, PasswordInput, Button, Divider**
- [ ] **Step 4: Reskin forgot/reset-password pages**
- [ ] **Step 5: Reskin New Thread page — use FormField, TextArea, FilterChips, Button**
- [ ] **Step 6: Remove all `<style jsx>`, verify auth and new thread pages work**
- [ ] **Step 7: Commit**

```bash
git commit -m "refactor: migrate auth pages and New Thread page to Tailwind + design system"
```

---

### Task 21: Cleanup — Deprecate WorkspaceSidebar, Remove Dead Code, Final Verification

**Files:**
- Modify: `frontend/src/components/app/WorkspaceSidebar.tsx` (add deprecation comment)
- Modify: `frontend/src/components/shared/PageLoader.tsx` (reskin to new tokens)
- Modify: `frontend/src/app/globals.css` (remove any orphaned `.app-shell` references)

- [ ] **Step 1: Add deprecation JSDoc to WorkspaceSidebar**
- [ ] **Step 2: Grep for any remaining `<style jsx>` in `components/` — fix any missed files**
- [ ] **Step 3: Grep for hardcoded hex values in `.tsx` files that should be tokens — fix**
- [ ] **Step 4: Reskin PageLoader to use new token values**
- [ ] **Step 5: Run `npx next build` — fix any type or build errors**
- [ ] **Step 6: Manual smoke test: navigate through all pages, verify light + dark mode**
- [ ] **Step 7: Commit**

```bash
git commit -m "chore: cleanup — deprecate WorkspaceSidebar, fix remaining hardcoded colors, build verification"
```

---

## Task Dependency Graph

```
Phase 1 (Design System):
  Task 1 (tokens) → Task 2,3,4,5,6,7 (all primitives, parallel after T1)
  Tasks 2-7 → Task 8,9 (patterns need primitives)
  Tasks 8,9 → Task 10 (barrel export + build)

Phase 2 (Page Migration):
  Task 10 → Task 11 (app shell first)
  Task 11 → Tasks 12-20 (all page migrations, can be parallel)
  Tasks 12-20 → Task 21 (cleanup last)
```
