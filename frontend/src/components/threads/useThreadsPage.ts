"use client";

import { useEffect, useRef, useState } from "react";

import { apiGet, apiPost } from "@/lib/api";
import { getExploreFeed, getMyFeed } from "@/lib/feedApi";
import { useAuthStore } from "@/store/authStore";
import type { FeedItem, SortMode } from "@/types/feed";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThreadStatus = "open" | "closed" | "archived";

export type ThreadOut = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  author_id: string;
  author_username?: string | null;
  author_display_name?: string | null;
  author_is_bot?: boolean;
  post_count: number;
  like_count: number;
  liked_by_me: boolean;
  status: ThreadStatus;
  is_pinned?: boolean;
  is_flagged?: boolean;
  is_deleted?: boolean;
  feed_boost?: number;
  created_at: string;
  updated_at: string;
};

export type ThreadListResponse = {
  data: ThreadOut[];
  page: number;
  limit: number;
  total: number;
};

export type FollowingFeedListResponse = {
  data: FeedItem[];
  limit: number;
  next_cursor: string | null;
  mode: "home" | "following";
};

export type TabKey = "MyFeed" | "Following" | "Explore" | "Mine";

export type TabState = {
  threads: ThreadOut[];
  total: number;
  page: number;
  nextCursor: string | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasFetched: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function uniqueByThreadId(items: ThreadOut[]): ThreadOut[] {
  const seen = new Set<string>();
  const unique: ThreadOut[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
}

function toThreadOut(item: FeedItem): ThreadOut {
  return {
    ...item,
    like_count: 0,
    liked_by_me: false,
    author_is_bot: false,
  };
}

function toThreadOutList(items: FeedItem[]): ThreadOut[] {
  return items.map(toThreadOut);
}

export function createEmptyTabState(): TabState {
  return {
    threads: [],
    total: 0,
    page: 1,
    nextCursor: null,
    loading: false,
    loadingMore: false,
    error: null,
    hasFetched: false,
  };
}

export function createInitialTabStateMap(): Record<TabKey, TabState> {
  return {
    MyFeed: createEmptyTabState(),
    Following: createEmptyTabState(),
    Explore: createEmptyTabState(),
    Mine: createEmptyTabState(),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type UseThreadsPageReturn = {
  tab: TabKey;
  setTab: (tab: TabKey) => void;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  tabState: Record<TabKey, TabState>;
  setTabState: React.Dispatch<React.SetStateAction<Record<TabKey, TabState>>>;
  topRefreshing: Record<TabKey, boolean>;
  setTabBucket: (tabKey: TabKey, next: (state: TabState) => TabState) => void;
  loadMore: () => Promise<void>;
  refreshTop: () => Promise<void>;
  handleThreadCreated: (thread: ThreadOut) => void;
  handleThreadUpdated: (updated: ThreadOut) => void;
  handleThreadLike: (threadId: string, currentlyLiked: boolean) => Promise<void>;
  handleThreadDeleted: (threadId: string) => void;
  topicsSkipped: boolean;
  setTopicsSkipped: (v: boolean) => void;
  mineAuthorId: string;
};

export type ExploreOptions = {
  topicsOnly?: boolean;
  excludeOwn?: boolean;
  followingPriority?: boolean;
};

export function useThreadsPage(
  tab: TabKey,
  setTab: (tab: TabKey) => void,
  sortMode: SortMode,
  debouncedSearch: string,
  topicsSelected: boolean,
  topicsSkipped: boolean,
  setTopicsSkipped: (v: boolean) => void,
  topicsLoading: boolean,
  exploreOptions: ExploreOptions = {},
): Omit<UseThreadsPageReturn, "tab" | "setTab" | "sortMode" | "setSortMode" | "topicsSkipped" | "setTopicsSkipped"> {
  const { user } = useAuthStore();

  const [tabState, setTabState] = useState<Record<TabKey, TabState>>(() => createInitialTabStateMap());
  const [topRefreshing, setTopRefreshing] = useState<Record<TabKey, boolean>>({
    MyFeed: false,
    Following: false,
    Explore: false,
    Mine: false,
  });

  const queryVersionRef = useRef<Record<TabKey, number>>({
    MyFeed: 0,
    Following: 0,
    Explore: 0,
    Mine: 0,
  });
  const mineQueryKeyRef = useRef("");

  const mineAuthorId = user?.id ?? "";
  const mineQueryKey = `${mineAuthorId}|${debouncedSearch}`;

  function buildMineQuery(p: number) {
    const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE), sort: "newest" });
    if (mineAuthorId) params.set("author_id", mineAuthorId);
    if (debouncedSearch) params.set("search", debouncedSearch);
    return `threads?${params.toString()}`;
  }

  function buildSearchQuery(p: number) {
    const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE), sort: "newest" });
    params.set("search", debouncedSearch);
    return `threads?${params.toString()}`;
  }

  function setTabBucket(tabKey: TabKey, next: (state: TabState) => TabState) {
    setTabState(prev => ({ ...prev, [tabKey]: next(prev[tabKey]) }));
  }

  async function requestFirstPage(tabKey: TabKey): Promise<{ threads: ThreadOut[]; total: number; nextCursor: string | null; page: number }> {
    // When search is active, bypass feed APIs and hit /threads directly for all tabs
    if (debouncedSearch && tabKey !== "Mine") {
      const res = await apiGet<ThreadListResponse>(buildSearchQuery(1));
      return { threads: res.data, total: res.total, nextCursor: null, page: 1 };
    }
    if (tabKey === "Mine") {
      const res = await apiGet<ThreadListResponse>(buildMineQuery(1));
      return { threads: res.data, total: res.total, nextCursor: null, page: 1 };
    }
    if (tabKey === "MyFeed") {
      const res = await getMyFeed(sortMode, { limit: PAGE_SIZE });
      const threads = toThreadOutList(res.data);
      return { threads, total: threads.length, nextCursor: res.next_cursor, page: 1 };
    }
    if (tabKey === "Explore") {
      const res = await getExploreFeed(sortMode, { limit: PAGE_SIZE, ...exploreOptions });
      const threads = toThreadOutList(res.data);
      return { threads, total: threads.length, nextCursor: res.next_cursor, page: 1 };
    }
    // Following
    const res = await apiGet<FollowingFeedListResponse>(`feed/following?limit=${PAGE_SIZE}`);
    const threads = toThreadOutList(res.data);
    return { threads, total: threads.length, nextCursor: res.next_cursor, page: 1 };
  }

  async function loadFirstPage(tabKey: TabKey) {
    const requestVersion = queryVersionRef.current[tabKey] + 1;
    queryVersionRef.current[tabKey] = requestVersion;
    setTabBucket(tabKey, state => ({ ...state, loading: true, error: null }));
    try {
      const next = await requestFirstPage(tabKey);
      if (queryVersionRef.current[tabKey] !== requestVersion) return;
      setTabBucket(tabKey, state => ({
        ...state,
        threads: next.threads,
        total: next.total,
        page: next.page,
        nextCursor: next.nextCursor,
        loading: false,
        loadingMore: false,
        error: null,
        hasFetched: true,
      }));
    } catch (e: unknown) {
      if (queryVersionRef.current[tabKey] !== requestVersion) return;
      setTabBucket(tabKey, state => ({
        ...state,
        loading: false,
        loadingMore: false,
        error: e instanceof Error ? e.message : "Failed to load threads",
        hasFetched: true,
      }));
    }
  }

  // Auto-fetch on tab switch
  useEffect(() => {
    if (tab === "Mine") return;
    if (tab === "MyFeed" && topicsLoading) return; // wait for topics to resolve
    if (tab === "MyFeed" && !topicsSelected && !topicsSkipped) return; // show topic picker
    if (tabState[tab].hasFetched) return;
    void loadFirstPage(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, tabState.MyFeed.hasFetched, tabState.Following.hasFetched, tabState.Explore.hasFetched, topicsSelected, topicsSkipped, topicsLoading]);

  // Reload MyFeed/Explore when sortMode changes
  useEffect(() => {
    if (tab !== "MyFeed" && tab !== "Explore") return;
    setTabBucket(tab, () => createEmptyTabState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortMode]);

  // Reload current tab when search changes (all tabs)
  const prevSearchRef = useRef(debouncedSearch);
  useEffect(() => {
    if (prevSearchRef.current === debouncedSearch) return;
    prevSearchRef.current = debouncedSearch;
    setTabBucket(tab, () => createEmptyTabState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Auto-fetch Mine tab
  useEffect(() => {
    if (tab !== "Mine" || !mineAuthorId) return;
    const shouldFetch = !tabState.Mine.hasFetched || mineQueryKeyRef.current !== mineQueryKey;
    if (!shouldFetch) return;
    mineQueryKeyRef.current = mineQueryKey;
    void loadFirstPage("Mine");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, mineAuthorId, mineQueryKey, tabState.Mine.hasFetched]);

  // Redirect away from protected tabs when logged out
  useEffect(() => {
    if (!user?.id && (tab === "Mine" || tab === "MyFeed" || tab === "Following")) {
      setTab("Explore");
    }
  }, [tab, user?.id, setTab]);

  // Clear Mine + MyFeed state on logout
  useEffect(() => {
    if (user?.id) return;
    mineQueryKeyRef.current = "";
    setTabState(prev => ({ ...prev, Mine: createEmptyTabState(), MyFeed: createEmptyTabState() }));
  }, [user?.id]);

  async function loadMore() {
    const current = tabState[tab];
    if (current.loading || current.loadingMore) return;
    const requestVersion = queryVersionRef.current[tab];
    setTabBucket(tab, state => ({ ...state, loadingMore: true }));
    try {
      if (tab === "Mine") {
        if (current.threads.length >= current.total) return;
        const nextPage = current.page + 1;
        const res = await apiGet<ThreadListResponse>(buildMineQuery(nextPage));
        if (requestVersion !== queryVersionRef.current[tab]) return;
        setTabBucket(tab, state => ({
          ...state,
          threads: uniqueByThreadId([...state.threads, ...res.data]),
          page: nextPage,
          total: res.total,
        }));
        return;
      }

      if (!current.nextCursor) return;
      let nextThreads: ThreadOut[];
      let nextCursor: string | null;
      if (tab === "MyFeed") {
        const res = await getMyFeed(sortMode, { cursor: current.nextCursor, limit: PAGE_SIZE });
        nextThreads = toThreadOutList(res.data);
        nextCursor = res.next_cursor;
      } else if (tab === "Explore") {
        const res = await getExploreFeed(sortMode, { cursor: current.nextCursor, limit: PAGE_SIZE, ...exploreOptions });
        nextThreads = toThreadOutList(res.data);
        nextCursor = res.next_cursor;
      } else {
        const cursorParam = encodeURIComponent(current.nextCursor);
        const res = await apiGet<FollowingFeedListResponse>(`feed/following?limit=${PAGE_SIZE}&cursor=${cursorParam}`);
        nextThreads = toThreadOutList(res.data);
        nextCursor = res.next_cursor;
      }
      if (requestVersion !== queryVersionRef.current[tab]) return;
      setTabBucket(tab, state => {
        const merged = uniqueByThreadId([...state.threads, ...nextThreads]);
        return {
          ...state,
          threads: merged,
          nextCursor,
          total: merged.length,
        };
      });
    } catch {
      // ignore load-more errors to avoid interrupting reading flow
    } finally {
      setTabBucket(tab, state => ({ ...state, loadingMore: false }));
    }
  }

  async function refreshTop() {
    if (tab === "Mine" || topRefreshing[tab]) return;
    setTopRefreshing(prev => ({ ...prev, [tab]: true }));
    try {
      const latest = await requestFirstPage(tab);
      setTabBucket(tab, state => {
        const merged = uniqueByThreadId([...latest.threads, ...state.threads]);
        return {
          ...state,
          threads: merged,
          total: merged.length,
          page: 1,
          nextCursor: latest.nextCursor,
          hasFetched: true,
          error: null,
        };
      });
    } catch {
      // keep current content when refresh fails
    } finally {
      setTopRefreshing(prev => ({ ...prev, [tab]: false }));
    }
  }

  function handleThreadCreated(thread: ThreadOut) {
    setTabBucket(tab, state => {
      const merged = uniqueByThreadId([thread, ...state.threads]);
      return {
        ...state,
        threads: merged,
        total: tab === "Mine" ? Math.max(state.total + 1, merged.length) : merged.length,
      };
    });
  }

  function handleThreadUpdated(updated: ThreadOut) {
    const patch = (ts: ThreadOut[]) => ts.map(item => (item.id === updated.id ? updated : item));
    setTabState(prev => ({
      MyFeed:    { ...prev.MyFeed,    threads: patch(prev.MyFeed.threads) },
      Following: { ...prev.Following, threads: patch(prev.Following.threads) },
      Explore:   { ...prev.Explore,   threads: patch(prev.Explore.threads) },
      Mine:      { ...prev.Mine,      threads: patch(prev.Mine.threads) },
    }));
  }

  async function handleThreadLike(threadId: string, currentlyLiked: boolean) {
    if (!user) return;
    const patch = (ts: ThreadOut[]) => ts.map(item =>
      item.id === threadId
        ? { ...item, liked_by_me: !currentlyLiked, like_count: item.like_count + (currentlyLiked ? -1 : 1) }
        : item
    );
    setTabState(prev => ({
      MyFeed:    { ...prev.MyFeed,    threads: patch(prev.MyFeed.threads) },
      Following: { ...prev.Following, threads: patch(prev.Following.threads) },
      Explore:   { ...prev.Explore,   threads: patch(prev.Explore.threads) },
      Mine:      { ...prev.Mine,      threads: patch(prev.Mine.threads) },
    }));
    try {
      await apiPost(`threads/${threadId}/like`, {});
    } catch {
      const revert = (ts: ThreadOut[]) => ts.map(item =>
        item.id === threadId
          ? { ...item, liked_by_me: currentlyLiked, like_count: item.like_count + (currentlyLiked ? 1 : -1) }
          : item
      );
      setTabState(prev => ({
        MyFeed:    { ...prev.MyFeed,    threads: revert(prev.MyFeed.threads) },
        Following: { ...prev.Following, threads: revert(prev.Following.threads) },
        Explore:   { ...prev.Explore,   threads: revert(prev.Explore.threads) },
        Mine:      { ...prev.Mine,      threads: revert(prev.Mine.threads) },
      }));
    }
  }

  function handleThreadDeleted(threadId: string, currentThreads: ThreadOut[]) {
    const removedInCurrentTab = currentThreads.some(item => item.id === threadId);
    if (!removedInCurrentTab) return;
    const filter = (ts: ThreadOut[]) => ts.filter(item => item.id !== threadId);
    const sub = (prev: TabState) => Math.max(0, prev.total - (prev.threads.some(item => item.id === threadId) ? 1 : 0));
    setTabState(prev => ({
      MyFeed:    { ...prev.MyFeed,    threads: filter(prev.MyFeed.threads),    total: sub(prev.MyFeed) },
      Following: { ...prev.Following, threads: filter(prev.Following.threads), total: sub(prev.Following) },
      Explore:   { ...prev.Explore,   threads: filter(prev.Explore.threads),   total: sub(prev.Explore) },
      Mine:      { ...prev.Mine,      threads: filter(prev.Mine.threads),      total: sub(prev.Mine) },
    }));
  }

  return {
    tabState,
    setTabState,
    topRefreshing,
    setTabBucket,
    loadMore,
    refreshTop,
    handleThreadCreated,
    handleThreadUpdated,
    handleThreadLike,
    handleThreadDeleted: (threadId: string) => handleThreadDeleted(threadId, tabState[tab].threads),
    mineAuthorId,
  };
}
