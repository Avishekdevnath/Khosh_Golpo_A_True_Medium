"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import PageLoader from "@/components/shared/PageLoader";
import WorkspaceShell from "@/components/app/WorkspaceShell";
import { TabBar } from "@/components/ui/tab-bar";
import { FilterChips } from "@/components/ui/filter-chips";
import { useToast } from "@/components/ui/toast";
import { useNotifications } from "@/hooks/useNotifications";
import { apiPost } from "@/lib/api";
import { followUser, getFollowStatus } from "@/lib/followApi";
import { acceptMessageRequest, rejectMessageRequest } from "@/lib/connectionApi";
import AppealModal from "@/components/notifications/AppealModal";
import RejectionReasonModal from "@/components/notifications/RejectionReasonModal";
import { NotificationList, type NotificationListHandlers } from "@/components/notifications/NotificationList";

// ─── Filter config ─────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: "all",    label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read",   label: "Read" },
];

const TYPE_CHIPS = [
  { value: "all",        label: "All" },
  { value: "reply",      label: "Replies" },
  { value: "mention",    label: "Mentions" },
  { value: "follow",     label: "Follows" },
  { value: "connection", label: "Connections" },
  { value: "message",    label: "Messages" },
  { value: "moderation", label: "Moderation" },
  { value: "system",     label: "System" },
];

type TypeFilter   = "all" | "reply" | "mention" | "follow" | "connection" | "message" | "moderation" | "system";
type StatusFilter = "all" | "unread" | "read";
type FollowRelationshipState = "loading" | "following" | "not_following";
type ConnectionActionState = "idle" | "loading" | "accepted" | "declined";

// ─── Component ─────────────────────────────────────────────────────────────────

