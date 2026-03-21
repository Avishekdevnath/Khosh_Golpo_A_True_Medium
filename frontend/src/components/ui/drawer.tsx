// frontend/src/components/ui/drawer.tsx
"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  size?: "sm" | "md" | "lg"
  children: React.ReactNode
}

const widthMap = {
  sm: "w-80",
  md: "w-[420px]",
  lg: "w-[560px]",
}

function Drawer({ open, onClose, title, size = "md", children }: DrawerProps) {
  const titleId = React.useId()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  React.useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  React.useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (!mounted) return null

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-[220ms]",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 flex flex-col border-l border-border-subtle bg-surface-elevated shadow-2xl",
          "transition-transform duration-[250ms] ease-out",
          widthMap[size],
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-5 py-4 shrink-0">
          <h2 id={titleId} className="font-serif text-base font-semibold text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-text-tertiary hover:text-text-primary hover:bg-card-hover transition-colors"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

export { Drawer }
