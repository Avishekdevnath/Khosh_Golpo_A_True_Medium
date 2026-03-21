"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AtSign, Bell, Check, ExternalLink, Info, Link2, Mail,
  MessageSquareReply, ShieldAlert, UserPlus, X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { type Notification } from "@/hooks/useNotifications";
import { toProfilePath } from "@/lib/profileRouting";
import { relativeTime } from "@/lib/workspaceUtils";
import { formatDate } from "./notifUtils";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ─── Type config ──────────────────────────────────────────────────────────────

type TypeCfg = { label: string; color: string; bgClass: string; borderClass: string; icon: React.ReactNode };

const TYPE_CONFIG: Record<Notification["type"], TypeCfg> = {
  reply:      { label: "Reply",      color: "#7c73f0", bgClass: "bg-[rgba(124,115,240,0.15)]", borderClass: "border-[rgba(124,115,240,0.3)]",  icon: <MessageSquareReply size={14} /> },
  mention:    { label: "Mention",    color: "#f0834a", bgClass: "bg-[rgba(240,131,74,0.15)]",  borderClass: "border-[rgba(240,131,74,0.3)]",   icon: <AtSign size={14} /> },
  moderation: { label: "Moderation", color: "#f06b6b", bgClass: "bg-[rgba(240,107,107,0.15)]", borderClass: "border-[rgba(240,107,107,0.3)]",  icon: <ShieldAlert size={14} /> },
  follow:     { label: "Follow",     color: "#7c73f0", bgClass: "bg-[rgba(124,115,240,0.15)]", borderClass: "border-[rgba(124,115,240,0.3)]",  icon: <UserPlus size={14} /> },
  connection: { label: "Connection", color: "#f0834a", bgClass: "bg-[rgba(240,131,74,0.15)]",  borderClass: "border-[rgba(240,131,74,0.3)]",   icon: <Link2 size={14} /> },
  message:    { label: "Message",    color: "#3dd68c", bgClass: "bg-[rgba(61,214,140,0.15)]",  borderClass: "border-[rgba(61,214,140,0.3)]",   icon: <Mail size={14} /> },
  system:     { label: "System",     color: "#3dd68c", bgClass: "bg-[rgba(61,214,140,0.15)]",  borderClass: "border-[rgba(61,214,140,0.3)]",   icon: <Bell size={14} /> },
};

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div className="flex gap-3 p-[14px_16px] border border-border rounded-xl bg-card">
      <Skeleton variant="rect" className="w-9 h-9 rounded-[10px] shrink-0" />
      <div className="flex flex-1 flex-col gap-[7px]">
        <Skeleton variant="text" className="w-[28%] h-[11px]" />
        <Skeleton variant="text" className="w-[80%] h-[13px]" />
        <Skeleton variant="text" className="w-[40%] h-[10px] opacity-60" />
      </div>
    </div>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type FollowRelationshipState = "loading" | "following" | "not_following";
type AppealState = "idle" | "loading" | "done";
type ConnectionActionState = "idle" | "loading" | "accepted" | "declined";

export type NotificationListHandlers = {
  markingId: string | null;
  markingAll: boolean;
  onMarkRead: (id: string) => void;
  onFollowBack: (actorId: string) => void;
  followBackMap: Record<string, "loading">;
  followRelationshipMap: Record<string, FollowRelationshipState>;
  onAppeal: (notificationId: string) => void;
  appealMap: Record<string, "loading" | "done">;
  onViewReason: (note: string) => void;
  connectionActionMap: Record<string, ConnectionActionState>;
  onConnectionAccept: (requestId: string, notifId: string) => void;
  onConnectionDecline: (requestId: string, notifId: string) => void;
};

// ─── NotificationRow ───────────────────────────────────────────────────────────

