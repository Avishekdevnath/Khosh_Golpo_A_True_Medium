"use client";

import { useEffect, useId, useRef, useState, useCallback } from "react";

import { useRouter } from "next/navigation";

import { useAuthStore } from "@/store/authStore";
import { useDragResize } from "@/hooks/useDragResize";
import { useUserTopics } from "@/hooks/useUserTopics";
import PageLoader from "@/components/shared/PageLoader";
import WorkspaceShell from "@/components/app/WorkspaceShell";
import ThreadListPanel from "@/components/threads/ThreadListPanel";
import { DetailPanel, CreatePanel } from "@/components/threads/ThreadDetailPanel";
import { useThreadsPage, createEmptyTabState } from "@/components/threads/useThreadsPage";
import type { TabKey, ThreadOut } from "@/components/threads/useThreadsPage";
import type { SortMode } from "@/types/feed";
import DiscoveryPanel from "@/components/threads/DiscoveryPanel";
import { useFeedPreferences } from "@/hooks/useFeedPreferences";
import FeedCustomizePanel from "@/components/threads/FeedCustomizePanel";

// ─── Types ────────────────────────────────────────────────────────────────────

type RightPanel = "detail" | "create";

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export default function ThreadsWorkspace() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Layout state
  const [rightPanel, setRightPanel] = useState<RightPanel>("detail");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  // Feed preferences (logged-in only)
  const { prefs, saving: prefsSaving, savePrefs } = useFeedPreferences();

  // Filter state
  const [tab, setTab] = useState<TabKey>("Explore");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [topicsSkipped, setTopicsSkipped] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("kg_topics_skipped") === "true"
  );
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const searchInputId = useId();

  const { selectedTopics, topicsSelected, availableTopics, loading: topicsLoading, saving: topicsSaving, saveTopics } = useUserTopics();

  const tabOptions: Array<{ key: TabKey; label: string }> = [
    { key: "Explore", label: "Explore" },
  ];

  const enabledTabs: TabKey[] = ["Explore"];

  const handleSearchSubmit = useCallback(() => {
    setSubmittedSearch(search.trim());
  }, [search]);

  const handleSearchClear = useCallback(() => {
    setSearch("");
    setSubmittedSearch("");
  }, []);

  // Build explore options from user prefs (guests get defaults — no filtering)
  const exploreOptions = user?.id ? {
    topicsOnly: !prefs.feed_explore_mode && prefs.interest_tags.length > 0,
    excludeOwn: !prefs.feed_include_own,
    followingPriority: prefs.feed_following_priority,
  } : {};

  // Data + mutations via hook
  const {
    tabState,
    setTabBucket,
    topRefreshing,
    loadMore,
    refreshTop,
    handleThreadCreated: hookThreadCreated,
    handleThreadUpdated,
    handleThreadDeleted,
  } = useThreadsPage(tab, setTab, sortMode, submittedSearch, topicsSelected, topicsSkipped, setTopicsSkipped, topicsLoading, exploreOptions);

  // Resizable columns (desktop only)
  const { width: listW, onDragStart: onListDragStart } = useDragResize(420, 420, 600);

  // Scroll restoration per tab
  const listPanelRef = useRef<HTMLDivElement | null>(null);
  const tabScrollRef = useRef<Record<TabKey, number>>({
    MyFeed: 0,
    Following: 0,
    Explore: 0,
    Mine: 0,
  });

  useEffect(() => {
    const el = listPanelRef.current;
    if (!el) return;
    const saveScroll = () => { tabScrollRef.current[tab] = el.scrollTop; };
    saveScroll();
    el.addEventListener("scroll", saveScroll);
    return () => el.removeEventListener("scroll", saveScroll);
  }, [tab]);

  useEffect(() => {
    const saved = tabScrollRef.current[tab] ?? 0;
    requestAnimationFrame(() => {
      if (listPanelRef.current) listPanelRef.current.scrollTop = saved;
    });
  }, [tab]);

  // Reset Explore tab when feed preferences change so the feed reloads
  const prevPrefsRef = useRef(prefs);
  useEffect(() => {
    const prev = prevPrefsRef.current;
    const changed =
      prev.feed_explore_mode !== prefs.feed_explore_mode ||
      prev.feed_following_priority !== prefs.feed_following_priority ||
      prev.feed_include_own !== prefs.feed_include_own ||
      prev.interest_tags.join() !== prefs.interest_tags.join();
    if (changed) {
      setTabBucket("Explore", () => createEmptyTabState());
    }
    prevPrefsRef.current = prefs;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs]);

  // Derived
  const currentTabState = tabState[tab];
  const threads = currentTabState.threads;
  // Don't count "waiting for topic selection" as a loading state — it should render the topic picker, not a spinner
  const awaitingTopicSelection = tab === "MyFeed" && !topicsLoading && !topicsSelected && !topicsSkipped;
  const loading = currentTabState.loading || (!currentTabState.hasFetched && !awaitingTopicSelection);
  const initialLoad = loading && threads.length === 0 && !topicsLoading;
  const detailOpen = activeThreadId !== null || rightPanel === "create";
  const contentColumns = detailOpen ? `${listW}px 6px 1fr` : "1fr";
  const activeThread = threads.find(t => t.id === activeThreadId) ?? null;

  // Handlers
  function handleThreadCreatedLocal(thread: ThreadOut) {
    hookThreadCreated(thread);
    setActiveThreadId(thread.id);
    setRightPanel("detail");
  }

  function handleCardClick(thread: ThreadOut) {
    router.push(`/threads/${thread.id}`);
  }

  function handleNewThreadClick() {
    if (window.innerWidth >= 1100) {
      setRightPanel("create");
      return;
    }
    router.push("/threads/new");
  }

  function handleTabClick(nextTab: TabKey) {
    if ((nextTab === "Mine" || nextTab === "MyFeed") && !user?.id) {
      router.push("/login?from=/threads");
      return;
    }
    if (listPanelRef.current) {
      tabScrollRef.current[tab] = listPanelRef.current.scrollTop;
    }
    setTab(nextTab);
  }

  if (initialLoad) return <PageLoader />;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
    <WorkspaceShell wrapPanel={false} sidebarProps={{ hideChannels: true }} contentColumns={contentColumns}>

        {/* ── Thread list panel ── */}
        <ThreadListPanel
          tab={tab}
          tabOptions={tabOptions}
          enabledTabs={enabledTabs}
          sortMode={sortMode}
          setSortMode={setSortMode}
          search={search}
          tabState={tabState}
          topRefreshing={topRefreshing}
          activeThreadId={activeThreadId}
          topicsSelected={topicsSelected}
          topicsSkipped={topicsSkipped}
          availableTopics={availableTopics}
          topicsLoading={topicsLoading}
          topicsSaving={topicsSaving}
          onTabClick={handleTabClick}
          onCardClick={handleCardClick}
          onNewThreadClick={handleNewThreadClick}
          onRefreshTop={refreshTop}
          onLoadMore={loadMore}
          onSaveTopics={(topics) => { void saveTopics(topics); }}
          onSkipTopics={() => {
            localStorage.setItem("kg_topics_skipped", "true");
            setTopicsSkipped(true);
            setTabBucket("MyFeed", () => createEmptyTabState());
          }}
          setTabBucket={setTabBucket}
          listPanelRef={listPanelRef}
          onOpenCustomize={user?.id ? () => setCustomizeOpen(v => !v) : undefined}
          onSearchChange={setSearch}
          onSearchSubmit={handleSearchSubmit}
          onSearchClear={handleSearchClear}
        />

        {/* ── Drag handle ── */}
        {detailOpen && (
          <div
            className="w-[6px] cursor-col-resize bg-transparent hover:bg-white/10 transition-colors select-none max-[1100px]:hidden"
            onMouseDown={onListDragStart}
          />
        )}

        {/* ── Right panel (desktop) ── */}
        {detailOpen && (
          <aside className="flex flex-col min-h-0 overflow-hidden min-w-0 max-[1100px]:hidden">
            {rightPanel === "create" ? (
              <CreatePanel
                onClose={() => setRightPanel("detail")}
                onCreated={handleThreadCreatedLocal}
              />
            ) : (
              <DetailPanel
                thread={activeThread}
                onClose={() => setActiveThreadId(null)}
                onThreadUpdated={handleThreadUpdated}
                onThreadDeleted={(threadId) => {
                  handleThreadDeleted(threadId);
                  setActiveThreadId(current => {
                    if (current !== threadId) return current;
                    return threads.find(item => item.id !== threadId)?.id ?? null;
                  });
                }}
              />
            )}
          </aside>
        )}
    </WorkspaceShell>

      {/* ── Discovery panel (xl screens) ── */}
      {!detailOpen && (
        <DiscoveryPanel
          onTagClick={(tag) => {
            setSearch(tag);
            handleTabClick("Explore");
          }}
        />
      )}

      {/* ── Feed customize panel ── */}
      {user?.id && (
        <FeedCustomizePanel
          open={customizeOpen}
          onClose={() => setCustomizeOpen(false)}
          prefs={prefs}
          saving={prefsSaving}
          availableTopics={availableTopics}
          onSave={(patch) => { void savePrefs(patch); }}
        />
      )}
    </div>
  );
}
