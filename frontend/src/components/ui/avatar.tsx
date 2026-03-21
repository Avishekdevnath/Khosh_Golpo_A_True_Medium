"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const avatarVariants = cva(
  "relative inline-flex items-center justify-center rounded-full bg-muted font-medium text-muted-foreground select-none shrink-0 overflow-hidden",
  {
    variants: {
      size: {
        xs: "size-5 text-[9px]",
        sm: "size-7 text-xs",
        md: "size-9 text-sm",
        lg: "size-12 text-base",
        xl: "size-20 text-2xl",
      },
    },
    defaultVariants: { size: "md" },
  }
)

const statusDot = cva(
  "absolute bottom-0 right-0 rounded-full border-2 border-background",
  {
    variants: {
      status: {
        online: "bg-success",
        away: "bg-warning",
        offline: "bg-text-tertiary",
      },
      size: {
        xs: "size-1.5",
        sm: "size-2",
        md: "size-2.5",
        lg: "size-3",
        xl: "size-4",
      },
    },
    defaultVariants: { size: "md" },
  }
)

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? ""
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface AvatarProps extends VariantProps<typeof avatarVariants> {
  src?: string | null
  name: string
  status?: "online" | "away" | "offline"
  className?: string
}

function Avatar({ src, name, size, status, className }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false)

  return (
    <span
      role="img"
      aria-label={status ? `${name} (${status})` : name}
      className={cn(avatarVariants({ size }), className)}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
      {status && (
        <span className={cn(statusDot({ status, size }))} />
      )}
    </span>
  )
}

export { Avatar, avatarVariants, getInitials }
