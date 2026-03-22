"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquareDashed, RefreshCw, ShieldBan, ShieldOff } from "lucide-react";
import { Divider } from "@/components/ui/divider";
import MessageBubble from "@/components/messages/MessageBubble";
import MessageComposer from "@/components/messages/MessageComposer";
import { avatarSeed, initials } from "@/lib/workspaceUtils";
import { canonicalProfilePath } from "@/lib/profileRouting";
import type { Conversation, Message } from "@/types/message";

type LocalMessage = Message & { delivery_state: "sending" | "failed" };

type ChatPanelProps = {
  activeConversation: Conversation | null | undefined;
  displayMessages: (Message | LocalMessage)[];
  messagesLoading: boolean;
  composer: string;
  onComposerChange: (value: string) => void;
  onSend: () => void;
  onRetry: (content: string, id: string) => void;
  onBack: () => void;
  onBlockToggle: () => void;
  onRefresh: () => Promise<void>;
  blockBusy: boolean;
  sending: boolean;
  blockedMessage: string | null;
};

function formatDayLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Message thread skeleton ───────────────────────────────────────────────────

function MessagesSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-5 pt-4">
      {[false, true, false, false, true].map((isOwn, i) => (
        <div key={i} className={["flex", isOwn ? "justify-end" : "justify-start"].join(" ")}>
          <div
            className="h-9 rounded-2xl bg-card-hover animate-pulse"
            style={{
              width: `${100 + (i % 3) * 60}px`,
              animationDelay: `${i * 0.08}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyConversation({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full text-center px-8">
      <div className="size-12 rounded-2xl border border-border bg-card-hover flex items-center justify-center">
        <MessageSquareDashed size={20} strokeWidth={1.5} className="text-text-tertiary" />
      </div>
      <p className="m-0 text-[14px] font-medium text-foreground">Start the conversation</p>
      <p className="m-0 text-[12.5px] text-text-tertiary max-w-xs">
        Send {name} your first message below.
      </p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatPanel({
  activeConversation,
  displayMessages,
  messagesLoading,
  composer,
  onComposerChange,
  onSend,
  onRetry,
  onBack,
  onBlockToggle,
  onRefresh,
  blockBusy,
  sending,
  blockedMessage,
}: ChatPanelProps) {
  const threadRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  };

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [displayMessages.length]);

  // ── No conversation selected ───────────────────────────────────────────────

  if (!activeConversation) {
    return (
      <section className="ws-panel flex flex-col min-w-0 min-h-0 items-center justify-center">
        <div className="text-center flex flex-col items-center gap-3">
          <div className="size-14 rounded-2xl border border-border bg-card-hover flex items-center justify-center">
            <MessageSquareDashed size={24} strokeWidth={1.5} className="text-text-tertiary" />
          </div>
          <h2 className="m-0 font-serif text-[22px] text-foreground/80">
            Your messages
          </h2>
          <p className="m-0 text-[13px] text-text-secondary max-w-xs">
            Select a conversation on the left, or start a new one with a connection.
          </p>
        </div>
      </section>
    );
  }

  const p = activeConversation.other_participant;
  const [c1, c2] = avatarSeed(p.id);
  const label = p.display_name || p.username;
  const profileHref = canonicalProfilePath({ id: p.id, username: p.username, profile_slug: null });

  return (
    <section className="ws-panel flex flex-col min-w-0 min-h-0">

      {/* Chat header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border shrink-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="md:hidden size-8 flex items-center justify-center rounded-full hover:bg-card-hover text-text-tertiary hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>

        {/* Avatar */}
        <Link href={profileHref} className="relative shrink-0 no-underline">
          <div
            className="size-[38px] rounded-full flex items-center justify-center text-[12px] font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
          >
            {initials(label)}
          </div>
          {p.is_active && (
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-[#3dd68c] border-2 border-background" />
          )}
        </Link>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <Link href={profileHref} className="no-underline">
            <span className="block text-[14px] font-semibold text-foreground hover:underline truncate">
              {label}
            </span>
          </Link>
          <span className="block text-[11.5px] text-text-tertiary">
            {p.is_active ? "Online" : `@${p.username}`}
          </span>
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={refreshing}
          aria-label="Refresh messages"
          title="Refresh messages"
          className="size-8 flex items-center justify-center rounded-full border border-border text-text-tertiary hover:bg-card-hover hover:text-foreground transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
        </button>

        {/* Block button */}
        <button
          type="button"
          disabled={blockBusy || activeConversation.blocked_you}
          onClick={onBlockToggle}
          title={activeConversation.blocked_by_me ? "Unblock user" : "Block user"}
          className={[
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-medium shrink-0",
            "transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer",
            activeConversation.blocked_by_me
              ? "border-destructive/40 text-destructive hover:bg-destructive/10"
              : "border-border text-text-tertiary hover:border-border-strong hover:text-foreground",
          ].join(" ")}
        >
          {activeConversation.blocked_by_me ? <ShieldOff size={12} /> : <ShieldBan size={12} />}
          {blockBusy
            ? "Saving…"
            : activeConversation.blocked_by_me
              ? "Unblock"
              : activeConversation.blocked_you
                ? "Blocked"
                : "Block"}
        </button>
      </div>

      {/* Blocked / restricted banner */}
      {blockedMessage && (
        <div className="px-5 py-2.5 text-[12.5px] text-destructive/90 border-b border-destructive/20 bg-destructive/6 shrink-0">
          {blockedMessage}
        </div>
      )}

      {/* Message thread */}
      <div
        ref={threadRef}
        className="flex-1 min-h-0 overflow-y-auto ws-scroll px-5 pt-4 pb-2"
      >
        {messagesLoading && displayMessages.length === 0 && <MessagesSkeleton />}

        {displayMessages.length === 0 && !messagesLoading && (
          <EmptyConversation name={p.display_name || p.username} />
        )}

        {displayMessages.map((message, index) => {
          const prev = displayMessages[index - 1];
          const currentLabel = formatDayLabel(message.created_at);
          const showDivider = !prev || formatDayLabel(prev.created_at) !== currentLabel;
          const local = "delivery_state" in message ? (message as LocalMessage) : null;

          // Group consecutive messages from same sender — tighter spacing
          const prevSameSender = prev && prev.is_own === message.is_own;

          return (
            <div key={message.id} className={prevSameSender ? "mt-0.5" : "mt-3"}>
              {showDivider && currentLabel && (
                <Divider label={currentLabel} className="my-4" />
              )}
              <MessageBubble
                message={message}
                isOwn={message.is_own}
                deliveryState={local?.delivery_state}
                onRetry={(id) => onRetry(message.content, id)}
              />
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <MessageComposer
        value={composer}
        onChange={onComposerChange}
        onSend={onSend}
        disabled={!activeConversation.can_message}
        sending={sending}
        placeholder={`Message ${p.display_name || p.username}…`}
      />
    </section>
  );
}
