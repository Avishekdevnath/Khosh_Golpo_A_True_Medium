// frontend/src/components/ui/modal.tsx
"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  size?: "sm" | "md" | "lg"
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
}

function Modal({ open, onClose, title, size = "md", children, footer, className }: ModalProps) {
  const titleId = React.useId()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  // Trap Escape key
  React.useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (!mounted || !open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Box */}
      <div
        className={cn(
          "relative w-full rounded-xl border border-border-subtle bg-surface-elevated shadow-2xl",
          "flex flex-col max-h-[90vh]",
          sizeMap[size],
          className
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
        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-border-subtle px-5 py-4 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export { Modal }
