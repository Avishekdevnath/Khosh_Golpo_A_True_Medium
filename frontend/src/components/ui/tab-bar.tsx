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
      onKeyDown={(e) => {
        const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
        const idx = buttons.findIndex(b => b === document.activeElement)
        if (e.key === "ArrowRight" && idx < buttons.length - 1) { buttons[idx + 1].focus(); e.preventDefault() }
        if (e.key === "ArrowLeft" && idx > 0) { buttons[idx - 1].focus(); e.preventDefault() }
      }}
    >
      {tabs.map(tab => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={tab.value === activeTab}
          onClick={() => onChange(tab.value)}
          className={cn(
            "relative shrink-0 px-4 pb-2.5 pt-1.5 text-sm font-medium transition-colors duration-[150ms] -mb-px border-b-2 outline-none",
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