function NotificationRow({
  item,
  handlers,
}: {
  item: Notification;
  handlers: NotificationListHandlers;
}) {
  const router = useRouter();
  const {
    markingId, markingAll, onMarkRead, onFollowBack, followBackMap,
    followRelationshipMap, onAppeal, appealMap, onViewReason,
    connectionActionMap, onConnectionAccept, onConnectionDecline,
  } = handlers;

  const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.system;
  const isUnread = !item.is_read;
  const isFollowNotif = item.type === "follow" && item.actor_id;
  const isFollowedYou = isFollowNotif && item.message.includes("started following");
  const moderationAction = String(item.metadata?.moderation_action ?? "").toLowerCase();
  const isRemovedModeration =
    item.type === "moderation" &&
    (moderationAction === "removed" || item.message.toLowerCase().includes("removed"));
  const isAppealResult = item.type === "moderation" && moderationAction === "appeal_result";
  const appealStatus = item.metadata?.appeal_status ?? "none";
  const isRejectedAppeal = isAppealResult && appealStatus === "rejected";
  const adminNote = item.metadata?.admin_note as string | undefined;
  const appealState: AppealState = appealMap[item.id] ?? "idle";
  const canAppeal =
    isRemovedModeration &&
    (appealStatus === "none" || !appealStatus) &&
    item.metadata?.appealable !== false &&
    appealState !== "done";
  const followRelationshipState: FollowRelationshipState =
    item.actor_id ? (followRelationshipMap[item.actor_id] ?? "loading") : "not_following";
  const canShowFollowBack = isFollowedYou && followRelationshipState === "not_following";
  const followBackState: "idle" | "loading" =
    item.actor_id ? (followBackMap[item.actor_id] ? "loading" : "idle") : "idle";

  const incomingRequestId =
    item.type === "connection" &&
    item.metadata?.connection_action === "incoming_request" &&
    typeof item.metadata?.request_id === "string"
      ? (item.metadata.request_id as string)
      : null;

  const connActionState: ConnectionActionState = connectionActionMap[item.id] ?? "idle";

  const unreadShadow = isUnread
    ? { boxShadow: `inset 3px 0 0 ${cfg.color}` }
    : undefined;

  return (
    <div
      className={[
        "flex items-start gap-3 p-[14px_16px] border rounded-xl transition-[background,border-color] duration-150",
        isUnread
          ? "border-[#252b40] bg-gradient-to-b from-[#121624] to-[#101420]"
          : "border-border bg-gradient-to-b from-card to-[#0f1118]",
        "hover:bg-gradient-to-b hover:from-[#141828] hover:to-[#121622] hover:border-[#252b40]",
      ].join(" ")}
      style={unreadShadow}
    >
      {/* Icon */}
      <div
        className={`w-9 h-9 rounded-[10px] grid place-items-center shrink-0 mt-px border ${cfg.bgClass} ${cfg.borderClass}`}
        style={{ color: cfg.color }}
      >
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Meta row */}
        <div className="flex items-center flex-wrap gap-[6px] mb-1">
          <span className="text-[11px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
          <span className="text-[10px] text-[#3d4460]">·</span>
          <span
            className="text-[11px] text-text-tertiary"
            title={formatDate(item.created_at)}
          >
            {relativeTime(item.created_at)}
          </span>
          {isUnread && (
            <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-[#f0834a] bg-[rgba(240,131,74,0.12)] border border-[rgba(240,131,74,0.25)] rounded-full px-[7px] py-[1px]">
              New
            </span>
          )}
        </div>

        {/* Message */}
        <p className={`text-[13px] leading-[1.6] m-0 mb-[5px] ${isUnread ? "text-[#c4cbe0]" : "text-[#8990aa]"}`}>
          {item.message}
        </p>

        {/* Actions */}
        <div className="flex items-center flex-wrap gap-[10px]">

          {/* Open conversation */}
          {item.type === "message" && typeof item.metadata?.conversation_id === "string" && (
            <button
              type="button"
              className="border-none bg-none p-0 text-[11px] font-semibold font-[inherit] inline-flex items-center gap-1 cursor-pointer text-text-tertiary hover:text-[#b5bfd8] transition-colors duration-150"
              onClick={() => {
                if (isUnread) onMarkRead(item.id);
                router.push(`/messages/${item.metadata!.conversation_id}`);
              }}
            >
              <Mail size={11} />
              Open conversation
            </button>
          )}

          {/* Thread link */}
          {item.thread_id && !isRemovedModeration && !isRejectedAppeal && (
            <Link
              href={`/threads/${item.thread_id}`}
              className="text-[11px] font-semibold text-[#7c73f0] no-underline hover:text-[#9b8ef8] hover:underline transition-colors duration-150"
              onClick={() => { if (isUnread) onMarkRead(item.id); }}
            >
              Open thread →
            </Link>
          )}

          {/* View profile */}
          {item.actor_id && item.type !== "system" && item.type !== "moderation" && !isRemovedModeration && !isRejectedAppeal && (
            <button
              type="button"
              className="border-none bg-none p-0 text-[11px] font-semibold font-[inherit] inline-flex items-center gap-1 cursor-pointer text-text-tertiary hover:text-[#b5bfd8] transition-colors duration-150"
              onClick={() => {
                if (isUnread) onMarkRead(item.id);
                router.push(toProfilePath(item.actor_id!));
              }}
            >
              <ExternalLink size={11} />
              View profile
            </button>
          )}

          {/* Follow back */}
          {canShowFollowBack && (
            <button
              type="button"
              className="border-none bg-none p-0 text-[11px] font-semibold font-[inherit] inline-flex items-center gap-1 cursor-pointer text-[#7c73f0] hover:enabled:text-[#9b8ef8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              disabled={followBackState !== "idle"}
              onClick={() => onFollowBack(item.actor_id!)}
            >
              {followBackState === "loading"
                ? <><UserPlus size={11} /> Following...</>
                : <><UserPlus size={11} /> Follow back</>}
            </button>
          )}

          {/* Connection Accept / Decline */}
          {incomingRequestId && connActionState === "idle" && (
            <>
              <button
                type="button"
                className="border-none bg-none p-0 text-[11px] font-semibold font-[inherit] inline-flex items-center gap-1 cursor-pointer text-[#3dd68c] hover:text-[#6eedb0] transition-colors duration-150"
                onClick={() => onConnectionAccept(incomingRequestId, item.id)}
              >
                <Check size={11} /> Accept
              </button>
              <button
                type="button"
                className="border-none bg-none p-0 text-[11px] font-semibold font-[inherit] inline-flex items-center gap-1 cursor-pointer text-text-tertiary hover:text-[#9baac8] transition-colors duration-150"
                onClick={() => onConnectionDecline(incomingRequestId, item.id)}
              >
                <X size={11} /> Decline
              </button>
            </>
          )}
          {incomingRequestId && connActionState === "loading" && (
            <span className="text-[11px] text-text-tertiary">Updating…</span>
          )}
          {incomingRequestId && connActionState === "accepted" && (
            <span className="text-[11px] font-semibold rounded-full px-[10px] py-[2px] border border-[rgba(61,214,140,0.35)] bg-[rgba(61,214,140,0.16)] text-[#8ce6ba]">
              Connected
            </span>
          )}
          {incomingRequestId && connActionState === "declined" && (
            <span className="text-[11px] font-semibold rounded-full px-[10px] py-[2px] border border-[rgba(99,111,141,0.25)] bg-[rgba(99,111,141,0.1)] text-text-tertiary">
              Declined
            </span>
          )}

          {/* Appeal button */}
          {canAppeal && (
            <button
              type="button"
              className="border-none bg-none p-0 text-[11px] font-semibold font-[inherit] inline-flex items-center gap-1 cursor-pointer text-[#f0834a] hover:enabled:text-[#ff9e70] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              disabled={appealState !== "idle"}
              onClick={() => onAppeal(item.id)}
            >
              {appealState === "loading" ? "Submitting appeal..." : "Appeal"}
            </button>
          )}

          {/* Appeal status badge */}
          {isRemovedModeration && !canAppeal && (
            <>
              <span className={[
                "text-[11px] font-semibold rounded-full px-[10px] py-[2px] border",
                appealStatus === "pending" || appealState === "done"
                  ? "text-[#f6c5ab] border-[rgba(240,131,74,0.35)] bg-[rgba(240,131,74,0.16)]"
                  : appealStatus === "approved"
                    ? "text-[#8ce6ba] border-[rgba(61,214,140,0.35)] bg-[rgba(61,214,140,0.16)]"
                    : appealStatus === "rejected"
                      ? "text-[#f6b0b0] border-[rgba(240,107,107,0.35)] bg-[rgba(240,107,107,0.16)]"
                      : "text-[#aeb8d7] border-[rgba(149,163,198,0.28)] bg-[rgba(149,163,198,0.14)]",
              ].join(" ")}>
                {appealStatus === "pending" || appealState === "done"
                  ? "Appeal pending review"
                  : appealStatus === "approved"
                    ? "Appeal approved"
                    : appealStatus === "rejected"
                      ? "Appeal rejected"
                      : "Removed by moderation"}
              </span>
              {appealStatus === "rejected" && adminNote && (
                <button
                  type="button"
                  className="border-none bg-none p-0 text-[11px] font-semibold font-[inherit] inline-flex items-center gap-1 cursor-pointer text-[#f06b6b] hover:text-[#f6b0b0] transition-colors duration-150"
                  onClick={() => onViewReason(adminNote)}
                >
                  <Info size={11} /> View reason
                </button>
              )}
            </>
          )}

          {/* Rejected appeal result */}
          {isRejectedAppeal && (
            <>
              <span className="text-[11px] font-semibold rounded-full px-[10px] py-[2px] border text-[#f6b0b0] border-[rgba(240,107,107,0.35)] bg-[rgba(240,107,107,0.16)]">
                Appeal rejected
              </span>
              {adminNote && (
                <button
                  type="button"
                  className="border-none bg-none p-0 text-[11px] font-semibold font-[inherit] inline-flex items-center gap-1 cursor-pointer text-[#f06b6b] hover:text-[#f6b0b0] transition-colors duration-150"
                  onClick={() => onViewReason(adminNote)}
                >
                  <Info size={11} /> View reason
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mark read button */}
      {isUnread && (
        <button
          type="button"
          className="border border-[#252b40] bg-[#151927] text-text-tertiary rounded-[7px] px-[10px] py-[5px] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 font-[inherit] transition-all duration-150 hover:enabled:text-[#3dd68c] hover:enabled:border-[rgba(61,214,140,0.4)] hover:enabled:bg-[rgba(61,214,140,0.08)] disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={markingId === item.id || markingAll}
          onClick={() => onMarkRead(item.id)}
          title="Mark as read"
        >
          <Check size={12} />
          <span>Read</span>
        </button>
      )}
    </div>
  );
}

// ─── NotificationList ──────────────────────────────────────────────────────────

export type NotificationListProps = {
  notifications: Notification[];
  isLoading: boolean;
  statusFilter: string;
  currentPage: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
  onPrev: () => void;
  onNext: () => void;
  handlers: NotificationListHandlers;
};

export function NotificationList({
  notifications,
  isLoading,
  statusFilter,
  currentPage,
  totalPages,
  total,
  hasMore,
  onPrev,
  onNext,
  handlers,
}: NotificationListProps) {
  const grouped = {
    unread: notifications.filter(n => !n.is_read),
    read: notifications.filter(n => n.is_read),
  };

  if (isLoading && notifications.length === 0) {
    return (
      <div className="flex flex-col gap-[7px]">
        {Array.from({ length: 5 }, (_, i) => <NotificationSkeleton key={i} />)}
      </div>
    );
  }

  if (!isLoading && notifications.length === 0) {
    return (
      <EmptyState
        icon={<Bell strokeWidth={1.2} />}
        title="No notifications yet"
        description={
          statusFilter !== "all"
            ? "No notifications match this filter."
            : "Replies, mentions, follows, and more will appear here."
        }
        className="border border-dashed border-[#252d47] rounded-2xl mt-2"
      />
    );
  }

  return (
    <div className="pb-5">
      {/* Grouped (unread / read) when on "all" status tab */}
      {statusFilter === "all" ? (
        <>
          {grouped.unread.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#545c7a] mb-2 px-0.5">
                <span className="w-[6px] h-[6px] rounded-full bg-[#f0834a] shrink-0" />
                Unread
              </div>
              <div className="flex flex-col gap-[7px]">
                {grouped.unread.map(item => (
                  <NotificationRow key={item.id} item={item} handlers={handlers} />
                ))}
              </div>
            </div>
          )}
          {grouped.read.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#545c7a] mb-2 px-0.5">
                <span className="w-[6px] h-[6px] rounded-full bg-[#3d4460] shrink-0" />
                Earlier
              </div>
              <div className="flex flex-col gap-[7px]">
                {grouped.read.map(item => (
                  <NotificationRow key={item.id} item={item} handlers={handlers} />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-[7px] mb-5">
          {notifications.map(item => (
            <NotificationRow key={item.id} item={item} handlers={handlers} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-border mt-2">
        <span className="text-[11px] text-text-tertiary">
          Page {currentPage}{totalPages > 1 ? ` of ${totalPages}` : ""} · {total} total
        </span>
        <div className="flex gap-[6px]">
          <button
            type="button"
            className="border border-[#252b40] bg-[#151927] text-text-tertiary rounded-lg px-3 py-[6px] text-[12px] font-semibold inline-flex items-center gap-1 cursor-pointer font-[inherit] transition-all duration-150 hover:enabled:text-[#c4cbe0] hover:enabled:border-[#2d3450] hover:enabled:bg-[#1a1f30] disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={currentPage <= 1 || isLoading}
            onClick={onPrev}
          >
            <ChevronLeft size={13} /> Prev
          </button>
          <button
            type="button"
            className="border border-[#252b40] bg-[#151927] text-text-tertiary rounded-lg px-3 py-[6px] text-[12px] font-semibold inline-flex items-center gap-1 cursor-pointer font-[inherit] transition-all duration-150 hover:enabled:text-[#c4cbe0] hover:enabled:border-[#2d3450] hover:enabled:bg-[#1a1f30] disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!hasMore || isLoading}
            onClick={onNext}
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
