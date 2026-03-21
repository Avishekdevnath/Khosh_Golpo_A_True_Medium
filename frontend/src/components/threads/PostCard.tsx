"use client";

import * as React from "react"
import { Heart, MessageSquare, Pencil, Trash2, Flag } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar } from "@/components/ui/avatar"

interface PostCardProps {
  post: {
    id: string
    body: string
    like_count?: number
    created_at?: string
    is_liked?: boolean
    flagged?: boolean
  }
  author: {
    display_name?: string
    username?: string
    avatar_url?: string | null
  }
  depth?: number
  isOwn?: boolean
  isAdmin?: boolean
  onLike?: (id: string) => void
  onReply?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onFlag?: (id: string) => void
  className?: string
}

function PostCard({
  post, author, depth = 0,
  isOwn = false, isAdmin = false,
  onLike, onReply, onEdit, onDelete, onFlag,
  className
}: PostCardProps) {
  const [hovered, setHovered] = React.useState(false)
  const authorName = author.display_name || author.username || "User"

  return (
    <div
      className={cn(
        "group relative flex gap-3 py-3 px-4 rounded-lg transition-colors duration-150",
        "hover:bg-card-hover",
        depth > 0 && "ml-6 border-l-2 border-border-subtle pl-4",
        className
      )}
      style={depth > 1 ? { marginLeft: `${depth * 24}px` } : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Avatar
        src={author.avatar_url}
        name={authorName}
        size="sm"
        className="shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        {/* Author + time */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-semibold text-text-primary">{authorName}</span>
          {author.username && (
            <span className="text-xs text-text-tertiary">@{author.username}</span>
          )}
          {post.created_at && (
            <span className="text-xs text-text-tertiary ml-auto">
              {new Date(post.created_at).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Body */}
        <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{post.body}</p>

        {/* Actions */}
        <div className={cn(
          "flex items-center gap-1 mt-2 transition-opacity duration-150",
          hovered ? "opacity-100" : "opacity-40"
        )}>
          {onLike && (
            <button
              type="button"
              onClick={() => onLike(post.id)}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
                post.is_liked
                  ? "text-destructive"
                  : "text-text-tertiary hover:text-text-primary"
              )}
              aria-label="Like post"
            >
              <Heart className={cn("size-3.5", post.is_liked && "fill-current")} />
              {post.like_count !== undefined && post.like_count > 0 && post.like_count}
            </button>
          )}
          {onReply && (
            <button
              type="button"
              onClick={() => onReply(post.id)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-tertiary hover:text-text-primary transition-colors"
              aria-label="Reply to post"
            >
              <MessageSquare className="size-3.5" />
            </button>
          )}
          {(isOwn || isAdmin) && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(post.id)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-tertiary hover:text-text-primary transition-colors"
              aria-label="Edit post"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
          {(isOwn || isAdmin) && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(post.id)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-destructive/60 hover:text-destructive transition-colors"
              aria-label="Delete post"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
          {!isOwn && onFlag && (
            <button
              type="button"
              onClick={() => onFlag(post.id)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-tertiary hover:text-warning transition-colors ml-auto"
              aria-label="Flag post"
            >
              <Flag className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export { PostCard }
