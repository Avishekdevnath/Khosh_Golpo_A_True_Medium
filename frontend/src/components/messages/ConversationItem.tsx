"use client";

import { Avatar } from "@/components/ui/avatar";
import { relativeTime } from "@/lib/workspaceUtils";
import type { Conversation } from "@/types/message";

// ─── Props ────────────────────────────────────────────────────────────────────

type ConversationItemProps = {
  conversation: Conversation;
  selected?: boolean;
  onSelect?: (id: string) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ConversationItem({ conversation, selected, onSelect }: ConversationItemProps) {
  const { other_participant: participant, last_message_preview, last_message_at, unread_count } = conversation;
  const hasUnread = unread_count > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(conversation.id)}
      className={[
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
        selected ? "bg-card-active" : "hover:bg-card-hover",
      ].join(" ")}
    >
      {/* Avatar */}
      <Avatar
        src={participant.avatar_url}
        name={participant.display_name || participant.username}
        size="md"
        className="shrink-0"
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={["text-sm truncate", hasUnread ? "font-semibold text-foreground" : "font-medium text-foreground"].join(" ")}>
            {participant.display_name || participant.username}
          </span>
          {last_message_at && (
            <time className="text-xs text-text-tertiary shrink-0">
              {relativeTime(last_message_at)}
            </time>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className={["text-xs truncate", hasUnread ? "text-foreground" : "text-text-tertiary"].join(" ")}>
            {last_message_preview ?? "No messages yet"}
          </span>
          {hasUnread && (
            <span className="shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {unread_count > 99 ? "99+" : unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
