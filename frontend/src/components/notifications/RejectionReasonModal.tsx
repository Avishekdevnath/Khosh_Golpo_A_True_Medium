"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export default function RejectionReasonModal({
  note,
  onClose,
}: {
  note: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/55 backdrop-blur-[4px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rej-modal-title"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-[min(480px,100%)] border border-border rounded-[14px] bg-card text-foreground p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] animate-[rejSlideUp_0.2s_ease]"
        style={{ animation: "rejSlideUp 0.2s ease" }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes rejSlideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Header */}
        <div className="flex items-center justify-between gap-[10px] mb-2">
          <h3
            id="rej-modal-title"
            className="m-0 font-serif text-[20px] leading-[1.1] text-destructive"
          >
            Appeal Rejected
          </h3>
          <button
            type="button"
            className="border border-border bg-background text-foreground/60 rounded-lg w-[30px] h-[30px] grid place-items-center cursor-pointer hover:text-foreground hover:border-border/80 transition-colors duration-150"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <p className="m-0 mb-[14px] text-foreground/70 text-[13px] leading-[1.45]">
          The admin provided the following reason for rejecting your appeal:
        </p>

        <div className="border border-destructive/25 bg-destructive/[0.06] rounded-[10px] px-[14px] py-3">
          <p className="m-0 text-[13px] leading-[1.6] text-foreground whitespace-pre-wrap">
            {note}
          </p>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="border border-border bg-background text-foreground/70 rounded-[9px] px-4 py-2 text-[12px] font-bold cursor-pointer transition-all duration-150 hover:text-foreground hover:border-border/80 hover:bg-card-hover"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
