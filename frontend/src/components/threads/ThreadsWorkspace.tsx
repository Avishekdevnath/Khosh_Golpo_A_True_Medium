"use client";

import { useEffect, useId, useRef, useState } from "react";
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

// ─── Types ────────────────────────────────────────────────────────────────────

type RightPanel = "detail" | "create";

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export default function ThreadsWorkspace() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Layout state
  const [rightPanel, setRightPanel] = useState<RightPanel>("detail");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Filter state
  const [tab, setTab] = useState<TabKey>("MyFeed");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [topicsSkipped, setTopicsSkipped] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchInputId = useId();

  const { selectedTopics, topicsSelected, availableTopics, loading: topicsLoading, saving: topicsSaving, saveTopics } = useUserTopics();

  const tabOptions: Array<{ key: TabKey; label: string }> = [
    { key: "MyFeed", label: selectedTopics.length > 0 ? `My Feed (${selectedTopics.length})` : "My Feed" },
    { key: "Following", label: "Following" },
    { key: "Explore", label: "Explore" },
    { key: "Mine", label: "Mine" },
  ];

  const enabledTabs = user?.id
    ? tabOptions.map(t => t.key)
    : tabOptions.filter(t => t.key !== "Mine" && t.key !== "MyFeed").map(t => t.key);

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

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
  } = useThreadsPage(tab, setTab, sortMode, debouncedSearch, topicsSelected, topicsSkipped, setTopicsSkipped);

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

  // Derived
  const currentTabState = tabState[tab];
  const threads = currentTabState.threads;
  const loading = currentTabState.loading || !currentTabState.hasFetched;
  const initialLoad = loading && threads.length === 0;
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
    if (window.innerWidth >= 1100) {
      if (activeThreadId === thread.id && rightPanel === "detail") {
        setActiveThreadId(null);
      } else {
        setActiveThreadId(thread.id);
        setRightPanel("detail");
      }
    } else {
      router.push(`/threads/${thread.id}`);
    }
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
    <WorkspaceShell wrapPanel={false} sidebarProps={{ hideChannels: true }} contentColumns={contentColumns}>

        {/* ── Thread list panel ── */}
        <ThreadListPanel
          tab={tab}
          tabOptions={tabOptions}
          enabledTabs={enabledTabs}
          sortMode={sortMode}
          setSortMode={setSortMode}
          search={search}
          setSearch={setSearch}
          searchInputId={searchInputId}
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
            setTopicsSkipped(true);
            setTabBucket("MyFeed", () => createEmptyTabState());
          }}
          setTabBucket={setTabBucket}
          listPanelRef={listPanelRef}
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
  );
}
