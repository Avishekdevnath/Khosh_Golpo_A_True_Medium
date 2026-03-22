"use client";

import { MailPlus, MessageSquare } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import ConversationItem from "@/components/messages/ConversationItem";
import { avatarSeed, initials } from "@/lib/workspaceUtils";
import type { ConnectionOut } from "@/types/connection";
import type { Conversation } from "@/types/message";

type ConversationListPanelProps = {
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div className="size-[40px] rounded-full bg-card-hover animate-pulse shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-3.5 w-28 rounded bg-card-hover animate-pulse mb-1.5" />
        <div className="h-3 w-40 rounded bg-card-hover animate-pulse opacity-60" />
      </div>
    </div>
  );
}

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
        conversationId ? "max-[860px]:hidden flex" : "flex",
      ].join(" ")}
      style={{ width }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 pt-6 pb-4 shrink-0">
        <div>
          <p className="m-0 text-[10px] font-bold tracking-widest uppercase text-primary mb-0.5">
            Inbox
          </p>
          <h1 className="m-0 font-serif text-[24px] leading-tight text-foreground">
            Messages
          </h1>
        </div>
        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-primary text-white text-[10px] font-bold px-1.5 shrink-0">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>

      {/* Search */}
      <div className="px-4 pb-3 shrink-0">
        <SearchInput
          value={listQuery}
          onChange={onListQueryChange}
          placeholder="Search conversations…"
          size="sm"
        />
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl border border-destructive/30 bg-destructive/8 text-[12px] text-destructive/90 shrink-0">
          {errorMessage}
        </div>
      )}

      {/* Scrollable list */}
      <div className="flex-1 min-h-0 overflow-y-auto ws-scroll px-2 pb-3">

        {/* Start a conversation */}
        <div className="mb-1">
          <p className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold tracking-[0.09em] uppercase text-text-tertiary">
            <MailPlus size={11} /> New conversation
          </p>
          {connectionsLoading ? (
            <div className="px-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2">
                  <div className="size-[32px] rounded-full bg-card-hover animate-pulse shrink-0" style={{ animationDelay: `${i * 0.12}s` }} />
                  <div className="flex-1">
                    <div className="h-3 w-24 rounded bg-card-hover animate-pulse mb-1" />
                    <div className="h-2.5 w-16 rounded bg-card-hover animate-pulse opacity-60" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConnections.length === 0 ? (
            <p className="px-3 py-1 text-[12px] text-text-tertiary">No connections yet.</p>
          ) : (
            filteredConnections.map((conn) => {
              const label = conn.connected_user_display_name ?? conn.connected_user_username ?? "Connection";
              const [c1, c2] = avatarSeed(conn.connected_user_id);
              return (
                <button
                  key={conn.id}
                  type="button"
                  onClick={() => onStartConnection(conn.connected_user_id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-transparent hover:bg-card-hover hover:border-border transition-colors duration-150 text-left cursor-pointer"
                >
                  <div
                    className="size-[32px] rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                    style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                  >
                    {initials(label)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-foreground truncate">{label}</span>
                    <span className="block text-[11px] text-text-tertiary truncate">
                      @{conn.connected_user_username ?? "unknown"}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Conversations */}
        <div className="border-t border-border/50 pt-1 mt-1">
          <p className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold tracking-[0.09em] uppercase text-text-tertiary">
            <MessageSquare size={11} /> Recent
          </p>
          {conversationsLoading ? (
            [0, 1, 2, 3].map(i => <ConversationSkeleton key={i} />)
          ) : filteredConversations.length === 0 ? (
            <p className="px-3 py-1 text-[12px] text-text-tertiary">No conversations yet.</p>
          ) : (
            filteredConversations.map(conversation => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                selected={conversation.id === conversationId}
                onSelect={onSelectConversation}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
