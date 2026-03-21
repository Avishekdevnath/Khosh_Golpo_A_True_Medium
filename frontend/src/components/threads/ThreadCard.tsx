"use client";

import * as React from "react"
import { MessageSquare, Heart, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface ThreadCardProps {
  thread: {
    id: string
    title: string
    body?: string
    author_id?: string
    author_name?: string
    author_username?: string
    author_avatar?: string | null
    channel?: string
    tags?: string[]
    like_count?: number
    reply_count?: number
    view_count?: number
    created_at?: string
    status?: string
  }
  variant?: "list" | "compact"
  selected?: boolean
  onSelect?: (id: string) => void
  className?: string
}

function ThreadCard({ thread, variant = "list", selected, onSelect, className }: ThreadCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-2 px-4 py-3.5 cursor-pointer transition-colors duration-150",
        "border-b border-border-subtle last:border-0",
        selected
          ? "bg-card-active border-l-2 border-l-primary pl-[14px]"
          : "hover:bg-card-hover",
        className
      )}
      onClick={() => onSelect?.(thread.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(thread.id) } }}
      aria-pressed={selected}
    >
      {/* Author row */}
      <div className="flex items-center gap-2">
        <Avatar
          src={thread.author_avatar}
          name={thread.author_name || thread.author_username || "User"}
          size="sm"
        />
        <span className="text-xs text-text-secondary">
          {thread.author_name || thread.author_username || "Unknown"}
        </span>
        {thread.channel && (
          <span className="ml-auto text-xs text-text-tertiary">{thread.channel}</span>
        )}
      </div>

      {/* Title */}
      <h3 className={cn(
        "font-serif font-semibold text-text-primary line-clamp-2 leading-snug",
        variant === "compact" ? "text-sm" : "text-[15px]"
      )}>
        {thread.title}
      </h3>

      {variant === "list" && (
        <>
          {/* Tags */}
          {thread.tags && thread.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {thread.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" size="sm">{tag}</Badge>
              ))}
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 text-xs text-text-tertiary">
            {thread.reply_count !== undefined && (
              <span className="flex items-center gap-1">
                <MessageSquare className="size-3" />
                {thread.reply_count}
              </span>
            )}
            {thread.like_count !== undefined && (
              <span className="flex items-center gap-1">
                <Heart className="size-3" />
                {thread.like_count}
              </span>
            )}
            {thread.created_at && (
              <span className="flex items-center gap-1 ml-auto">
                <Clock className="size-3" />
                {new Date(thread.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export { ThreadCard }
