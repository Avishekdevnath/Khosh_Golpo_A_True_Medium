"use client";

import { useRouter } from "next/navigation";
import { Check, Clock, MessageSquare, ShieldBan, UserPlus, X } from "lucide-react";

import { useConnection } from "@/hooks/useConnection";
import type { ConnectionStatusResponse } from "@/types/connection";

interface ConnectionButtonProps {
  userId: string;
  initialStatus?: ConnectionStatusResponse | null;
  skipStatusFetch?: boolean;
  iconOnly?: boolean;
  onConnectionChange?: (status: ConnectionStatusResponse) => void;
}

export default function ConnectionButton({
  userId,
  initialStatus,
  skipStatusFetch = false,
  iconOnly = false,
  onConnectionChange,
}: ConnectionButtonProps) {
  const router = useRouter();
  const {
    isConnected: connectedState,
    hasPendingRequest: pendingState,
    isRequester: requesterState,
    pendingRequestId: requestIdState,
    canMessage: messageState,
    blockedByMe: blockedByMeState,
    blockedYou: blockedYouState,
    loading: statusLoading,
    sendRequest: sendConnectionRequest,
    acceptRequest: acceptConnectionRequest,
    cancelRequest: cancelConnectionRequest,
  } = useConnection(userId, { initialStatus, skipInitialLoad: skipStatusFetch });

  const handleClick = async () => {
    if (messageState) {
      router.push(`/messages?start=${encodeURIComponent(userId)}`);
      return;
    }
    if (pendingState && requesterState && requestIdState) {
      const nextStatus = await cancelConnectionRequest(requestIdState);
      if (nextStatus) onConnectionChange?.(nextStatus);
      return;
    }
    if (pendingState && !requesterState && requestIdState) {
      const nextStatus = await acceptConnectionRequest(requestIdState);
      if (nextStatus) onConnectionChange?.(nextStatus);
      return;
    }
    const nextStatus = await sendConnectionRequest();
    if (nextStatus) onConnectionChange?.(nextStatus);
  };

  type Variant = "connect" | "pending" | "accept" | "connected" | "message" | "blocked";
  let variant: Variant = "connect";
  let label = "Connect";
  let Icon = UserPlus;
  let title = "Send connection request";
  let disabled = statusLoading || (connectedState && !messageState);

  if (blockedByMeState || blockedYouState) {
    variant = "blocked";
    label = blockedByMeState ? "Blocked" : "Cannot connect";
    Icon = ShieldBan;
    title = blockedByMeState ? "You blocked this user" : "This user blocked you";
    disabled = true;
  } else if (messageState) {
    variant = "message";
    label = "Message";
    Icon = MessageSquare;
    title = "Open direct messages";
    disabled = statusLoading;
  } else if (connectedState) {
    variant = "connected";
    label = "Connected";
    Icon = MessageSquare;
    title = "Connected";
    disabled = true;
  } else if (pendingState && !requesterState) {
    variant = "accept";
    label = "Accept";
    Icon = Check;
    title = "Accept connection request";
    disabled = statusLoading;
  } else if (pendingState && requesterState) {
    variant = "pending";
    label = "Pending";
    Icon = Clock;
    title = "Cancel connection request";
    disabled = statusLoading;
  }

  const variantClass: Record<Variant, string> = {
    connect:   "border-primary bg-primary text-white hover:opacity-90",
    pending:   "border-border bg-card-hover text-foreground/60 hover:border-foreground hover:text-foreground",
    accept:    "border-[#16a34a]/40 bg-[#16a34a]/10 text-[#16a34a] hover:bg-[#16a34a]/20",
    connected: "border-border bg-card-hover text-foreground/60 cursor-default",
    message:   "border-[#16a34a]/40 bg-[#16a34a]/10 text-[#16a34a] hover:bg-[#16a34a]/20",
    blocked:   "border-border bg-background text-foreground/40 opacity-40 cursor-not-allowed",
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={[
        "inline-flex items-center justify-center gap-1.5 rounded-full border transition-colors cursor-pointer font-sans",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        iconOnly
          ? "size-9 shrink-0 p-0"
          : "px-4 py-1.5 text-[13px] font-medium",
        variantClass[variant],
      ].join(" ")}
    >
      <Icon size={iconOnly ? 15 : 13} />
      {!iconOnly && <span>{statusLoading ? "…" : label}</span>}
    </button>
  );
}
