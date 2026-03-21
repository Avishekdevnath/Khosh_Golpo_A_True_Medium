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

  const btnBase =
    "inline-flex min-w-[90px] items-center justify-center gap-1.5 rounded-lg px-3.5 py-[7px] text-xs font-bold whitespace-nowrap transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-45 font-sans";

  return (
    <article className="flex items-start gap-3.5 rounded-[14px] border border-app-border bg-gradient-to-b from-[#111422] to-[#0f1118] px-[18px] py-4 transition-colors duration-150 hover:border-[#252b40] max-sm:flex-wrap">

      {/* Avatar */}
      <button
        type="button"
        className="shrink-0 border-none bg-transparent p-0 cursor-pointer"
        onClick={() => router.push(toProfilePath(userId))}
        aria-label={`View ${displayName}'s profile`}
      >
        <div
          className="grid h-[52px] w-[52px] place-items-center rounded-[14px] text-[17px] font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,0.3)]"
          style={{ background: `linear-gradient(135deg,${av1},${av2})` }}
        >
          {initials(displayName)}
        </div>
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0 grid gap-0.5">
        <button
          type="button"
          className="border-none bg-transparent p-0 text-left text-[15px] font-bold text-[#dde2f2] transition-colors duration-150 hover:text-accent-orange cursor-pointer font-sans"
          onClick={() => router.push(toProfilePath(userId))}
        >
          {displayName}
        </button>
        <div className="text-xs text-[#505a72]">@{username}</div>
        {req.message && (
          <p className="mt-1 text-xs italic leading-relaxed text-[#8a93ae]">"{req.message}"</p>
        )}
        <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#3d4460]">
          <Clock size={11} />
          {relativeTime(req.created_at)}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-col items-end gap-1.5 max-sm:w-full max-sm:flex-row">
        {done ? (
          <span className="rounded-full border border-green-400/25 bg-green-400/10 px-2.5 py-[3px] text-[11px] font-bold text-green-400">
            {tab === "received" ? "Accepted" : "Cancelled"}
          </span>
        ) : tab === "received" ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onAccept(req.id)}
              className={`${btnBase} border-none bg-gradient-to-br from-[#3dd68c] to-[#29b472] text-white hover:enabled:opacity-88`}
            >
              <Check size={13} />
              {busy ? "…" : "Accept"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecline(req.id)}
              className={`${btnBase} border border-[#252b40] bg-app-input text-[#636f8d] hover:enabled:border-red-400/40 hover:enabled:text-red-400`}
            >
              <X size={13} />
              {busy ? "…" : "Decline"}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => onCancel(req.id)}
            className={`${btnBase} border border-[#252b40] bg-app-input text-[#636f8d] hover:enabled:border-red-400/40 hover:enabled:text-red-400`}
          >
            <X size={13} />
            {busy ? "…" : "Cancel"}
          </button>
        )}
      </div>
    </article>
  );
}

export type { Tab, CardAction };
