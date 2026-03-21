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
        "hover:border-primary hover:text-primary transition-colors duration-[150ms]",
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
