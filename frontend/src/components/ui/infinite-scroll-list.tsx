// frontend/src/components/ui/infinite-scroll-list.tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Spinner } from "./spinner"

interface InfiniteScrollListProps {
  onLoadMore: () => void
  hasMore: boolean
  loading?: boolean
  threshold?: number
  children: React.ReactNode
  className?: string
}

function InfiniteScrollList({
  onLoadMore,
  hasMore,
  loading = false,
  threshold = 200,
  children,
  className,
}: InfiniteScrollListProps) {
  const sentinelRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!hasMore || loading) return
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadMore() },
      { rootMargin: `${threshold}px` }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, onLoadMore, threshold])

  return (
    <div className={cn("flex flex-col", className)}>
      {children}
      <div ref={sentinelRef} className="h-px" aria-hidden="true" />
      {loading && (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      )}
    </div>
  )
}

export { InfiniteScrollList }
