"use client";

import { MailPlus, MessageSquare } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Avatar } from "@/components/ui/avatar";
import ConversationItem from "@/components/messages/ConversationItem";
import type { ConnectionOut } from "@/types/connection";
import type { Conversation } from "@/types/message";

// ─── Props ────────────────────────────────────────────────────────────────────

type ConversationListPanelProps = {
  /** px width — controlled by drag-resize in orchestrator */
  width: number;
  conversationId?: string;
  conversations: Conversation[];
  conversationsLoading: boolean;
  connections: ConnectionOut[];
  connectionsLoading: boolean;
  unreadCount: number;
  listQuery: string;
  onListQueryChange: (value: string) => void;
  filteredConversations: Conversation[];
  filteredConnections: ConnectionOut[];
  errorMessage: string | null;
  onSelectConversation: (id: string) => void;
  onStartConnection: (userId: string) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ConversationListPanel({
  width,
  conversationId,
  conversations,
  conversationsLoading,
  connections,
  connectionsLoading,
  unreadCount,
  listQuery,
  onListQueryChange,
  filteredConversations,
  filteredConnections,
  errorMessage,
  onSelectConversation,
  onStartConnection,
}: ConversationListPanelProps) {
  return (
    <section
      className={[
        "ws-panel flex flex-col min-w-0 min-h-0",
        conversationId ? "hidden md:flex" : "flex",
      ].join(" ")}
      style={{ width }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-6 pb-0 shrink-0">
        <div>
          <p className="m-0 text-[10px] font-bold tracking-widest uppercase text-orange-500">
            Inbox
          </p>
          <h1
            className="m-0 text-[26px] leading-tight"
            style={{ fontFamily: "var(--font-dm-serif), serif" }}
          >
            Messages
          </h1>
        </div>
        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold px-1.5 shrink-0">
            {unreadCount}
          </span>
        )}
      </div>

      {/* Search */}
      <div className="px-5 mt-3.5 shrink-0">
        <SearchInput
          value={listQuery}
          onChange={onListQueryChange}
          placeholder="Search conversations…"
          size="sm"
        />
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="mx-5 mt-2.5 px-3 py-2.5 rounded-lg border border-destructive/35 bg-destructive/10 text-[#f6b0b0] text-xs shrink-0">
          {errorMessage}
        </div>
      )}

      {/* Scrollable list */}
      <div className="flex-1 min-h-0 overflow-y-auto ws-scroll py-2.5">

        {/* Start a conversation — connections */}
        <div className="px-3 py-1.5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.09em] uppercase text-text-tertiary mb-1.5">
            <MailPlus size={13} /> Start a conversation
          </p>
          {connectionsLoading && (
            <p className="text-xs text-text-tertiary my-1 px-0.5">Loading connections…</p>
          )}
          {!connectionsLoading && filteredConnections.length === 0 && (
            <p className="text-xs text-text-tertiary my-1 px-0.5">No connections yet.</p>
          )}
          {filteredConnections.map((connection) => {
            const label =
              connection.connected_user_display_name ??
              connection.connected_user_username ??
              "Connection";
            return (
              <button
                key={connection.id}
                type="button"
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg border border-transparent
                  hover:bg-card-hover hover:border-border
                  transition-colors duration-150 text-left mb-0.5 cursor-pointer"
                onClick={() => onStartConnection(connection.connected_user_id)}
              >
                <Avatar
                  name={label}
                  size="sm"
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold text-foreground truncate">{label}</span>
                  <span className="text-[11px] text-text-tertiary truncate">
                    @{connection.connected_user_username ?? "unknown"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Conversations */}
        <div className="px-3 py-1.5 mt-1.5 border-t border-white/[0.04]">
          <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.09em] uppercase text-text-tertiary mb-1.5">
            <MessageSquare size={13} /> Conversations
          </p>
          {conversationsLoading && (
            <p className="text-xs text-text-tertiary my-1 px-0.5">Loading…</p>
          )}
          {!conversationsLoading && filteredConversations.length === 0 && (
            <p className="text-xs text-text-tertiary my-1 px-0.5">No conversations yet.</p>
          )}
          {filteredConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              selected={conversation.id === conversationId}
              onSelect={onSelectConversation}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
