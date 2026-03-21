// frontend/src/components/ui/page-header.tsx
import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "./badge"
import { Button } from "./button"

interface PageHeaderProps {
  title: string
  count?: number
  action?: { label: string; onClick: () => void; icon?: React.ReactNode }
  className?: string
  children?: React.ReactNode
}

function PageHeader({ title, count, action, className, children }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center gap-3 px-1", className)}>
      <h2 className="font-serif text-lg font-bold text-text-primary">{title}</h2>
      {count !== undefined && (
        <Badge variant="secondary" size="sm">{count}</Badge>
      )}
      <div className="flex-1" />
      {children}
      {action && (
        <Button size="sm" onClick={action.onClick}>
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  )
}

export { PageHeader }
