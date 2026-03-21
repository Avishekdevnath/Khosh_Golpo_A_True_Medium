"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { relativeTime } from "@/lib/workspaceUtils";
import type { Message } from "@/types/message";

// ─── Props ────────────────────────────────────────────────────────────────────

type DeliveryState = "sending" | "sent" | "failed";

type MessageBubbleProps = {
  message: Message;
  isOwn: boolean;
  deliveryState?: DeliveryState;
  onRetry?: (id: string) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MessageBubble({ message, isOwn, deliveryState, onRetry }: MessageBubbleProps) {
  const isFailed = deliveryState === "failed";
  const isSending = deliveryState === "sending";

  const bubbleClass = [
    "relative max-w-[75%] px-3.5 py-2 text-sm leading-relaxed break-words",
    isOwn
      ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm self-end"
      : "bg-card border border-border text-foreground rounded-2xl rounded-bl-sm self-start",
    isFailed ? "border-destructive opacity-75" : "",
    isSending ? "opacity-60" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={["flex flex-col gap-1", isOwn ? "items-end" : "items-start"].join(" ")}>
      <div className={bubbleClass}>
        {message.is_deleted ? (
          <span className="italic opacity-60">Message deleted</span>
        ) : (
          message.content
        )}
      </div>

      {/* Meta row: time + delivery state */}
      <div className={["flex items-center gap-1.5 px-1", isOwn ? "flex-row-reverse" : "flex-row"].join(" ")}>
        <time className="text-[10px] text-text-tertiary">
          {relativeTime(message.created_at)}
        </time>

        {isFailed && (
          <span className="flex items-center gap-1 text-[10px] text-destructive">
            <AlertCircle size={10} />
            Failed
            {onRetry && (
              <button
                onClick={() => onRetry(message.id)}
                aria-label="Retry sending"
                className="ml-0.5 text-destructive hover:text-destructive/80 transition-colors"
              >
                <RotateCcw size={10} />
              </button>
            )}
          </span>
        )}

        {isSending && (
          <span className="text-[10px] text-text-tertiary">Sending…</span>
        )}
      </div>
    </div>
  );
}
