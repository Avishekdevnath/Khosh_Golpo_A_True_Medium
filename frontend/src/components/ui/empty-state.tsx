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
