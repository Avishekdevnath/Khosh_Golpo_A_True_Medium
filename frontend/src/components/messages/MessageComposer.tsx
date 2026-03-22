"use client";

import { LoaderCircle, SendHorizontal } from "lucide-react";
import { useRef, useEffect } from "react";

type MessageComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  sending?: boolean;
  placeholder?: string;
};

export default function MessageComposer({
  value,
  onChange,
  onSend,
  disabled = false,
  sending = false,
  placeholder = "Write a message…",
}: MessageComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  return (
    <div className="border-t border-border px-4 py-3 shrink-0">
      <div className="flex items-end gap-2.5 bg-card-hover border border-border rounded-2xl px-4 py-2.5 transition-colors focus-within:border-primary/40 focus-within:bg-background">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={disabled ? "Messaging disabled" : placeholder}
          disabled={disabled || sending}
          rows={1}
          className={[
            "flex-1 min-h-[24px] bg-transparent text-[14px] text-foreground placeholder:text-text-tertiary",
            "resize-none outline-none leading-relaxed font-sans",
            "disabled:opacity-40 disabled:cursor-not-allowed",
          ].join(" ")}
        />
        <button
          type="button"
          disabled={!value.trim() || disabled || sending}
          onClick={onSend}
          aria-label="Send message"
          className={[
            "shrink-0 size-9 rounded-xl flex items-center justify-center",
            "bg-primary text-white transition-opacity duration-150",
            "disabled:opacity-30 disabled:cursor-not-allowed",
            "enabled:hover:opacity-85",
          ].join(" ")}
        >
          {sending ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <SendHorizontal size={16} />
          )}
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-text-tertiary px-1">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
