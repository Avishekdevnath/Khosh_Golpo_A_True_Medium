"use client";

import { Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { PeopleCard } from "@/types/people";

// ─── Props ────────────────────────────────────────────────────────────────────

type UserCardProps = {
  user: PeopleCard;
  variant?: "grid" | "list";
  onFollow?: (id: string) => void;
  onConnect?: (id: string) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function UserCard({ user, variant = "grid", onFollow, onConnect }: UserCardProps) {
  const roleBadge = user.role === "admin" || user.role === "moderator"
    ? <Badge variant="warning" size="sm">{user.role}</Badge>
    : null;

  if (variant === "list") {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-xl hover:bg-card-hover transition-colors">
        <Avatar src={user.avatar_url} name={user.display_name || user.username} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-foreground truncate">
              {user.display_name || user.username}
            </span>
            {roleBadge}
          </div>
          <span className="text-xs text-text-tertiary">@{user.username}</span>
        </div>
        {onFollow && (
          <button
            onClick={() => onFollow(user.id)}
            className={[
              "shrink-0 text-xs px-3 py-1 rounded-full border transition-colors",
              user.is_following
                ? "border-border text-muted-foreground hover:bg-card-hover"
                : "border-primary text-primary hover:bg-primary/10",
            ].join(" ")}
          >
            {user.is_following ? "Following" : "Follow"}
          </button>
        )}
      </div>
    );
  }

  // Grid variant
  return (
    <div className="flex flex-col gap-3 p-4 bg-card border border-border rounded-xl hover:bg-card-hover transition-colors">
      {/* Identity */}
      <div className="flex flex-col items-center gap-2 text-center">
        <Avatar src={user.avatar_url} name={user.display_name || user.username} size="lg" />
        <div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">
              {user.display_name || user.username}
            </span>
            {roleBadge}
          </div>
          <span className="text-xs text-text-tertiary">@{user.username}</span>
        </div>
      </div>

      {/* Bio */}
      {user.bio && (
        <p className="text-xs text-muted-foreground text-center line-clamp-2">{user.bio}</p>
      )}

      {/* Stats */}
      <div className="flex items-center justify-center gap-3 text-xs text-text-tertiary">
        <span className="flex items-center gap-1">
          <Users size={11} />
          {user.followers_count.toLocaleString()}
        </span>
        {user.mutual_follow_count > 0 && (
          <span className="text-info">{user.mutual_follow_count} mutual</span>
        )}
      </div>

      {/* Actions */}
      {(onFollow || onConnect) && (
        <div className="flex gap-2">
          {onFollow && (
            <button
              onClick={() => onFollow(user.id)}
              className={[
                "flex-1 text-xs py-1.5 rounded-lg border transition-colors",
                user.is_following
                  ? "border-border text-muted-foreground hover:bg-card-hover"
                  : "border-primary text-primary hover:bg-primary/10",
              ].join(" ")}
            >
              {user.is_following ? "Following" : "Follow"}
            </button>
          )}
          {onConnect && !user.is_connected && !user.has_pending_request && (
            <button
              onClick={() => onConnect(user.id)}
              className="flex-1 text-xs py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Connect
            </button>
          )}
        </div>
      )}
    </div>
  );
}
