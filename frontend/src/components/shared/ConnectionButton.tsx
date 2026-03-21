"use client";

import { useRouter } from "next/navigation";
import { Check, Clock, MessageSquare, ShieldBan, UserPlus, X } from "lucide-react";

import { useConnection } from "@/hooks/useConnection";
import type { ConnectionStatusResponse } from "@/types/connection";

interface ConnectionButtonProps {
  userId: string;
  initialStatus?: ConnectionStatusResponse | null;
  skipStatusFetch?: boolean;
  onConnectionChange?: (status: ConnectionStatusResponse) => void;
}

export default function ConnectionButton({
  userId,
  initialStatus,
  skipStatusFetch = false,
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

  // Derive state variant
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
    pending:   "border-border bg-card-hover text-text-secondary hover:border-foreground hover:text-foreground",
    accept:    "border-[#16a34a]/40 bg-[#16a34a]/10 text-[#16a34a] hover:bg-[#16a34a]/20",
    connected: "border-border bg-card-hover text-text-secondary cursor-default",
    message:   "border-[#16a34a]/40 bg-[#16a34a]/10 text-[#16a34a] hover:bg-[#16a34a]/20",
    blocked:   "border-border bg-background text-text-tertiary opacity-40 cursor-not-allowed",
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={disabled}
      title={title}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors cursor-pointer font-sans",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClass[variant],
      ].join(" ")}
    >
      <Icon size={13} />
      <span>{statusLoading ? "…" : label}</span>
    </button>
  );
}
