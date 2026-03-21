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
        className="w-[min(480px,100%)] border border-border rounded-[14px] bg-gradient-to-b from-[#121624] to-[#101420] text-[#e4e8f4] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] animate-[rej-slide-up_0.2s_ease]"
        style={{ animation: "rejSlideUp 0.2s ease" }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes rejSlideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Header */}
        <div className="flex items-center justify-between gap-[10px] mb-2">
          <h3
            id="rej-modal-title"
            className="m-0 font-serif text-[20px] leading-[1.1] text-[#f06b6b]"
          >
            Appeal Rejected
          </h3>
          <button
            type="button"
            className="border border-[#2b324c] bg-[#151927] text-[#8d98b8] rounded-lg w-[30px] h-[30px] grid place-items-center cursor-pointer hover:text-[#e4e8f4] hover:border-[#3d4460] transition-colors duration-150"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <p className="m-0 mb-[14px] text-[#9aa4c2] text-[13px] leading-[1.45]">
          The admin provided the following reason for rejecting your appeal:
        </p>

        <div className="border border-[rgba(240,107,107,0.25)] bg-[rgba(240,107,107,0.06)] rounded-[10px] px-[14px] py-3">
          <p className="m-0 text-[13px] leading-[1.6] text-[#d4d9ec] whitespace-pre-wrap">
            {note}
          </p>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="border border-[#2b324c] bg-[#151927] text-[#9aa4c2] rounded-[9px] px-4 py-2 text-[12px] font-bold cursor-pointer font-[inherit] transition-all duration-150 hover:text-[#e4e8f4] hover:border-[#3d4460] hover:bg-[#1a1f30]"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
