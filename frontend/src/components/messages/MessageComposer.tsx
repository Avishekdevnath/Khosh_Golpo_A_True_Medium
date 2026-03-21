"use client";

import { LoaderCircle, SendHorizontal } from "lucide-react";
import { useRef, useEffect } from "react";
import { TextArea } from "@/components/ui/textarea";

// ─── Props ────────────────────────────────────────────────────────────────────

type MessageComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  sending?: boolean;
  placeholder?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MessageComposer({
  value,
  onChange,
  onSend,
  disabled = false,
  sending = false,
  placeholder = "Write a message…",
}: MessageComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep autogrow in sync when value is cleared externally
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  return (
    <div className="flex items-end gap-2.5 border-t border-border px-5 py-3 shrink-0">
      <TextArea
        ref={textareaRef}
        variant="autogrow"
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
        className="min-h-[42px] rounded-xl text-sm"
      />
      <button
        type="button"
        disabled={!value.trim() || disabled || sending}
        onClick={onSend}
        className="inline-flex items-center gap-1.5 shrink-0 px-4 py-2 rounded-xl
          bg-gradient-to-br from-orange-500 to-orange-600
          text-white text-sm font-bold
          transition-opacity duration-150
          disabled:opacity-45 disabled:cursor-not-allowed
          enabled:hover:opacity-88"
      >
        {sending ? (
          <LoaderCircle size={15} className="animate-spin" />
        ) : (
          <SendHorizontal size={15} />
        )}
        Send
      </button>
    </div>
  );
}
