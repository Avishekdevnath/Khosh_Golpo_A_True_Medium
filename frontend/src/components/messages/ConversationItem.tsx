"use client";

import { avatarSeed, initials } from "@/lib/workspaceUtils";

function formatConvTime(value: string): string {
  const normalized = value.endsWith("Z") || value.includes("+") ? value : value + "Z";
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}
import type { Conversation } from "@/types/message";

type ConversationItemProps = {
  conversation: Conversation;
  selected?: boolean;
  onSelect?: (id: string) => void;
};

export default function ConversationItem({ conversation, selected, onSelect }: ConversationItemProps) {
  const { other_participant: p, last_message_preview, last_message_at, unread_count } = conversation;
  const hasUnread = unread_count > 0;
  const [c1, c2] = avatarSeed(p.id);
  const label = p.display_name || p.username;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(conversation.id)}
      className={[
        "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors duration-150 cursor-pointer",
        selected
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-card-hover border border-transparent",
      ].join(" ")}
    >
      {/* Avatar with gradient initials */}
      <div className="relative shrink-0">
        <div
          className="size-[40px] rounded-full flex items-center justify-center text-[13px] font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
        >
          {initials(label)}
        </div>
        {p.is_active && (
          <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-[#3dd68c] border-2 border-background" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span className={["text-[13.5px] truncate", hasUnread ? "font-semibold text-foreground" : "font-medium text-foreground/80"].join(" ")}>
            {label}
          </span>
          {last_message_at && (
            <time className="text-[11px] text-text-tertiary shrink-0">
              {formatConvTime(last_message_at)}
            </time>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={["text-[12px] truncate leading-snug", hasUnread ? "text-text-secondary font-medium" : "text-text-tertiary"].join(" ")}>
            {last_message_preview ?? "No messages yet"}
          </span>
          {hasUnread && (
            <span className="shrink-0 min-w-[18px] h-[18px] px-1.5 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">
              {unread_count > 99 ? "99+" : unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
