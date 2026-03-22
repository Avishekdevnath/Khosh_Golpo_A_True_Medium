"use client";

import { useEffect, useRef, useState } from "react";
import { Flag, Loader2, X } from "lucide-react";

type ReportReason = "spam" | "harassment" | "misinformation" | "nsfw" | "other";

const REASONS: { value: ReportReason; label: string; desc: string }[] = [
  { value: "spam", label: "Spam", desc: "Repetitive, promotional, or unsolicited content" },
  { value: "harassment", label: "Harassment", desc: "Personal attacks, threats, or targeted abuse" },
  { value: "misinformation", label: "Misinformation", desc: "Demonstrably false or misleading claims" },
  { value: "nsfw", label: "NSFW", desc: "Inappropriate or explicit content" },
  { value: "other", label: "Other", desc: "Something else not listed above" },
];

type Props = {
  targetType: "thread" | "post";
  onClose: () => void;
  onSubmit: (reason: ReportReason, detail: string) => Promise<void>;
};

export default function ReportModal({ targetType, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState<ReportReason>("spam");
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSubmit(reason, detail);
      setDone(true);
      setTimeout(onClose, 1600);
    } catch {
      setError("Failed to submit report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-content bg-black/75 backdrop-blur-[2px] animate-[fadeIn_0.15s_ease]"
      role="presentation"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ justifyContent: "center" }}
    >
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideIn{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div
        className="w-full max-w-[460px] mx-4 rounded-[16px] border border-border bg-card text-foreground shadow-[0_24px_60px_rgba(0,0,0,0.5)] outline-none"
        style={{ animation: "slideIn 0.15s ease" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3.5 pt-[18px] border-b border-border">
          <div className="flex items-center gap-2 text-[15px] font-bold text-foreground" id="report-title">
            <Flag size={15} />
            Report {targetType === "thread" ? "Thread" : "Post"}
          </div>
          <button
            type="button"
            className="flex items-center rounded-[6px] p-1 text-foreground/50 hover:text-foreground hover:bg-card-hover transition-colors cursor-pointer border-none bg-transparent"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 px-5 py-9">
            <div className="grid h-12 w-12 place-items-center rounded-full border border-[#3dd68c]/30 bg-[#3dd68c]/[0.12] text-[22px] text-[#3dd68c]">
              ✓
            </div>
            <div className="text-center text-[13px] text-foreground/60 max-w-[280px]">
              Report submitted. Our moderation team will review it.
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 px-5 py-[18px]">
              <div className="text-[12px] font-semibold text-foreground/60">
                Why are you reporting this {targetType}?
              </div>
              <div className="flex flex-col gap-1">
                {REASONS.map(r => (
                  <label
                    key={r.value}
                    className={[
                      "flex cursor-pointer items-start gap-2.5 rounded-[10px] border px-3 py-2.5 transition-all duration-[120ms]",
                      reason === r.value
                        ? "border-[var(--accent-orange)]/50 bg-[var(--accent-orange)]/[0.06]"
                        : "border-border bg-background hover:border-border/80 hover:bg-card-hover",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="mt-0.5 shrink-0 accent-[var(--accent-orange)]"
                    />
                    <div className="flex flex-col gap-px">
                      <span className="text-[13px] font-semibold text-foreground">{r.label}</span>
                      <span className="text-[11px] text-foreground/50">{r.desc}</span>
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-3.5 text-[12px] font-semibold text-foreground/60">
                Additional details <span className="font-normal text-foreground/40">(optional)</span>
              </div>
              <textarea
                className="w-full resize-none rounded-[10px] border border-border bg-background px-3 py-2.5 text-[13px] text-foreground outline-none font-[inherit] focus:border-primary transition-colors"
                rows={3}
                maxLength={500}
                placeholder="Describe the issue in more detail…"
                value={detail}
                onChange={e => setDetail(e.target.value)}
              />
              <div className="text-right text-[11px] text-foreground/40 -mt-1">{detail.length}/500</div>

              {error && (
                <div className="rounded-[8px] border border-destructive/25 bg-destructive/[0.10] px-3 py-2.5 text-[12px] text-destructive">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-5 pb-[18px] pt-3.5">
              <button
                type="button"
                className="rounded-[8px] border border-border bg-transparent px-4 py-2 text-[13px] text-foreground/60 cursor-pointer hover:border-border/80 hover:text-foreground transition-colors"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-[8px] border-none bg-[var(--accent-orange)] px-[18px] py-2 text-[13px] font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-55 disabled:cursor-not-allowed"
                onClick={() => void handleSubmit()}
                disabled={loading}
              >
                {loading
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Flag size={13} />
                }
                Submit Report
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
