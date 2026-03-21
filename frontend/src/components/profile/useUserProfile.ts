// frontend/src/components/profile/useUserProfile.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import { getFollowStatus } from "@/lib/followApi";
import {
  getUserReplies,
  getSavedThreads,
  getReadHistory,
  setProfilePrivacy,
} from "@/lib/profileApi";

// ─── Shared types ──────────────────────────────────────────────────────────────

export type UserOut = {
  id: string;
  username: string;
  email: string;
  display_name: string;
  bio: string | null;
  role: "member" | "moderator" | "admin";
  is_active: boolean;
  is_bot?: boolean;
  is_private?: boolean;
  is_locked?: boolean;
  avatar_seed?: string[];
  first_name?: string | null;
  last_name?: string | null;
  gender?: string | null;
  created_at: string;
  updated_at: string;
};

export type ThreadOut = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  author_id: string;
  post_count: number;
  status: "open" | "closed" | "archived";
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

export type ThreadListResponse = {
  data: ThreadOut[];
  page: number;
  limit: number;
  total: number;
};

export type ProfileTab = "threads" | "replies" | "saved" | "history";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseUserProfileReturn {
  profileUser: UserOut | null;
  threads: ThreadOut[];
  threadTotal: number;
  loading: boolean;
  error: string | null;
  threadsLoading: boolean;

  // Tabs
  activeTab: ProfileTab;
  setActiveTab: (tab: ProfileTab) => void;

  // Replies tab
  replies: ThreadOut[];
  repliesLoading: boolean;
  repliesLoaded: boolean;

  // Saved tab
  savedThreads: ThreadOut[];
  savedLoading: boolean;
  savedLoaded: boolean;

  // History tab
  readHistory: ThreadOut[];
  historyLoading: boolean;
  historyLoaded: boolean;

  // Privacy
  isPrivate: boolean;
  togglePrivacy: () => Promise<void>;

  isFollowing: boolean;
  followsYou: boolean;
  followersCount: number;
  followingCount: number;
  setIsFollowing: (v: boolean) => void;
  setFollowersCount: (v: number) => void;
  setFollowingCount: (v: number) => void;

  // Admin edit
  adminEditOpen: boolean;
  editDisplayName: string;
  editBio: string;
  editSaving: boolean;
  editMsg: { type: "ok" | "err"; text: string } | null;
  openAdminEdit: () => void;
  closeAdminEdit: () => void;
  setEditDisplayName: (v: string) => void;
  setEditBio: (v: string) => void;
  handleAdminEditSave: () => Promise<void>;

  // Followers modal
  followersModalOpen: boolean;
  followingModalOpen: boolean;
  modalType: "followers" | "following";
  openFollowersModal: () => void;
  openFollowingModal: () => void;
  closeFollowersModal: () => void;
  closeFollowingModal: () => void;

  // Mobile menu
  mobileMenuOpen: boolean;
  mobileMenuRef: React.RefObject<HTMLDivElement | null>;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
}

