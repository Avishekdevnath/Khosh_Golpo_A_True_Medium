"use client";

import { useRouter } from "next/navigation";
import { Check, Clock, X } from "lucide-react";

import { avatarSeed, initials, relativeTime } from "@/lib/workspaceUtils";
import { toProfilePath } from "@/lib/profileRouting";
import type { MessageRequestOut } from "@/types/connection";

type Tab = "received" | "sent";
type CardAction = "idle" | "loading" | "done";

type RequestCardProps = {
  req: MessageRequestOut;
  tab: Tab;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onCancel: (id: string) => void;
  actionState: CardAction;
};

export default function RequestCard({
  req,
  tab,
  onAccept,
  onDecline,
  onCancel,
  actionState,
}: RequestCardProps) {
  const router = useRouter();
  const displayName = req.other_user_display_name ?? "Unknown User";
  const username    = req.other_user_username ?? "unknown";
  const userId      = req.other_user_id ?? (tab === "received" ? req.sender_id : req.recipient_id);
  const [av1, av2]  = avatarSeed(userId);
  const done = actionState === "done";
  const busy = actionState === "loading";

  return (
    <article className="flex items-start gap-4 rounded-xl border border-border bg-background px-5 py-4 transition-all duration-150 hover:bg-card-hover max-sm:flex-wrap">

      {/* Avatar */}
      <button
        type="button"
        className="shrink-0 border-none bg-transparent p-0 cursor-pointer"
        onClick={() => router.push(toProfilePath(userId))}
        aria-label={`View ${displayName}'s profile`}
      >
        <div
          className="flex size-[48px] items-center justify-center rounded-full text-[16px] font-bold text-white"
          style={{ background: `linear-gradient(135deg,${av1},${av2})` }}
        >
          {initials(displayName)}
        </div>
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <button
          type="button"
          className="border-none bg-transparent p-0 text-left text-[14px] font-semibold text-foreground transition-colors duration-150 hover:text-primary cursor-pointer font-sans mb-0.5"
          onClick={() => router.push(toProfilePath(userId))}
        >
          {displayName}
        </button>
        <div className="text-[12px] text-text-tertiary mb-1.5">@{username}</div>

        {req.message && (
          <p className="m-0 mb-1.5 text-[13px] italic leading-relaxed text-text-secondary">
            "{req.message}"
          </p>
        )}

        <div className="flex items-center gap-1 text-[11.5px] text-text-tertiary">
          <Clock size={11} />
          {relativeTime(req.created_at)}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-col items-end gap-1.5 max-sm:w-full max-sm:flex-row">
        {done ? (
          <span className="rounded-full bg-success/10 px-3 py-[5px] text-[12px] font-medium text-success border border-success/20">
            {tab === "received" ? "Accepted" : "Cancelled"}
          </span>
        ) : tab === "received" ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onAccept(req.id)}
              className="inline-flex min-w-[88px] items-center justify-center gap-1.5 rounded-full border-none bg-foreground px-4 py-[6px] text-[12px] font-medium text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-45 hover:enabled:opacity-80 font-sans"
            >
              <Check size={12} />
              {busy ? "…" : "Accept"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecline(req.id)}
              className="inline-flex min-w-[88px] items-center justify-center gap-1.5 rounded-full border border-border bg-transparent px-4 py-[6px] text-[12px] font-medium text-text-secondary transition-colors disabled:cursor-not-allowed disabled:opacity-45 hover:enabled:border-destructive/40 hover:enabled:text-destructive font-sans"
            >
              <X size={12} />
              {busy ? "…" : "Decline"}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => onCancel(req.id)}
            className="inline-flex min-w-[88px] items-center justify-center gap-1.5 rounded-full border border-border bg-transparent px-4 py-[6px] text-[12px] font-medium text-text-secondary transition-colors disabled:cursor-not-allowed disabled:opacity-45 hover:enabled:border-destructive/40 hover:enabled:text-destructive font-sans"
          >
            <X size={12} />
            {busy ? "…" : "Cancel"}
          </button>
        )}
      </div>
    </article>
  );
}

export type { Tab, CardAction };
