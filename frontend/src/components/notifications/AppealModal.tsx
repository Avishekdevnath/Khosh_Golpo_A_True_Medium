import { useEffect, useState } from "react";
import { X } from "lucide-react";

type AppealModalProps = {
  loading: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
};

const DEFAULT_REASON = "Please review this moderation decision.";
const MIN_REASON_LENGTH = 5;
const MAX_REASON_LENGTH = 500;

export default function AppealModal({ loading, onClose, onSubmit }: AppealModalProps) {
  const [reason, setReason] = useState(DEFAULT_REASON);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loading, onClose]);

  const trimmedReason = reason.trim();
  const tooShort = trimmedReason.length < MIN_REASON_LENGTH;
  const tooLong = trimmedReason.length > MAX_REASON_LENGTH;

  async function handleSubmit() {
    if (loading) return;
    if (tooShort) {
      setError(`Reason must be at least ${MIN_REASON_LENGTH} characters.`);
      return;
    }
    if (tooLong) {
      setError(`Reason must be at most ${MAX_REASON_LENGTH} characters.`);
      return;
    }

    setError(null);
    try {
      await onSubmit(trimmedReason);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit appeal.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/55 backdrop-blur-[4px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="appeal-modal-title"
      onClick={event => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="w-[min(560px,100%)] border border-border rounded-[14px] bg-card text-foreground p-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
        onClick={event => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-[10px] mb-2">
          <h3
            id="appeal-modal-title"
            className="m-0 font-serif text-[20px] leading-[1.1]"
          >
            Submit appeal
          </h3>
          <button
            type="button"
            className="border border-border bg-background text-foreground/60 rounded-lg w-[30px] h-[30px] grid place-items-center cursor-pointer hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onClose}
            disabled={loading}
            aria-label="Close appeal modal"
          >
            <X size={16} />
          </button>
        </div>

        <p className="m-0 mb-3 text-foreground/70 text-[13px] leading-[1.45]">
          Explain why this moderation decision should be reviewed.
        </p>

        <label
          htmlFor="appeal-reason"
          className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-foreground/60"
        >
          Reason
        </label>
        <textarea
          id="appeal-reason"
          value={reason}
          onChange={event => setReason(event.target.value)}
          maxLength={MAX_REASON_LENGTH}
          disabled={loading}
          rows={5}
          placeholder="Write your appeal reason..."
          className="w-full resize-y min-h-[110px] border border-border bg-background text-foreground rounded-[10px] px-3 py-2.5 text-[13px] leading-[1.5] outline-none font-[inherit] focus:border-primary disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
        />

        <div className="mt-2 flex min-h-[18px] items-center justify-between gap-[10px]">
          <span className={`text-[11px] ${tooLong ? "text-destructive" : "text-foreground/50"}`}>
            {trimmedReason.length}/{MAX_REASON_LENGTH}
          </span>
          {error && <span className="text-[12px] text-destructive text-right">{error}</span>}
        </div>

        <div className="mt-3.5 flex justify-end gap-2">
          <button
            type="button"
            className="border border-border bg-background text-foreground/70 rounded-[9px] px-[13px] py-2 text-[12px] font-bold cursor-pointer hover:text-foreground hover:border-border/80 hover:bg-card-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="border border-transparent bg-primary text-white rounded-[9px] px-[13px] py-2 text-[12px] font-bold cursor-pointer hover:opacity-[0.88] transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => void handleSubmit()}
            disabled={loading || tooShort || tooLong}
          >
            {loading ? "Submitting..." : "Submit appeal"}
          </button>
        </div>
      </div>
    </div>
  );
}