export function useUserProfile(userId: string, currentUserId?: string): UseUserProfileReturn {
  const [profileUser, setProfileUser] = useState<UserOut | null>(null);
  const [threads, setThreads] = useState<ThreadOut[]>([]);
  const [threadTotal, setThreadTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threadsLoading, setThreadsLoading] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<ProfileTab>("threads");

  // Replies
  const [replies, setReplies] = useState<ThreadOut[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repliesLoaded, setRepliesLoaded] = useState(false);

  // Saved
  const [savedThreads, setSavedThreads] = useState<ThreadOut[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedLoaded, setSavedLoaded] = useState(false);

  // History
  const [readHistory, setReadHistory] = useState<ThreadOut[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Privacy
  const [isPrivate, setIsPrivate] = useState(false);

  // Own profile ref — set after profile loads
  const isOwnProfileRef = useRef(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followsYou, setFollowsYou] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"followers" | "following">("followers");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  const [adminEditOpen, setAdminEditOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen(o => !o), []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileMenuOpen]);

  // ─── Main profile load ────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProfileUser(null);
    setThreads([]);
    setThreadTotal(0);
    // Reset lazy tabs on user change
    setRepliesLoaded(false);
    setSavedLoaded(false);
    setHistoryLoaded(false);
    setReplies([]);
    setSavedThreads([]);
    setReadHistory([]);

    async function load() {
      try {
        const u = await apiGet<UserOut>(`users/${encodeURIComponent(userId)}`);
        if (cancelled) return;
        setProfileUser(u);
        setIsPrivate(u.is_private ?? false);

        // Determine own profile
        isOwnProfileRef.current = Boolean(
          currentUserId ? currentUserId === u.id : false
        );

        try {
          const fs = await getFollowStatus(u.id);
          if (!cancelled) {
            setIsFollowing(fs.is_following);
            setFollowsYou(fs.follows_you);
            setFollowersCount(fs.followers_count);
            setFollowingCount(fs.following_count);
          }
        } catch {
          // Non-fatal
        }

        setThreadsLoading(true);
        try {
          const t = await apiGet<ThreadListResponse>(
            `threads?author_id=${encodeURIComponent(u.id)}&limit=10&sort=newest`
          );
          if (!cancelled) { setThreads(t.data); setThreadTotal(t.total); }
        } catch {
          // Non-fatal
        } finally {
          if (!cancelled) setThreadsLoading(false);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [userId, currentUserId]);

  // ─── Lazy: replies tab ────────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab !== "replies" || repliesLoaded || !profileUser) return;
    let cancelled = false;
    setRepliesLoading(true);
    getUserReplies(profileUser.id).then(res => {
      if (!cancelled) { setReplies(res.data); setRepliesLoaded(true); }
    }).catch(() => {
      if (!cancelled) setRepliesLoaded(true);
    }).finally(() => {
      if (!cancelled) setRepliesLoading(false);
    });
    return () => { cancelled = true; };
  }, [activeTab, repliesLoaded, profileUser]);

  // ─── Lazy: saved tab ──────────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab !== "saved" || savedLoaded || !isOwnProfileRef.current) return;
    let cancelled = false;
    setSavedLoading(true);
    getSavedThreads().then(res => {
      if (!cancelled) { setSavedThreads(res.data); setSavedLoaded(true); }
    }).catch(() => {
      if (!cancelled) setSavedLoaded(true);
    }).finally(() => {
      if (!cancelled) setSavedLoading(false);
    });
    return () => { cancelled = true; };
  }, [activeTab, savedLoaded]);

  // ─── Lazy: history tab ────────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab !== "history" || historyLoaded || !isOwnProfileRef.current) return;
    let cancelled = false;
    setHistoryLoading(true);
    getReadHistory().then(res => {
      if (!cancelled) { setReadHistory(res.data); setHistoryLoaded(true); }
    }).catch(() => {
      if (!cancelled) setHistoryLoaded(true);
    }).finally(() => {
      if (!cancelled) setHistoryLoading(false);
    });
    return () => { cancelled = true; };
  }, [activeTab, historyLoaded]);

  // ─── Privacy toggle ───────────────────────────────────────────────────────

  async function togglePrivacy() {
    const prev = isPrivate;
    const next = !prev;
    setIsPrivate(next);
    try {
      await setProfilePrivacy(next);
    } catch {
      // Revert on error
      setIsPrivate(prev);
    }
  }

  // ─── Admin edit ───────────────────────────────────────────────────────────

  function openAdminEdit() {
    if (!profileUser) return;
    setEditDisplayName(profileUser.display_name);
    setEditBio(profileUser.bio ?? "");
    setEditMsg(null);
    setAdminEditOpen(true);
  }

  function closeAdminEdit() {
    setAdminEditOpen(false);
  }

  async function handleAdminEditSave() {
    if (!profileUser || !editDisplayName.trim()) return;
    setEditSaving(true);
    setEditMsg(null);
    try {
      const updated = await apiPatch<UserOut>(`admin/users/${profileUser.id}/profile`, {
        display_name: editDisplayName.trim(),
        bio: editBio.trim() || null,
      });
      setProfileUser(updated);
      setEditMsg({ type: "ok", text: "Profile updated" });
      setTimeout(() => setAdminEditOpen(false), 800);
    } catch {
      setEditMsg({ type: "err", text: "Failed to update profile" });
    } finally {
      setEditSaving(false);
    }
  }

  return {
    profileUser,
    threads,
    threadTotal,
    loading,
    error,
    threadsLoading,

    activeTab,
    setActiveTab,

    replies,
    repliesLoading,
    repliesLoaded,

    savedThreads,
    savedLoading,
    savedLoaded,

    readHistory,
    historyLoading,
    historyLoaded,

    isPrivate,
    togglePrivacy,

    isFollowing,
    followsYou,
    followersCount,
    followingCount,
    setIsFollowing,
    setFollowersCount,
    setFollowingCount,

    adminEditOpen,
    editDisplayName,
    editBio,
    editSaving,
    editMsg,
    openAdminEdit,
    closeAdminEdit,
    setEditDisplayName,
    setEditBio,
    handleAdminEditSave,

    followersModalOpen,
    followingModalOpen,
    modalType,
    openFollowersModal: () => { setModalType("followers"); setFollowersModalOpen(true); },
    openFollowingModal: () => { setModalType("following"); setFollowingModalOpen(true); },
    closeFollowersModal: () => setFollowersModalOpen(false),
    closeFollowingModal: () => setFollowingModalOpen(false),

    mobileMenuOpen,
    mobileMenuRef,
    toggleMobileMenu,
    closeMobileMenu,
  };
}
