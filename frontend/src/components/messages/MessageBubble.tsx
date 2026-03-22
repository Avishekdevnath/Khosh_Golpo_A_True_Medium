"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import type { Message } from "@/types/message";

function formatMessageTime(value: string): string {
  const normalized = value.endsWith("Z") || value.includes("+") ? value : value + "Z";
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

type DeliveryState = "sending" | "sent" | "failed";

type MessageBubbleProps = {
  message: Message;
  isOwn: boolean;
  deliveryState?: DeliveryState;
  onRetry?: (id: string) => void;
};

export default function MessageBubble({ message, isOwn, deliveryState, onRetry }: MessageBubbleProps) {
  const isFailed = deliveryState === "failed";
  const isSending = deliveryState === "sending";

  return (
    <div className={["flex flex-col gap-1", isOwn ? "items-end" : "items-start"].join(" ")}>
      <div
        className={[
          "group relative max-w-[72%] px-4 py-2.5 text-[14px] leading-relaxed break-words",
          isOwn
            ? "bg-primary text-white rounded-2xl rounded-br-[6px] self-end"
            : "bg-card-hover border border-border text-foreground rounded-2xl rounded-bl-[6px] self-start",
          isFailed ? "opacity-60 ring-1 ring-destructive/50" : "",
          isSending ? "opacity-50" : "",
        ].filter(Boolean).join(" ")}
      >
        {message.is_deleted ? (
          <span className="italic opacity-50 text-[13px]">Message deleted</span>
        ) : (
          message.content
        )}
      </div>

      {/* Meta row */}
      <div className={["flex items-center gap-1.5 px-1", isOwn ? "flex-row-reverse" : "flex-row"].join(" ")}>
        <time className="text-[11px] text-text-tertiary">
          {formatMessageTime(message.created_at)}
        </time>

        {isFailed && (
          <span className="flex items-center gap-1 text-[11px] text-destructive">
            <AlertCircle size={11} />
            Failed
            {onRetry && (
              <button
                type="button"
                onClick={() => onRetry(message.id)}
                aria-label="Retry sending"
                className="ml-0.5 text-destructive hover:opacity-70 transition-opacity"
              >
                <RotateCcw size={11} />
              </button>
            )}
          </span>
        )}

        {isSending && (
          <span className="text-[11px] text-text-tertiary">Sending…</span>
        )}
      </div>
    </div>
  );
}
