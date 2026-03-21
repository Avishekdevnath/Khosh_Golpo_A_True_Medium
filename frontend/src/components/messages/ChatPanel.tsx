"use client";

import { useRef, useEffect } from "react";
import { ArrowLeft, MessageSquare, ShieldBan, ShieldOff } from "lucide-react";
import { Divider } from "@/components/ui/divider";
import MessageBubble from "@/components/messages/MessageBubble";
import MessageComposer from "@/components/messages/MessageComposer";
import type { Conversation, Message } from "@/types/message";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  blockBusy: boolean;
  sending: boolean;
  blockedMessage: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDayLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
  blockBusy,
  sending,
  blockedMessage,
}: ChatPanelProps) {
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [displayMessages.length]);

  if (!activeConversation) {
    return (
      <section className="ws-panel flex flex-col min-w-0 min-h-0 items-center justify-center">
        <div className="text-center grid gap-2.5 text-text-tertiary">
          <MessageSquare size={28} className="mx-auto" />
          <h2
            className="m-0 text-[22px] text-foreground/80"
            style={{ fontFamily: "var(--font-dm-serif), serif" }}
          >
            Choose a conversation
          </h2>
          <p className="m-0 text-[13px]">Select a connection or start a new conversation.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="ws-panel flex flex-col min-w-0 min-h-0">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="md:hidden inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-[15px] font-bold text-foreground truncate">
            {activeConversation.other_participant.display_name}
          </span>
          <span className="text-[11px] text-text-tertiary">
            @{activeConversation.other_participant.username}
          </span>
        </div>

        <button
          type="button"
          disabled={blockBusy || activeConversation.blocked_you}
          onClick={onBlockToggle}
          className={[
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shrink-0",
            "transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
            activeConversation.blocked_by_me
              ? "text-[#f6b0b0] border-destructive/35 hover:border-destructive/60"
              : "text-text-tertiary border-border hover:border-border-strong hover:text-foreground",
          ].join(" ")}
        >
          {activeConversation.blocked_by_me ? <ShieldOff size={13} /> : <ShieldBan size={13} />}
          {blockBusy
            ? "Saving…"
            : activeConversation.blocked_by_me
              ? "Unblock"
              : activeConversation.blocked_you
                ? "Blocked"
                : "Block"}
        </button>
      </div>

      {/* Blocked / restricted warning */}
      {blockedMessage && (
        <div className="px-5 py-2.5 text-xs text-[#f6b0b0] border-b border-destructive/20 bg-destructive/7 shrink-0">
          {blockedMessage}
        </div>
      )}

      {/* Message thread */}
      <div
        ref={threadRef}
        className="flex-1 min-h-0 overflow-y-auto ws-scroll px-5 pt-4 pb-2"
      >
        {messagesLoading && displayMessages.length === 0 && (
          <p className="text-xs text-text-tertiary">Loading messages…</p>
        )}
        {displayMessages.length === 0 && !messagesLoading && (
          <p className="text-xs text-text-tertiary text-center py-6">No messages yet. Say hello!</p>
        )}

        {displayMessages.map((message, index) => {
          const prev = displayMessages[index - 1];
          const currentLabel = formatDayLabel(message.created_at);
          const showDivider = !prev || formatDayLabel(prev.created_at) !== currentLabel;
          const local = "delivery_state" in message ? (message as LocalMessage) : null;

          return (
            <div key={message.id}>
              {showDivider && currentLabel && (
                <Divider label={currentLabel} className="my-3" />
              )}
              <div className="mb-2">
                <MessageBubble
                  message={message}
                  isOwn={message.is_own}
                  deliveryState={local?.delivery_state}
                  onRetry={(id) => onRetry(message.content, id)}
                />
              </div>
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
        placeholder="Write a message…"
      />
    </section>
  );
}
