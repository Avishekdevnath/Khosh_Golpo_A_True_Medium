"use client";

import { useEffect, useState } from "react";
import { ShieldX } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { AdminAppealItem } from "@/types/admin";

type AppealRejectModalProps = {
  appeal: AdminAppealItem;
  loading: boolean;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void>;
};

const MAX_NOTE_LENGTH = 500;

export default function AppealRejectModal({ appeal, loading, onClose, onSubmit }: AppealRejectModalProps) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const trimmedNote = note.trim();
  const tooLong = trimmedNote.length > MAX_NOTE_LENGTH;
  const targetLabel = `${appeal.content_type} ${appeal.content_id.slice(-8)}`;

  async function handleSubmit() {
    if (loading || tooLong) return;
    setError(null);
    try {
      await onSubmit(trimmedNote);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject appeal.");
    }
  }

  return (
    <Modal
      open
      onClose={!loading ? onClose : () => {}}
      title="Reject appeal"
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void handleSubmit()}
            disabled={loading || tooLong}
          >
            {loading && <Spinner size="sm" />}
            {loading ? "Rejecting..." : "Reject appeal"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-accent-red">
          <ShieldX size={16} />
          <span className="text-sm font-medium">Rejecting appeal for {targetLabel}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Add an optional note for context.
        </p>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="appeal-reject-note"
            className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
          >
            Optional rejection note
          </label>
          <textarea
            id="appeal-reject-note"
            value={note}
            onChange={e => setNote(e.target.value)}
            maxLength={MAX_NOTE_LENGTH}
            rows={5}
            disabled={loading}
            placeholder="Write a short rejection note (optional)"
            className="w-full resize-y rounded-[10px] border border-app-border bg-app-input px-3 py-2.5 text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent-orange disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
        <div className="flex min-h-[18px] items-center justify-between gap-2.5">
          <span className={`text-[11px] ${tooLong ? "text-accent-red" : "text-muted-foreground"}`}>
            {trimmedNote.length}/{MAX_NOTE_LENGTH}
          </span>
          {error && <span className="text-right text-xs text-accent-red">{error}</span>}
        </div>
      </div>
    </Modal>
  );
}