export default function NotificationsWorkspace() {
  const { toast } = useToast();

  // Hydration guard
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Filter + pagination state
  const [page, setPage]               = useState(1);
  const [typeFilter, setTypeFilter]   = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  useEffect(() => { setPage(1); }, [typeFilter, statusFilter]);

  // Action state
  const [markingId, setMarkingId]     = useState<string | null>(null);
  const [markingAll, setMarkingAll]   = useState(false);
  const [followBackMap, setFollowBackMap] = useState<Record<string, "loading">>({});
  const [followRelationshipMap, setFollowRelationshipMap] = useState<Record<string, FollowRelationshipState>>({});
  const [appealMap, setAppealMap]     = useState<Record<string, "loading" | "done">>({});
  const [appealTargetId, setAppealTargetId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState<string | null>(null);
  const [connectionActionMap, setConnectionActionMap] = useState<Record<string, ConnectionActionState>>({});

  const apiTypeFilter   = typeFilter   === "all" ? undefined : typeFilter;
  const apiIsReadFilter = statusFilter === "all" ? undefined : statusFilter === "read";

  const {
    notifications, limit, page: currentPage, total,
    unreadCount, isLoading, error, hasMore, mutate, markAsRead, markAllAsRead,
  } = useNotifications({ page, limit: 20, type: apiTypeFilter, isRead: apiIsReadFilter });

  // Pre-fetch follow relationship for "started following you" notifications
  useEffect(() => {
    const actorIds = Array.from(new Set(
      notifications
        .filter(n => n.type === "follow" && Boolean(n.actor_id) && n.message.includes("started following"))
        .map(n => n.actor_id!)
    )).filter(id => !followRelationshipMap[id]);

    if (actorIds.length === 0) return;
    let cancelled = false;

    setFollowRelationshipMap(prev => {
      const next = { ...prev };
      for (const id of actorIds) next[id] = "loading";
      return next;
    });

    void Promise.all(actorIds.map(async id => {
      try {
        const s = await getFollowStatus(id);
        return { id, state: s.is_following ? "following" : "not_following" } as const;
      } catch {
        return { id, state: "not_following" as const };
      }
    })).then(results => {
      if (cancelled) return;
      setFollowRelationshipMap(prev => {
        const next = { ...prev };
        for (const { id, state } of results) next[id] = state;
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [notifications, followRelationshipMap]);

  // Handlers
  async function handleMarkRead(id: string) {
    setMarkingId(id);
    try { await markAsRead(id); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to mark as read"); }
    finally   { setMarkingId(null); }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try { await markAllAsRead(); toast.success("All notifications marked as read"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to mark all as read"); }
    finally   { setMarkingAll(false); }
  }

  async function handleFollowBack(actorId: string) {
    setFollowBackMap(prev => ({ ...prev, [actorId]: "loading" }));
    try {
      await followUser(actorId);
      setFollowBackMap(prev => { const n = { ...prev }; delete n[actorId]; return n; });
      setFollowRelationshipMap(prev => ({ ...prev, [actorId]: "following" }));
      toast.success("Followed back!");
    } catch {
      setFollowBackMap(prev => { const n = { ...prev }; delete n[actorId]; return n; });
      toast.error("Failed to follow back");
    }
  }

  async function handleConnectionAccept(requestId: string, notifId: string) {
    setConnectionActionMap(prev => ({ ...prev, [notifId]: "loading" }));
    try {
      await acceptMessageRequest(requestId);
      setConnectionActionMap(prev => ({ ...prev, [notifId]: "accepted" }));
      if (!notifications.find(n => n.id === notifId)?.is_read) await markAsRead(notifId);
      toast.success("Connection accepted!");
    } catch {
      setConnectionActionMap(prev => ({ ...prev, [notifId]: "idle" }));
      toast.error("Failed to accept connection");
    }
  }

  async function handleConnectionDecline(requestId: string, notifId: string) {
    setConnectionActionMap(prev => ({ ...prev, [notifId]: "loading" }));
    try {
      await rejectMessageRequest(requestId);
      setConnectionActionMap(prev => ({ ...prev, [notifId]: "declined" }));
      if (!notifications.find(n => n.id === notifId)?.is_read) await markAsRead(notifId);
      toast.success("Connection request declined");
    } catch {
      setConnectionActionMap(prev => ({ ...prev, [notifId]: "idle" }));
      toast.error("Failed to decline connection");
    }
  }

  async function handleAppealSubmit(reason: string) {
    const notificationId = appealTargetId;
    if (!notificationId) throw new Error("Appeal target is missing");
    setAppealMap(prev => ({ ...prev, [notificationId]: "loading" }));
    try {
      await apiPost(`notifications/${notificationId}/appeal`, { reason });
      setAppealMap(prev => ({ ...prev, [notificationId]: "done" }));
      setAppealTargetId(null);
      await mutate();
      toast.success("Appeal submitted. Admin will review it.");
    } catch (e) {
      setAppealMap(prev => { const n = { ...prev }; delete n[notificationId]; return n; });
      throw (e instanceof Error ? e : new Error("Failed to submit appeal"));
    }
  }

  const totalPages = Math.ceil(total / Math.max(1, limit));
  const appealModalLoading = Boolean(appealTargetId && appealMap[appealTargetId] === "loading");

  const errorMessage = useMemo(() => {
    if (!error) return null;
    return error instanceof Error ? error.message : "Failed to load notifications";
  }, [error]);

  const handlers: NotificationListHandlers = {
    markingId, markingAll,
    onMarkRead: handleMarkRead,
    onFollowBack: handleFollowBack,
    followBackMap,
    followRelationshipMap,
    onAppeal: setAppealTargetId,
    appealMap,
    onViewReason: setRejectionNote,
    connectionActionMap,
    onConnectionAccept: handleConnectionAccept,
    onConnectionDecline: handleConnectionDecline,
  };

  if (!mounted || (isLoading && notifications.length === 0)) {
    return <PageLoader />;
  }

  return (
    <>
      <WorkspaceShell wrapPanel={false}>
        <section className="relative flex flex-col p-5 pb-0 md:p-6 md:pb-0 flex-1 min-h-0">

          {/* Page header */}
          <div className="flex items-start justify-between gap-4 mb-[18px] flex-wrap shrink-0">
            <div>
              <span className="block text-[10px] font-bold tracking-[0.1em] uppercase text-primary mb-1">
                Inbox
              </span>
              <h1 className="font-serif text-[28px] leading-[1.1] m-0 mb-[5px] text-foreground">
                Notifications
              </h1>
              <p className="text-[12px] text-text-tertiary m-0">
                Replies, mentions, follows, messages, connections, and moderation updates.
              </p>
            </div>
            <div className="flex items-center gap-[10px] shrink-0 pt-1">
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold text-primary bg-accent-muted border border-primary/25 rounded-full px-[10px] py-[3px]">
                  {unreadCount} unread
                </span>
              )}
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="border-none bg-primary text-white rounded-[9px] px-[13px] py-[7px] text-[12px] font-bold inline-flex items-center gap-[5px] cursor-pointer whitespace-nowrap shadow-[0_4px_14px_rgba(14,165,233,0.3)] font-[inherit] transition-opacity duration-150 hover:enabled:opacity-[0.88] disabled:opacity-45 disabled:cursor-not-allowed"
                  disabled={markingAll || isLoading}
                  onClick={handleMarkAllRead}
                >
                  <CheckCheck size={13} />
                  {markingAll ? "Marking…" : "Mark all read"}
                </button>
              )}
            </div>
          </div>

          {/* Status tab bar */}
          <TabBar
            tabs={STATUS_TABS}
            activeTab={statusFilter}
            onChange={v => setStatusFilter(v as StatusFilter)}
            className="mb-3 shrink-0"
          />

          {/* Type filter chips */}
          <FilterChips
            items={TYPE_CHIPS}
            value={typeFilter}
            onChange={v => setTypeFilter(v as TypeFilter)}
            aria-label="Filter by notification type"
            className="mb-4 shrink-0"
          />

          {/* Error banner */}
          {errorMessage && (
            <div className="border border-[rgba(240,107,107,0.35)] bg-[rgba(240,107,107,0.1)] text-[#fca5a5] rounded-[10px] px-[14px] py-[10px] text-[13px] mb-[14px] shrink-0">
              {errorMessage}
            </div>
          )}

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto pr-0.5 ws-scroll">
            <NotificationList
              notifications={notifications}
              isLoading={!mounted || isLoading}
              statusFilter={statusFilter}
              currentPage={currentPage}
              totalPages={totalPages}
              total={total}
              hasMore={hasMore}
              onPrev={() => setPage(p => Math.max(1, p - 1))}
              onNext={() => setPage(p => p + 1)}
              handlers={handlers}
            />
          </div>

        </section>
      </WorkspaceShell>

      {/* Modals */}
      {rejectionNote && (
        <RejectionReasonModal note={rejectionNote} onClose={() => setRejectionNote(null)} />
      )}
      {appealTargetId && (
        <AppealModal
          loading={appealModalLoading}
          onClose={() => { if (!appealModalLoading) setAppealTargetId(null); }}
          onSubmit={handleAppealSubmit}
        />
      )}
    </>
  );
}
