"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import PageLoader from "@/components/shared/PageLoader";
import ConversationListPanel from "@/components/messages/ConversationListPanel";
import ChatPanel from "@/components/messages/ChatPanel";
import { useDragResize } from "@/hooks/useDragResize";
import { useMessages } from "@/hooks/useMessages";
import { getConnections } from "@/lib/connectionApi";
import { useAuthStore } from "@/store/authStore";
import type { ConnectionOut } from "@/types/connection";
import type { Message } from "@/types/message";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessagesWorkspaceProps = {
  conversationId?: string;
};

type LocalMessage = Message & {
  delivery_state: "sending" | "failed";
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function buildTempMessage(conversationId: string, content: string, sequence: number): LocalMessage {
  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    conversation_id: conversationId,
    sender_id: "self",
    content,
    sequence,
    created_at: new Date().toISOString(),
    edited_at: null,
    deleted_at: null,
    is_deleted: false,
    is_own: true,
    delivery_state: "sending",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MessagesWorkspace({ conversationId }: MessagesWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { width: convWidth, onDragStart: onConvDrag } = useDragResize(300, 240, 420);
  const {
    conversations,
    activeConversation,
    messages,
    unreadCount,
    conversationsLoading,
    messagesLoading,
    error,
    createConversation,
    sendMessage,
    markRead,
    refreshAll,
    blockUser,
    unblockUser,
  } = useMessages({ conversationId });

  const [mounted, setMounted] = useState(false);
  const [connections, setConnections] = useState<ConnectionOut[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [listQuery, setListQuery] = useState("");
  const [composer, setComposer] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<Record<string, LocalMessage[]>>({});

  const listValue = useDeferredValue(listQuery.trim().toLowerCase());
  const startTargetId = searchParams.get("start");

  const currentOptimisticMessages = conversationId ? (optimisticMessages[conversationId] ?? []) : [];
  const displayMessages = [...messages, ...currentOptimisticMessages];

  // ── Mount + auth guard ────────────────────────────────────────────────────

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!user?.id) router.replace("/login?from=/messages");
  }, [mounted, user?.id, router]);

  // ── Load connections ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setConnectionsLoading(true);
    void getConnections(user.id, 1, 100)
      .then((response) => { if (!cancelled) setConnections(response.data); })
      .catch((fetchError) => { if (!cancelled) setActionError(toErrorMessage(fetchError, "Failed to load connections")); })
      .finally(() => { if (!cancelled) setConnectionsLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  // ── Auto-open conversation from ?start= param ─────────────────────────────

  useEffect(() => {
    if (!startTargetId || conversationId) return;
    let cancelled = false;
    void createConversation(startTargetId)
      .then((conversation) => { if (!cancelled) router.replace(`/messages/${conversation.id}`); })
      .catch((createError) => { if (!cancelled) setActionError(toErrorMessage(createError, "Failed to open conversation")); });
    return () => { cancelled = true; };
  }, [conversationId, createConversation, router, startTargetId]);

  // ── Mark read on view ─────────────────────────────────────────────────────
  // Track last marked ID in a ref so we don't depend on unread_count,
  // which polls on a slower 15s interval vs messages' 5s interval.

  const lastMarkedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    const latestMessageId = messages[messages.length - 1]?.id;
    if (!latestMessageId) return;
    if (latestMessageId === lastMarkedIdRef.current) return;
    lastMarkedIdRef.current = latestMessageId;
    const timeoutId = window.setTimeout(() => { void markRead(conversationId, latestMessageId); }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [conversationId, markRead, messages]);

  // ── Filtered lists ────────────────────────────────────────────────────────

  const filteredConversations = useMemo(() => {
    if (!listValue) return conversations;
    return conversations.filter((c) =>
      [c.other_participant.display_name, c.other_participant.username, c.last_message_preview ?? ""]
        .join(" ").toLowerCase().includes(listValue),
    );
  }, [conversations, listValue]);

  const filteredConnections = useMemo(() => {
    // Exclude connections that already have an existing conversation
    const existingParticipantIds = new Set(conversations.map((c) => c.other_participant.id));
    const source = listValue
      ? connections.filter((c) =>
          [c.connected_user_display_name ?? "", c.connected_user_username ?? ""]
            .join(" ").toLowerCase().includes(listValue),
        )
      : connections.slice(0, 6);
    return source.filter((c) => c.connected_user_id !== user?.id && !existingParticipantIds.has(c.connected_user_id));
  }, [connections, conversations, listValue, user?.id]);

  // ── Early return ──────────────────────────────────────────────────────────

  if (!mounted || connectionsLoading) return <PageLoader />;

  // ── Optimistic message helpers ────────────────────────────────────────────

  const updateOptimisticMessages = (
    targetConversationId: string,
    updater: (current: LocalMessage[]) => LocalMessage[],
  ) => {
    setOptimisticMessages((current) => ({
      ...current,
      [targetConversationId]: updater(current[targetConversationId] ?? []),
    }));
  };

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleConnectionStart = async (targetUserId: string) => {
    const existing = conversations.find((c) => c.other_participant.id === targetUserId);
    if (existing) { router.push(`/messages/${existing.id}`); return; }
    try {
      const conversation = await createConversation(targetUserId);
      router.push(`/messages/${conversation.id}`);
    } catch (createError) {
      setActionError(toErrorMessage(createError, "Failed to start conversation"));
    }
  };

  const handleSend = async (contentArg?: string, retryId?: string) => {
    if (!conversationId || !activeConversation?.can_message) return;
    const trimmed = (contentArg ?? composer).trim();
    if (!trimmed) return;

    setSending(true);
    const nextTemp =
      currentOptimisticMessages.find((m) => m.id === retryId) ??
      buildTempMessage(
        conversationId,
        trimmed,
        (messages[messages.length - 1]?.sequence ?? 0) + currentOptimisticMessages.length + 1,
      );

    updateOptimisticMessages(conversationId, (current) => [
      ...current.filter((m) => m.id !== nextTemp.id),
      { ...nextTemp, content: trimmed, delivery_state: "sending" },
    ]);
    if (!retryId) setComposer("");

    try {
      await sendMessage(conversationId, trimmed);
      updateOptimisticMessages(conversationId, (current) => current.filter((m) => m.id !== nextTemp.id));
    } catch (sendError) {
      setActionError(toErrorMessage(sendError, "Failed to send message"));
      updateOptimisticMessages(conversationId, (current) =>
        current.map((m) => m.id === nextTemp.id ? { ...m, delivery_state: "failed" } : m),
      );
    } finally {
      setSending(false);
    }
  };

  const handleBlockToggle = async () => {
    if (!activeConversation) return;
    setBlockBusy(true);
    try {
      if (activeConversation.blocked_by_me) {
        await unblockUser(activeConversation.other_participant.id);
      } else {
        await blockUser(activeConversation.other_participant.id);
      }
    } catch (blockError) {
      setActionError(toErrorMessage(blockError, "Failed to update block status"));
    } finally {
      setBlockBusy(false);
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const blockedMessage = activeConversation?.blocked_by_me
    ? "You blocked this user. Unblock them to send messages."
    : activeConversation?.blocked_you
      ? "This user blocked you. You can still read the conversation history."
      : activeConversation && !activeConversation.can_message
        ? "Messaging is unavailable for this conversation."
        : null;

  const errorMessage = actionError ?? (error ? toErrorMessage(error, "Failed to load messages") : null);

  // ── Render ────────────────────────────────────────────────────────────────

  const listPanel = (
    <ConversationListPanel
      width={convWidth}
      conversationId={conversationId}
      conversations={conversations}
      conversationsLoading={conversationsLoading}
      connections={connections}
      connectionsLoading={connectionsLoading}
      unreadCount={unreadCount}
      listQuery={listQuery}
      onListQueryChange={setListQuery}
      filteredConversations={filteredConversations}
      filteredConnections={filteredConnections}
      errorMessage={errorMessage}
      onSelectConversation={(id) => router.push(`/messages/${id}`)}
      onStartConnection={(userId) => void handleConnectionStart(userId)}
    />
  );

  const chatPanel = (
    <ChatPanel
      activeConversation={activeConversation}
      displayMessages={displayMessages}
      messagesLoading={messagesLoading}
      composer={composer}
      onComposerChange={setComposer}
      onSend={() => void handleSend()}
      onRetry={(content, id) => void handleSend(content, id)}
      onBack={() => router.push("/messages")}
      onRefresh={refreshAll}
      onBlockToggle={() => void handleBlockToggle()}
      blockBusy={blockBusy}
      sending={sending}
      blockedMessage={blockedMessage}
    />
  );

  return (
    <>
      {/* ── Mobile (< 860px): one panel at a time ── */}
      <div className="flex min-[860px]:hidden flex-1 min-h-0 overflow-hidden font-sans">
        {conversationId ? chatPanel : listPanel}
      </div>

      {/* ── Desktop (≥ 860px): 3-column drag-resize layout ── */}
      <div
        className="hidden min-[860px]:grid flex-1 min-h-0 overflow-hidden font-sans items-stretch"
        style={{ gridTemplateColumns: `${convWidth}px 6px 1fr` }}
      >
        {listPanel}
        <div className="ws-drag" onMouseDown={onConvDrag} />
        {chatPanel}
      </div>
    </>
  );
}
