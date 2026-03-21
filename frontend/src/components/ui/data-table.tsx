// frontend/src/components/ui/data-table.tsx
"use client"

import * as React from "react"
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"
import { EmptyState } from "./empty-state"

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render?: (row: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  skeletonRows?: number
  onSort?: (key: string, direction: "asc" | "desc") => void
  sortKey?: string
  sortDirection?: "asc" | "desc"
  emptyState?: { icon?: React.ReactNode; title: string; description?: string }
  size?: "default" | "compact"
  className?: string
  getRowKey?: (row: T, index: number) => string
}

function DataTable<T>({
  columns,
  data,
  loading = false,
  skeletonRows = 5,
  onSort,
  sortKey,
  sortDirection,
  emptyState,
  size = "default",
  className,
  getRowKey,
}: DataTableProps<T>) {
  const handleSort = (col: Column<T>) => {
    if (!col.sortable || !onSort) return
    const nextDir = sortKey === col.key && sortDirection === "asc" ? "desc" : "asc"
    onSort(col.key, nextDir)
  }

  const rowHeight = size === "compact" ? "h-9" : "h-12"

  return (
    <div className={cn("w-full overflow-x-auto rounded-lg border border-border", className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary">
            {columns.map(col => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  "px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary",
                  col.sortable && onSort && "cursor-pointer select-none hover:text-text-primary",
                  col.className
                )}
                onClick={() => handleSort(col)}
                aria-sort={
                  sortKey === col.key
                    ? sortDirection === "asc" ? "ascending" : "descending"
                    : undefined
                }
              >
                <span className="inline-flex items-center gap-1.5">
                  {col.header}
                  {col.sortable && onSort && (
                    <span className="text-text-tertiary">
                      {sortKey === col.key ? (
                        sortDirection === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
                      ) : (
                        <ChevronsUpDown className="size-3" />
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={i} className={cn("border-b border-border-subtle last:border-0", rowHeight)}>
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-2">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                {emptyState ? (
                  <EmptyState
                    icon={emptyState.icon}
                    title={emptyState.title}
                    description={emptyState.description}
                    className="py-12"
                  />
                ) : (
                  <div className="py-12 text-center text-sm text-text-tertiary">No data</div>
                )}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={getRowKey ? getRowKey(row, i) : i}
                className={cn(
                  "border-b border-border-subtle last:border-0 transition-colors hover:bg-card-hover",
                  rowHeight
                )}
              >
                {columns.map(col => (
                  <td key={col.key} className={cn("px-4 py-2 text-text-primary", col.className)}>
                    {col.render ? col.render(row, i) : String((row as Record<string, unknown>)[col.key] ?? "")}
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

export { DataTable }
