import * as React from "react"
import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circle" | "rect"
}

function Skeleton({ variant = "rect", className, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse bg-muted",
        variant === "circle" && "rounded-full",
        variant === "text" && "rounded-md",
        variant === "rect" && "rounded-lg",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
