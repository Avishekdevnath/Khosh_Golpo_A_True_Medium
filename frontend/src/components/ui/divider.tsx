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
