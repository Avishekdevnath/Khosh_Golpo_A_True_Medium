"use client";

import Link from "next/link";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRef } from "react";
import {
  Clock,
  Heart,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  X,
} from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import { avatarSeed, initials, relativeTime } from "@/lib/workspaceUtils";
import { profilePathFromUsername, toProfilePath } from "@/lib/profileRouting";
import TopicPickerBanner from "@/components/threads/TopicPickerBanner";
import UserHoverCard from "@/components/shared/UserHoverCard";
import type { TabKey, TabState, ThreadOut, ThreadStatus } from "@/components/threads/useThreadsPage";
import { createEmptyTabState } from "@/components/threads/useThreadsPage";
import type { PopularTopic, SortMode } from "@/types/feed";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabOption = { key: TabKey; label: string };

export type ThreadListPanelProps = {
  tab: TabKey;
  tabOptions: TabOption[];
  enabledTabs: TabKey[];
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  search: string;
  setSearch: (s: string) => void;
  searchInputId: string;
  tabState: Record<TabKey, TabState>;
  topRefreshing: Record<TabKey, boolean>;
  activeThreadId: string | null;
  topicsSelected: boolean;
  topicsSkipped: boolean;
  availableTopics: PopularTopic[];
  topicsLoading: boolean;
  topicsSaving: boolean;
  onTabClick: (key: TabKey) => void;
  onCardClick: (thread: ThreadOut) => void;
  onNewThreadClick: () => void;
  onRefreshTop: () => void;
  onLoadMore: () => void;
  onSaveTopics: (topics: string[]) => void;
  onSkipTopics: () => void;
  setTabBucket: (tabKey: TabKey, next: (state: TabState) => TabState) => void;
  listPanelRef: React.RefObject<HTMLDivElement | null>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusTone(status: ThreadStatus) {
  if (status === "open")   return { text: "#3dd68c", bg: "rgba(34,211,160,0.12)",  border: "rgba(34,211,160,0.2)",  label: "Open" };
  if (status === "closed") return { text: "var(--muted, #636f8d)", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.1)", label: "Closed" };
  return                          { text: "var(--muted, #636f8d)", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.1)", label: "Archived" };
}

function shortId(id: string): string {
  if (/^[a-f0-9]{24}$/i.test(id)) return `Member ${id.slice(-4).toUpperCase()}`;
  return id.replace(/[_-]+/g, " ");
}

function userProfileHref(authorId: string, authorUsername?: string | null): string {
  if (authorUsername?.trim()) return profilePathFromUsername(authorUsername);
  return toProfilePath(authorId);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ThreadSkeleton() {
  return (
    <div style={{
      borderBottom: "1px solid var(--app-border, #1c1f2e)",
      background: "transparent",
      padding: "16px 20px",
    }}>
      {[85, 60, 92, 78].map((w, i) => (
        <div key={i} style={{
          height: i < 2 ? 13 : 11, width: `${w}%`,
          borderRadius: 4, background: "var(--app-card-hover, #181b27)",
          marginTop: i === 0 ? 0 : 6,
          animation: "sk 1.4s ease infinite",
          opacity: i > 1 ? 0.5 : 1,
        }} />
      ))}
      <style jsx>{`@keyframes sk{0%,100%{opacity:.4}50%{opacity:.9}}`}</style>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ThreadListPanel({
  tab,
  tabOptions,
  enabledTabs,
  sortMode,
  setSortMode,
  search,
  setSearch,
  searchInputId,
  tabState,
  topRefreshing,
  activeThreadId,
  topicsSelected,
  topicsSkipped,
  availableTopics,
  topicsLoading,
  topicsSaving,
  onTabClick,
  onCardClick,
  onNewThreadClick,
  onRefreshTop,
  onLoadMore,
  onSaveTopics,
  onSkipTopics,
  setTabBucket,
  listPanelRef,
}: ThreadListPanelProps) {
  const { user } = useAuthStore();
  const tabButtonRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({
    MyFeed: null,
    Following: null,
    Explore: null,
    Mine: null,
  });

  const currentTabState = tabState[tab];
  const threads = currentTabState.threads;
  const total = currentTabState.total;
  const nextCursor = currentTabState.nextCursor;
  const loading = currentTabState.loading || !currentTabState.hasFetched;
  const loadingMore = currentTabState.loadingMore;
  const error = currentTabState.error;
  const isFeedTab = tab !== "Mine";
  const isSortableTab = tab === "MyFeed" || tab === "Explore";
  const hasMore = tab === "Mine" ? threads.length < total : nextCursor !== null;
  const debouncedSearch = search; // displayed text for empty state label

  function handleTabKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, currentTab: TabKey) {
    if (enabledTabs.length < 2) return;
    const currentIndex = enabledTabs.indexOf(currentTab);
    if (currentIndex === -1) return;

    let nextTab: TabKey | null = null;
    if (event.key === "ArrowRight") {
      nextTab = enabledTabs[(currentIndex + 1) % enabledTabs.length]!;
    } else if (event.key === "ArrowLeft") {
      nextTab = enabledTabs[(currentIndex - 1 + enabledTabs.length) % enabledTabs.length]!;
    } else if (event.key === "Home") {
      nextTab = enabledTabs[0]!;
    } else if (event.key === "End") {
      nextTab = enabledTabs[enabledTabs.length - 1]!;
    }

    if (!nextTab || nextTab === currentTab) return;
    event.preventDefault();
    onTabClick(nextTab);
    requestAnimationFrame(() => {
      tabButtonRefs.current[nextTab]?.focus();
    });
  }

  return (
    <section className="ws-panel list-panel">
      <div className="panel-header">
        <div className="header-top">
          <div>
            <div className="header-title-row">
              <h1 className="header-title">Threads</h1>
              {!loading && <span className="thread-count">{total.toLocaleString()}</span>}
            </div>
          </div>
          <div className="header-actions">
            {isFeedTab && (
              <button
                type="button"
                className="refresh-icon-btn"
                onClick={onRefreshTop}
                disabled={topRefreshing[tab]}
                title="Refresh feed"
                aria-label="Refresh feed"
              >
                <RefreshCw size={14} className={topRefreshing[tab] ? "spin" : undefined} />
              </button>
            )}
            <button type="button" className="new-btn" onClick={onNewThreadClick}>
              <Plus size={14} /> New Thread
            </button>
          </div>
        </div>

        {tab === "Mine" && (
          <label className="search-bar" htmlFor={searchInputId}>
            <Search size={15} className="search-icon" aria-hidden="true" />
            <input
              id={searchInputId}
              placeholder="Search threads..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                title="Clear search"
                onClick={() => setSearch("")}
                style={{ border: "none", background: "transparent", color: "var(--muted, #636f8d)", cursor: "pointer", display: "flex", padding: 2 }}
              >
                <X size={12} />
              </button>
            )}
          </label>
        )}

        <div className="tab-bar" role="tablist" aria-label="Thread filters">
          {tabOptions.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`tab${tab === key ? " active" : ""}`}
              onClick={() => onTabClick(key)}
              onKeyDown={e => handleTabKeyDown(e, key)}
              ref={node => { tabButtonRefs.current[key] = node; }}
              role="tab"
              id={`threads-tab-${key.toLowerCase()}`}
              aria-selected={tab === key}
              aria-controls="threads-list-panel"
              tabIndex={tab === key ? 0 : -1}
              aria-disabled={(key === "Mine" || key === "MyFeed") && !user?.id}
              disabled={(key === "Mine" || key === "MyFeed") && !user?.id}
              title={(key === "Mine" || key === "MyFeed") && !user?.id ? "Sign in to use this tab" : undefined}
            >
              {label}
            </button>
          ))}
          {isSortableTab && (
            <div className="sort-toggle">
              <button
                type="button"
                className={`sort-icon-btn${sortMode === "recent" ? " active" : ""}`}
                onClick={() => setSortMode("recent")}
                title="Most Recent"
              >
                <Clock size={13} />
              </button>
              <button
                type="button"
                className={`sort-icon-btn${sortMode === "trending" ? " active" : ""}`}
                onClick={() => setSortMode("trending")}
                title="Trending"
              >
                <TrendingUp size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div
        ref={listPanelRef}
        className="thread-list ws-scroll"
        id="threads-list-panel"
        role="tabpanel"
        aria-labelledby={`threads-tab-${tab.toLowerCase()}`}
      >
        {tab === "MyFeed" && !topicsSelected && !topicsSkipped && (
          <div className="banner-wrapper">
            <TopicPickerBanner
              availableTopics={availableTopics}
              loading={topicsLoading}
              saving={topicsSaving}
              onSave={async (topics) => {
                await onSaveTopics(topics);
                setTabBucket("MyFeed", () => createEmptyTabState());
              }}
              onSkip={onSkipTopics}
            />
          </div>
        )}

        {loading
          ? Array.from({ length: 5 }, (_, i) => <ThreadSkeleton key={i} />)
          : <>
              {threads.map(thread => {
                const tone = statusTone(thread.status);
                const [g1, g2] = avatarSeed(thread.author_id);
                const authorLabel = thread.author_display_name ?? thread.author_username ?? shortId(thread.author_id);
                const authorProfileHref = userProfileHref(thread.author_id, thread.author_username);
                const selected = activeThreadId === thread.id;

                return (
                  <article
                    key={thread.id}
                    className={`thread-card${selected ? " selected" : ""}`}
                    onClick={() => onCardClick(thread)}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onCardClick(thread);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open thread: ${thread.title}`}
                  >
                    <div className="tc-author-row">
                      <span className="tc-av" style={{ background: `linear-gradient(135deg,${g1},${g2})` }}>
                        {initials(authorLabel)}
                      </span>
                      <UserHoverCard
                        userId={thread.author_id}
                        username={thread.author_username ?? ""}
                        displayName={authorLabel}
                        isBot={thread.author_is_bot}
                      >
                        <Link
                          href={authorProfileHref}
                          className="tc-name-link"
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => e.stopPropagation()}
                          aria-label={`Open profile of ${authorLabel}`}
                        >
                          <span className="tc-author-name">{authorLabel}</span>
                          {thread.author_is_bot && <span className="tc-bot-badge">BOT</span>}
                        </Link>
                      </UserHoverCard>
                      <span className="tc-time">{relativeTime(thread.created_at)}</span>
                    </div>

                    <h3 className="tc-title">{thread.title}</h3>
                    <p className="tc-body">{thread.body}</p>

                    <div className="tc-footer">
                      <div className="tc-tags">
                        {thread.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="tc-tag">#{tag}</span>
                        ))}
                        {thread.tags.length > 3 && <span className="tc-tag-more">+{thread.tags.length - 3}</span>}
                      </div>
                      <div className="tc-footer-right">
                        {thread.status !== "open" && (
                          <span className="tc-status" style={{ color: tone.text, background: tone.bg, border: `1px solid ${tone.border}` }}>{tone.label}</span>
                        )}
                        <button
                          type="button"
                          className={thread.liked_by_me ? "tc-like liked" : "tc-like"}
                          onClick={e => { e.stopPropagation(); /* like handled by parent via onCardClick alternative — wired in orchestrator */ }}
                          title={user ? (thread.liked_by_me ? "Unlike" : "Like") : "Sign in to like"}
                        >
                          <Heart size={12} fill={thread.liked_by_me ? "currentColor" : "none"} />
                          {thread.like_count > 0 && thread.like_count}
                        </button>
                        <span className="tc-replies" aria-label={`${thread.post_count} ${thread.post_count === 1 ? "reply" : "replies"}`}>
                          <MessageSquare size={12} />
                          {thread.post_count}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}

              {!loading && threads.length === 0 && !(tab === "MyFeed" && !topicsSelected && !topicsSkipped) && (
                <div className="empty">
                  <MessageSquare size={26} strokeWidth={1.2} />
                  <span>
                    {tab === "Mine" && debouncedSearch
                      ? `No threads matching "${debouncedSearch}"`
                      : tab === "Mine"
                      ? "You haven't created any threads yet."
                      : tab === "Following"
                      ? "Follow people to see their threads here."
                      : tab === "MyFeed"
                      ? "No threads yet for your topics. Try Explore."
                      : "No threads yet. Start the first one!"}
                  </span>
                  {tab === "MyFeed" && (
                    <button type="button" className="empty-link" onClick={() => onTabClick("Explore")}>
                      Browse Explore →
                    </button>
                  )}
                </div>
              )}

              {hasMore && (
                <button type="button" className="load-more" onClick={onLoadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading..." : (tab === "Mine" ? `Load more (${Math.max(total - threads.length, 0)} remaining)` : "Load more")}
                </button>
              )}
            </>
        }
      </div>

      <style jsx>{listPanelStyles}</style>
    </section>
  );
}

// ─── List panel styles ─────────────────────────────────────────────────────────

const listPanelStyles = `
  .ws-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }
  .list-panel { min-width: 0; }
  .panel-header {
    padding: 20px 20px 0; flex-shrink: 0;
    border-bottom: 1px solid var(--app-border, #1c1f2e);
    background: var(--app-card, #13151f); position: relative;
  }
  .panel-header::after {
    display: none;
  }
  .header-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; }
  .header-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
  .header-title-row { display: flex; align-items: center; gap: 8px; }
  .header-title {
    font-family: var(--serif), sans-serif; font-size: 22px; font-weight: 800;
    letter-spacing: -0.5px; margin: 0; color: var(--text, #e4e8f4);
  }
  .thread-count {
    font-size: 13px; font-weight: 600; color: var(--muted, #636f8d);
    margin-left: -2px;
  }
  .new-btn {
    display: flex; align-items: center; gap: 6px;
    background: #0EA5E9; color: #fff; border: none; border-radius: 9px; padding: 7px 13px;
    font-family: var(--sans), sans-serif; font-size: 12.5px; font-weight: 600;
    cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px rgba(14,165,233,0.3); white-space: nowrap;
  }
  .new-btn:hover { background: #38BDF8; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(14,165,233,0.4); }
  .new-btn:active { transform: translateY(0); }
  .refresh-icon-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 32px; height: 32px;
    border: 1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.04); color: var(--muted, #636f8d);
    border-radius: 8px; cursor: pointer; transition: all 0.2s;
  }
  .refresh-icon-btn:hover:not(:disabled) {
    border-color: rgba(255,255,255,0.22); color: var(--text, #e4e8f4); background: var(--app-border, #1c1f2e);
  }
  .refresh-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .spin { animation: spin 0.9s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .search-bar {
    display: flex; align-items: center; gap: 10px;
    background: var(--app-card-hover, #181b27); border: 1px solid var(--app-border, #1c1f2e);
    border-radius: 10px; padding: 9px 14px; margin-bottom: 14px;
    transition: all 0.2s; cursor: text;
  }
  .search-bar:focus-within { border-color: #0EA5E9; box-shadow: 0 0 0 3px rgba(14,165,233,0.15); }
  .search-icon { color: var(--muted, #636f8d); flex-shrink: 0; }
  .search-bar input {
    border: none; background: transparent; outline: none;
    color: var(--text, #e4e8f4); font-family: var(--sans), sans-serif; font-size: 13.5px; flex: 1;
  }
  .search-bar input::placeholder { color: var(--muted, #636f8d); }
  .tab-bar { display: flex; align-items: center; margin-bottom: -1px; }
  .tab {
    padding: 8px 12px; font-size: 13px; font-weight: 500; color: var(--muted, #636f8d);
    cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s; white-space: nowrap;
    border-top: none; border-left: none; border-right: none;
    background: transparent; font-family: var(--sans), sans-serif;
  }
  .tab:hover { color: var(--text, #e4e8f4); }
  .tab.active { color: #0EA5E9; border-bottom-color: #0EA5E9; }
  .tab:disabled { opacity: 0.4; cursor: not-allowed; }
  .tab:focus-visible { outline: 2px solid rgba(14,165,233,0.45); outline-offset: 2px; border-radius: 4px; }
  .sort-toggle {
    display: flex; gap: 2px; margin-left: auto; flex-shrink: 0;
    padding-right: 4px;
  }
  .sort-icon-btn {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 6px;
    border: 1px solid transparent; background: transparent;
    color: var(--muted, #636f8d); cursor: pointer; transition: all 0.15s;
    font-family: var(--sans), sans-serif;
  }
  .sort-icon-btn:hover { color: var(--text, #e4e8f4); background: rgba(255,255,255,0.04); }
  .sort-icon-btn.active { color: #0EA5E9; background: rgba(14,165,233,0.08); border-color: rgba(14,165,233,0.25); }
  .banner-wrapper { padding: 16px 20px 0; }
  .thread-list { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 0; }
  .thread-card {
    padding: 16px 20px;
    border: none; border-bottom: 1px solid var(--app-border, #1c1f2e);
    cursor: pointer; transition: all 0.15s ease; position: relative;
    width: 100%; text-align: left; background: transparent;
    color: inherit; font-family: var(--sans), sans-serif;
    animation: fadeIn 0.3s ease both;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .thread-card:nth-child(1) { animation-delay: 0.05s; }
  .thread-card:nth-child(2) { animation-delay: 0.1s; }
  .thread-card:nth-child(3) { animation-delay: 0.15s; }
  .thread-card:nth-child(4) { animation-delay: 0.2s; }
  .thread-card:nth-child(5) { animation-delay: 0.25s; }
  .thread-card:hover { background: rgba(14,165,233,0.03); }
  .thread-card.selected { background: var(--app-card-hover, #181b27); border-left: 2px solid #0EA5E9; padding-left: 18px; }
  .thread-card:focus-visible { outline: 2px solid rgba(14,165,233,0.45); outline-offset: -2px; }
  .tc-author-row { display: flex; align-items: center; gap: 6px; margin-bottom: 9px; }
  .tc-av {
    width: 22px; height: 22px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 9px; font-weight: 700; color: #fff; flex-shrink: 0;
  }
  .tc-name-link {
    display: flex; align-items: center; gap: 5px;
    text-decoration: none; border-radius: 4px; padding: 1px 4px 1px 0;
    transition: all 0.15s; flex-shrink: 0;
  }
  .tc-name-link:hover .tc-author-name { color: #0EA5E9; }
  .tc-name-link:focus-visible { outline: 2px solid rgba(14,165,233,0.45); outline-offset: 1px; }
  .tc-author-name {
    font-size: 12px; font-weight: 600; color: var(--muted, #636f8d);
    font-family: var(--serif), sans-serif; transition: color 0.15s;
  }
  .tc-bot-badge {
    font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 3px;
    border: 1px solid rgba(129,140,248,0.5); color: #a5b4fc;
    background: rgba(129,140,248,0.1); letter-spacing: 0.04em;
  }
  .tc-time { font-size: 11px; color: var(--muted, #636f8d); margin-left: auto; flex-shrink: 0; }
  .tc-status {
    font-size: 10px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase;
    padding: 2px 8px; border-radius: 4px;
  }
  .tc-title {
    font-family: var(--serif), sans-serif; font-size: 15px; font-weight: 700;
    line-height: 1.35; margin: 0 0 6px; letter-spacing: -0.2px; color: var(--text, #e4e8f4);
  }
  .tc-body {
    font-size: 13px; color: var(--muted, #636f8d); line-height: 1.5;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    margin-bottom: 10px;
  }
  .tc-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 20px; }
  .tc-footer-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .tc-tags { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; }
  .tc-tag {
    font-size: 11px; font-weight: 500; color: var(--muted, #636f8d);
    background: rgba(255,255,255,0.04); padding: 2px 8px; border-radius: 4px;
    border: 1px solid var(--app-border, #1c1f2e); transition: all 0.15s;
  }
  .tc-tag:hover { background: rgba(129,140,248,0.12); color: #a5b4fc; border-color: rgba(129,140,248,0.25); }
  .tc-tag-more { font-size: 11px; color: var(--muted, #636f8d); }
  .tc-replies { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--muted, #636f8d); }
  .tc-like { border: none; background: transparent; color: var(--muted, #636f8d); font-size: 11px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; padding: 2px 6px; border-radius: 5px; transition: all 0.15s; font-family: inherit; }
  .tc-like:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
  .tc-like.liked { color: #ef4444; }
  .empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 10px; color: var(--muted, #636f8d); font-size: 13px; padding: 60px 20px; text-align: center;
  }
  .empty-link {
    background: none; border: none; color: #0EA5E9; font-size: 13px;
    cursor: pointer; text-decoration: underline; text-underline-offset: 3px; padding: 0;
    font-family: var(--sans), sans-serif;
  }
  .error-banner {
    margin: 8px 20px 0;
    border: 1px solid rgba(239,68,68,0.35); background: rgba(239,68,68,0.1);
    color: #fca5a5; border-radius: 8px; padding: 8px 12px; font-size: 12px;
  }
  .load-more {
    display: block; width: calc(100% - 40px); margin: 8px 20px;
    padding: 10px; border: 1px dashed rgba(255,255,255,0.10);
    border-radius: 8px; background: transparent; cursor: pointer;
    font-size: 12px; color: var(--muted, #636f8d); font-family: var(--sans), sans-serif;
    transition: all 0.15s;
  }
  .load-more:hover:not(:disabled) { border-color: rgba(255,255,255,0.2); color: var(--text, #e4e8f4); }
  .load-more:disabled { opacity: 0.5; cursor: not-allowed; }
`;
