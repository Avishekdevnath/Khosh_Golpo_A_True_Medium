"use client";

import {
  AtSign, Bell, Link2, Mail, MessageSquareReply, ShieldAlert, UserPlus, X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/workspaceUtils";
import type { Notification } from "@/hooks/useNotifications";

// ─── Type config ──────────────────────────────────────────────────────────────

type TypeMeta = { icon: React.ReactNode; variant: "info" | "danger" | "success" | "warning" | "outline" };

const TYPE_META: Record<Notification["type"], TypeMeta> = {
  follow:     { icon: <UserPlus       size={14} />, variant: "info" },
  mention:    { icon: <AtSign         size={14} />, variant: "warning" },
  reply:      { icon: <MessageSquareReply size={14} />, variant: "success" },
  moderation: { icon: <ShieldAlert    size={14} />, variant: "warning" },
  system:     { icon: <Bell          size={14} />, variant: "outline" },
  connection: { icon: <Link2          size={14} />, variant: "warning" },
  message:    { icon: <Mail           size={14} />, variant: "success" },
};

// ─── Props ────────────────────────────────────────────────────────────────────

type NotificationItemProps = {
  notification: Notification;
  actorName?: string;
  actorAvatar?: string | null;
  onAction?: (id: string, action: string) => void;
  onDismiss?: (id: string) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationItem({
  notification,
  actorName,
  actorAvatar,
  onAction,
  onDismiss,
}: NotificationItemProps) {
  const meta = TYPE_META[notification.type] ?? TYPE_META.system;
  const unread = !notification.is_read;

  return (
    <div
      className={[
        "flex items-start gap-3 px-4 py-3 rounded-lg transition-colors",
        unread ? "bg-accent-muted" : "hover:bg-card-hover",
      ].join(" ")}
    >
      {/* Left: avatar or icon */}
      <div className="shrink-0 mt-0.5">
        {actorName ? (
          <Avatar src={actorAvatar} name={actorName} size="sm" />
        ) : (
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {meta.icon}
          </span>
        )}
      </div>

      {/* Center: content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <Badge variant={meta.variant} size="sm">
            {meta.icon}
            {notification.type}
          </Badge>
          {unread && (
            <span className="size-1.5 rounded-full bg-primary shrink-0" aria-label="Unread" />
          )}
        </div>
        <p className="text-sm text-foreground leading-snug">{notification.message}</p>
        <time className="text-xs text-text-tertiary mt-0.5 block">
          {relativeTime(notification.created_at)}
        </time>

        {/* Optional action buttons */}
        {onAction && (notification.type === "follow" || notification.type === "connection") && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onAction(notification.id, "accept")}
              className="text-xs px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Accept
            </button>
            <button
              onClick={() => onAction(notification.id, "decline")}
              className="text-xs px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:bg-card-hover transition-colors"
            >
              Decline
            </button>
          </div>
        )}
      </div>

      {/* Dismiss */}
      {onDismiss && (
        <button
          onClick={() => onDismiss(notification.id)}
          aria-label="Dismiss notification"
          className="shrink-0 mt-0.5 text-text-tertiary hover:text-foreground transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
