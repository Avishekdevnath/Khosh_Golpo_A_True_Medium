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
  "aria-label"?: string
}

function FilterChips({
  items,
  value,
  onChange,
  multiple = false,
  variant = "pill",
  className,
  "aria-label": ariaLabel,
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
      aria-label={ariaLabel}
    >
      {items.map(item => {
        const isActive = selected.includes(item.value)
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => toggle(item.value)}
            className={cn(
              "shrink-0 font-medium transition-colors duration-[150ms]",
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
