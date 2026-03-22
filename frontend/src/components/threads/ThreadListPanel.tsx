"use client";

import Link from "next/link";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRef } from "react";
import {
  Bookmark,
  Heart,
  MessageSquare,
  MoreHorizontal,
  PenLine,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import { avatarSeed, initials } from "@/lib/workspaceUtils";
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
  onOpenCustomize?: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────


function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function statusTone(status: ThreadStatus) {
  if (status === "open")   return { text: "text-success",       bg: "bg-success/10",  border: "border-success/20",  label: "Open" };
  if (status === "closed") return { text: "text-text-tertiary", bg: "bg-secondary",   border: "border-border",      label: "Closed" };
  return                          { text: "text-text-tertiary", bg: "bg-secondary",   border: "border-border",      label: "Archived" };
}

function shortId(id: string): string {
  if (/^[a-f0-9]{24}$/i.test(id)) return `Member ${id.slice(-4).toUpperCase()}`;
  return id.replace(/[_-]+/g, " ");
}

function userProfileHref(authorId: string, authorUsername?: string | null): string {
  if (authorUsername?.trim()) return profilePathFromUsername(authorUsername);
  return toProfilePath(authorId);
}

/** Deterministic thumb background from thread id */
const THUMB_PALETTES: string[] = [
  "linear-gradient(135deg,#1e3a5f,#0ea5e9)",
  "linear-gradient(135deg,#3b1f5e,#7c73f0)",
  "linear-gradient(135deg,#1a3a2a,#3dd68c)",
  "linear-gradient(135deg,#3a1a1a,#f06b6b)",
  "linear-gradient(135deg,#2a1f10,#f0834a)",
  "linear-gradient(135deg,#1a2a3a,#06b6d4)",
  "linear-gradient(135deg,#1f1f2e,#818cf8)",
  "linear-gradient(135deg,#2e1f1a,#fb923c)",
];

function thumbGradient(id: string): string {
  const h = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return THUMB_PALETTES[h % THUMB_PALETTES.length]!;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ThreadSkeleton() {
  return (
    <div className="px-6 py-5 border-b border-border">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-[18px] h-[18px] rounded-sm bg-card-hover animate-pulse shrink-0" />
        <div className="h-3 w-32 rounded bg-card-hover animate-pulse" />
      </div>
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          <div className="h-5 w-4/5 rounded bg-card-hover animate-pulse mb-2" />
          <div className="h-4 w-full rounded bg-card-hover animate-pulse mb-1 opacity-70" />
          <div className="h-4 w-2/3 rounded bg-card-hover animate-pulse opacity-50 mb-3" />
          <div className="h-3 w-48 rounded bg-card-hover animate-pulse opacity-40" />
        </div>
        <div className="w-[112px] h-[74px] rounded-[2px] bg-card-hover animate-pulse shrink-0" />
      </div>
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
  onOpenCustomize,
}: ThreadListPanelProps) {
  const { user } = useAuthStore();
  const tabButtonRefs = useRef<Partial<Record<TabKey, HTMLButtonElement | null>>>({});

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
  const debouncedSearch = search;

  function handleTabKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, currentTab: TabKey) {
    if (enabledTabs.length < 2) return;
    const currentIndex = enabledTabs.indexOf(currentTab);
    if (currentIndex === -1) return;
    let nextTab: TabKey | null = null;
    if (event.key === "ArrowRight") nextTab = enabledTabs[(currentIndex + 1) % enabledTabs.length]!;
    else if (event.key === "ArrowLeft") nextTab = enabledTabs[(currentIndex - 1 + enabledTabs.length) % enabledTabs.length]!;
    else if (event.key === "Home") nextTab = enabledTabs[0]!;
    else if (event.key === "End") nextTab = enabledTabs[enabledTabs.length - 1]!;
    if (!nextTab || nextTab === currentTab) return;
    event.preventDefault();
    onTabClick(nextTab);
    requestAnimationFrame(() => { tabButtonRefs.current[nextTab]?.focus(); });
  }

  return (
    <section className="flex min-w-0 flex-col overflow-hidden" style={{ minHeight: 0 }}>

      {/* ── Sticky tab bar ── */}
      <div className="shrink-0 bg-background sticky top-0 z-10">


        {/* Tabs row — hidden when only one tab */}
        <div className="flex items-center px-6" role="tablist" aria-label="Thread filters">
          {tabOptions.length > 1 && tabOptions.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`whitespace-nowrap border-x-0 border-t-0 border-b-2 bg-transparent p-0 py-[14px] mr-5 font-sans text-[13.5px] transition-all duration-150 focus-visible:rounded outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary/45 disabled:cursor-not-allowed disabled:opacity-40 ${
                tab === key
                  ? "border-b-foreground text-foreground font-semibold"
                  : "border-b-transparent text-text-secondary font-normal hover:text-foreground"
              }`}
              onClick={() => onTabClick(key)}
              onKeyDown={e => handleTabKeyDown(e, key)}
              ref={node => { tabButtonRefs.current[key] = node; }}
              role="tab"
              id={`threads-tab-${key.toLowerCase()}`}
              aria-selected={tab === key}
              aria-controls="threads-list-panel"
              tabIndex={tab === key ? 0 : -1}
              disabled={key === "MyFeed" && !user?.id}
              title={label}
            >
              {label}
            </button>
          ))}

          {/* Actions */}
          <div className="ml-auto flex items-center gap-1 py-2">
            {isSortableTab && (
              <select
                value={sortMode}
                onChange={e => setSortMode(e.target.value as SortMode)}
                className="h-7 rounded-md border border-border bg-transparent px-2 font-sans text-[12px] text-text-secondary cursor-pointer transition-colors hover:border-border-strong hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                aria-label="Sort threads"
              >
                <option value="recent">Recent</option>
                <option value="trending">Trending</option>
              </select>
            )}
            {isFeedTab && (
              <button
                type="button"
                className="flex size-7 items-center justify-center rounded-md text-text-tertiary transition-all duration-150 hover:bg-card-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                onClick={onRefreshTop}
                disabled={topRefreshing[tab]}
                title="Refresh feed"
                aria-label="Refresh feed"
              >
                <RefreshCw size={13} className={topRefreshing[tab] ? "animate-spin" : undefined} />
              </button>
            )}
            {onOpenCustomize && (
              <button
                type="button"
                className="flex size-7 items-center justify-center rounded-md text-text-tertiary transition-all duration-150 hover:bg-card-hover hover:text-foreground"
                onClick={onOpenCustomize}
                title="Customize feed"
                aria-label="Customize feed"
              >
                <SlidersHorizontal size={13} />
              </button>
            )}
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-md text-text-tertiary transition-all duration-150 hover:bg-card-hover hover:text-foreground"
              onClick={onNewThreadClick}
              title="New thread"
              aria-label="New thread"
            >
              <PenLine size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-[12px] text-destructive">
          {error}
        </div>
      )}

      {/* ── Feed ── */}
      <div
        ref={listPanelRef}
        className="ws-scroll flex-1 overflow-y-auto"
        style={{ minHeight: 0 }}
        id="threads-list-panel"
        role="tabpanel"
        aria-labelledby={`threads-tab-${tab.toLowerCase()}`}
      >
        {/* Topic picker banner */}
        {tab === "MyFeed" && !topicsSelected && !topicsSkipped && (
          <div className="px-6 pt-4">
            <TopicPickerBanner
              availableTopics={availableTopics}
              loading={topicsLoading}
              saving={topicsSaving}
              onSave={(topics) => {
                onSaveTopics(topics);
                setTabBucket("MyFeed", () => createEmptyTabState());
              }}
              onSkip={onSkipTopics}
            />
          </div>
        )}

        {loading
          ? Array.from({ length: 6 }, (_, i) => <ThreadSkeleton key={i} />)
          : (
            <>
              {threads.map((thread, idx) => {
                const tone = statusTone(thread.status);
                const [g1, g2] = avatarSeed(thread.author_id);
                const authorLabel = thread.author_display_name ?? thread.author_username ?? shortId(thread.author_id);
                const authorProfileHref = userProfileHref(thread.author_id, thread.author_username);
                const selected = activeThreadId === thread.id;
                const primaryTag = thread.tags[0];
                const isLarge = idx === 0; // first card gets larger title

                return (
                  <article
                    key={thread.id}
                    className={`group relative cursor-pointer border-b border-border px-6 py-6 text-left font-sans transition-colors duration-150 hover:bg-card-hover focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary/45 ${
                      selected ? "bg-card-hover" : ""
                    }`}
                    onClick={() => onCardClick(thread)}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onCardClick(thread); }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open thread: ${thread.title}`}
                  >
                    {/* ── Publication / author row ── */}
                    <div className="mb-2.5 flex items-center gap-1.5 text-[12px] text-text-secondary">
                      {/* Author avatar (pub logo) */}
                      <span
                        className="flex size-[18px] shrink-0 items-center justify-center rounded-[3px] text-[8px] font-bold text-white"
                        style={{ background: `linear-gradient(135deg,${g1},${g2})` }}
                      >
                        {initials(authorLabel)}
                      </span>

                      {primaryTag ? (
                        <>
                          <span>In</span>
                          <span
                            className="font-semibold text-foreground cursor-pointer hover:underline"
                            onClick={e => { e.stopPropagation(); }}
                          >
                            {primaryTag}
                          </span>
                          <span className="text-text-tertiary">·</span>
                          <span>by</span>
                        </>
                      ) : null}

                      <UserHoverCard
                        userId={thread.author_id}
                        username={thread.author_username ?? ""}
                        displayName={authorLabel}
                        isBot={thread.author_is_bot}
                      >
                        <Link
                          href={authorProfileHref}
                          className="font-medium text-text-secondary hover:text-foreground no-underline transition-colors"
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => e.stopPropagation()}
                        >
                          {authorLabel}
                        </Link>
                      </UserHoverCard>

                      {thread.author_is_bot && (
                        <span className="rounded px-1 py-px text-[9px] font-bold tracking-wide border border-info/25 bg-info/10 text-info">BOT</span>
                      )}
                    </div>

                    {/* ── Card body: text + thumb ── */}
                    <div className="flex items-start gap-3">
                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <h3 className={`m-0 mb-1.5 font-serif font-bold leading-[1.3] tracking-tight text-foreground line-clamp-2 ${isLarge ? "text-[22px]" : "text-[18px]"}`}>
                          {thread.title}
                        </h3>
                        <p className="m-0 mb-2.5 line-clamp-2 text-[14px] leading-[1.5] text-text-secondary">
                          {thread.body}
                        </p>

                        {/* Meta row — date · likes · replies + actions right */}
                        <div className="flex flex-nowrap items-center gap-2.5 text-[13px] text-text-secondary overflow-hidden">
                          <span className="whitespace-nowrap text-text-tertiary shrink-0">{formatDate(thread.created_at)}</span>
                          <span className="text-text-tertiary shrink-0">·</span>
                          <span className="flex items-center gap-1 whitespace-nowrap shrink-0">
                            <Heart size={11} fill={thread.liked_by_me ? "currentColor" : "none"} className={thread.liked_by_me ? "text-destructive" : ""} />
                            {thread.like_count}
                          </span>
                          <span className="text-text-tertiary shrink-0">·</span>
                          <span className="flex items-center gap-1 whitespace-nowrap shrink-0">
                            <MessageSquare size={11} />
                            {thread.post_count}
                          </span>

                          {thread.status !== "open" && (
                            <>
                              <span className="text-text-tertiary shrink-0">·</span>
                              <span className={`rounded-full border px-1.5 py-px text-[10px] font-bold uppercase tracking-wider shrink-0 ${tone.text} ${tone.bg} ${tone.border}`}>
                                {tone.label}
                              </span>
                            </>
                          )}

                          {/* Right: actions — desktop hover only */}
                          <div className="ml-auto hidden sm:flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              className="flex size-7 items-center justify-center rounded-md border-none bg-transparent text-text-tertiary opacity-0 group-hover:opacity-100 hover:bg-card-hover transition-all"
                              onClick={e => e.stopPropagation()}
                              title="Save"
                            >
                              <Bookmark size={14} strokeWidth={1.6} />
                            </button>
                            <button
                              type="button"
                              className="flex size-7 items-center justify-center rounded-md border-none bg-transparent text-text-tertiary opacity-0 group-hover:opacity-100 hover:bg-card-hover transition-all"
                              onClick={e => e.stopPropagation()}
                              title="More"
                            >
                              <MoreHorizontal size={14} strokeWidth={1.6} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Thumbnail */}
                      <div
                        className="w-[112px] h-[74px] rounded-sm shrink-0 flex items-center justify-center overflow-hidden"
                        style={{ background: thumbGradient(thread.id) }}
                        aria-hidden="true"
                      >
                        {thread.tags.length > 0 && (
                          <span className="text-white/60 text-[9px] font-bold uppercase tracking-widest px-2 text-center leading-tight">
                            {thread.tags[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}

              {/* Empty state */}
              {!loading && threads.length === 0 && !(tab === "MyFeed" && !topicsSelected && !topicsSkipped) && (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-card-hover">
                    <MessageSquare size={20} strokeWidth={1.5} className="text-text-tertiary" />
                  </div>
                  <div>
                    <p className="m-0 text-[13.5px] font-medium text-foreground mb-1">
                      {tab === "Mine" && debouncedSearch ? `No results for "${debouncedSearch}"`
                        : tab === "Mine" ? "No threads yet"
                        : tab === "Following" ? "No threads from people you follow"
                        : tab === "MyFeed" ? "No threads for your topics"
                        : "No threads yet"}
                    </p>
                    <p className="m-0 text-[12.5px] text-text-tertiary">
                      {tab === "Mine" ? "Create your first thread to get started."
                        : tab === "Following" ? "Follow people to see their threads here."
                        : "Try the Explore tab to discover threads."}
                    </p>
                  </div>
                  {tab === "MyFeed" && (
                    <button
                      type="button"
                      className="text-[13px] text-primary font-medium border-none bg-transparent cursor-pointer hover:underline"
                      onClick={() => onTabClick("Explore")}
                    >
                      Browse Explore →
                    </button>
                  )}
                </div>
              )}

              {/* Load more */}
              {hasMore && (
                <div className="px-6 py-4">
                  <button
                    type="button"
                    className="w-full rounded-full border border-border bg-transparent py-2 font-sans text-[12.5px] font-medium text-text-secondary transition-all duration-150 hover:bg-card-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={onLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading…" : "Show more"}
                  </button>
                </div>
              )}
            </>
          )
        }
      </div>
    </section>
  );
}
