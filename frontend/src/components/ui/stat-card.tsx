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
      "relative rounded-xl border border-border bg-card p-4 flex flex-col gap-1",
      className
    )}>
      {icon && (
        <span className="absolute top-4 right-4 text-text-tertiary [&_svg]:size-5">
          {icon}
        </span>
      )}
      <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">{label}</span>
      <span className="text-2xl font-bold text-text-primary">{value}</span>
      {change && (
        <span className={cn(
          "flex items-center gap-1 text-xs font-medium",
          change.direction === "up" ? "text-success" : "text-destructive"
        )}>
          {change.direction === "up"
            ? <TrendingUp className="size-3" />
            : <TrendingDown className="size-3" />
          }
          {Math.abs(change.value)}%
        </span>
      )}
    </div>
  )
}

export { StatCard }
