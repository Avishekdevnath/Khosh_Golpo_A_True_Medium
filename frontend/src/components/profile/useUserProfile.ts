"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiGet, apiPatch } from "@/lib/api";
import { getFollowStatus } from "@/lib/followApi";
import {
  getPublicProfile,
  getSavedThreads,
  getUserReplies,
  type PublicProfilePayload,
  type ThreadListResponse,
  type ThreadOut,
  updateProfileBasics,
} from "@/lib/profileApi";
import type { ProfileTabKey } from "@/lib/profileViewModel";

export type ProfileTab = ProfileTabKey;

export interface UseUserProfileReturn {
  publicProfile: PublicProfilePayload | null;
  profileUser: PublicProfilePayload["user"] | null;
  threads: ThreadOut[];
  threadTotal: number;
  loading: boolean;
  error: string | null;
  threadsLoading: boolean;
  activeTab: ProfileTab;
  setActiveTab: (tab: ProfileTab) => void;
  replies: ThreadOut[];
  repliesLoading: boolean;
  repliesLoaded: boolean;
  savedThreads: ThreadOut[];
  savedLoading: boolean;
  savedLoaded: boolean;
  isPrivate: boolean;
  togglePrivacy: () => Promise<void>;
  isFollowing: boolean;
  followsYou: boolean;
  followersCount: number;
  followingCount: number;
  setIsFollowing: (v: boolean) => void;
  setFollowersCount: (v: number) => void;
  setFollowingCount: (v: number) => void;
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
  followersModalOpen: boolean;
  followingModalOpen: boolean;
  modalType: "followers" | "following";
  openFollowersModal: () => void;
  openFollowingModal: () => void;
  closeFollowersModal: () => void;
  closeFollowingModal: () => void;
  mobileMenuOpen: boolean;
  mobileMenuRef: React.RefObject<HTMLDivElement | null>;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
}

export function useUserProfile(userId: string, currentUserId?: string): UseUserProfileReturn {
  const [publicProfile, setPublicProfile] = useState<PublicProfilePayload | null>(null);
  const [threads, setThreads] = useState<ThreadOut[]>([]);
  const [threadTotal, setThreadTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threadsLoading, setThreadsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [replies, setReplies] = useState<ThreadOut[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [savedThreads, setSavedThreads] = useState<ThreadOut[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedLoaded, setSavedLoaded] = useState(false);

  const [isPrivate, setIsPrivate] = useState(false);
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

  const profileUser = publicProfile?.user ?? null;
  const canViewActivity = publicProfile?.viewer.can_view_activity ?? true;

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((open) => !open), []);

  const loadPublicProfile = useCallback(async () => {
    const payload = await getPublicProfile(userId);
    setPublicProfile(payload);
    setIsPrivate(payload.user.is_private);
    isOwnProfileRef.current = Boolean(currentUserId && currentUserId === payload.user.id);
    setEditDisplayName(payload.user.display_name);
    setEditBio(payload.user.bio ?? "");
    return payload;
  }, [currentUserId, userId]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setPublicProfile(null);
    setThreads([]);
    setThreadTotal(0);
    setRepliesLoaded(false);
    setSavedLoaded(false);
    setReplies([]);
    setSavedThreads([]);
    setActiveTab("overview");

    async function load() {
      try {
        const profile = await loadPublicProfile();
        if (cancelled) return;

        try {
          const followState = await getFollowStatus(profile.user.id);
          if (!cancelled) {
            setIsFollowing(followState.is_following);
            setFollowsYou(followState.follows_you);
            setFollowersCount(followState.followers_count);
            setFollowingCount(followState.following_count);
          }
        } catch {
          // Non-fatal.
        }

        if (profile.viewer.can_view_activity) {
          setThreadsLoading(true);
          try {
            const threadResponse = await apiGet<ThreadListResponse>(
              `threads?author_id=${encodeURIComponent(profile.user.id)}&limit=10&sort=newest`
            );
            if (!cancelled) {
              setThreads(threadResponse.data);
              setThreadTotal(threadResponse.total);
            }
          } catch {
            if (!cancelled) {
              setThreads([]);
              setThreadTotal(0);
            }
          } finally {
            if (!cancelled) {
              setThreadsLoading(false);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load profile");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [loadPublicProfile]);

  useEffect(() => {
    if (!profileUser || activeTab !== "replies" || repliesLoaded || !canViewActivity) return;
    let cancelled = false;
    setRepliesLoading(true);
    getUserReplies(profileUser.id)
      .then((response) => {
        if (cancelled) return;
        setReplies(response.data);
        setRepliesLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setRepliesLoaded(true);
      })
      .finally(() => {
        if (!cancelled) setRepliesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, canViewActivity, profileUser, repliesLoaded]);

  useEffect(() => {
    if (activeTab !== "saved" || !isOwnProfileRef.current || savedLoaded) return;
    let cancelled = false;
    setSavedLoading(true);
    getSavedThreads()
      .then((response) => {
        if (cancelled) return;
        setSavedThreads(response.data);
        setSavedLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setSavedLoaded(true);
      })
      .finally(() => {
        if (!cancelled) setSavedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, savedLoaded]);

  const togglePrivacy = useCallback(async () => {
    await updateProfileBasics({ is_private: !isPrivate });
    const refreshed = await loadPublicProfile();
    setIsPrivate(refreshed.user.is_private);
  }, [isPrivate, loadPublicProfile]);

  const openAdminEdit = useCallback(() => {
    if (!profileUser) return;
    setEditDisplayName(profileUser.display_name);
    setEditBio(profileUser.bio ?? "");
    setEditMsg(null);
    setAdminEditOpen(true);
  }, [profileUser]);

  const closeAdminEdit = useCallback(() => {
    setAdminEditOpen(false);
    setEditMsg(null);
  }, []);

  const handleAdminEditSave = useCallback(async () => {
    if (!profileUser) return;

    setEditSaving(true);
    setEditMsg(null);
    try {
      const updated = await apiPatch<typeof profileUser>(`admin/users/${profileUser.id}/profile`, {
        display_name: editDisplayName.trim(),
        bio: editBio.trim() || null,
      });

      setPublicProfile((previous) =>
        previous
          ? {
              ...previous,
              user: {
                ...previous.user,
                display_name: updated.display_name,
                bio: updated.bio,
              },
            }
          : previous
      );
      setEditMsg({ type: "ok", text: "Profile updated" });
      setAdminEditOpen(false);
    } catch (error) {
      setEditMsg({
        type: "err",
        text: error instanceof Error ? error.message : "Failed to update profile",
      });
    } finally {
      setEditSaving(false);
    }
  }, [editBio, editDisplayName, profileUser]);

  const openFollowersModal = useCallback(() => {
    setModalType("followers");
    setFollowersModalOpen(true);
  }, []);

  const openFollowingModal = useCallback(() => {
    setModalType("following");
    setFollowingModalOpen(true);
  }, []);

  const closeFollowersModal = useCallback(() => setFollowersModalOpen(false), []);
  const closeFollowingModal = useCallback(() => setFollowingModalOpen(false), []);

  return {
    publicProfile,
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
    openFollowersModal,
    openFollowingModal,
    closeFollowersModal,
    closeFollowingModal,
    mobileMenuOpen,
    mobileMenuRef,
    toggleMobileMenu,
    closeMobileMenu,
  };
}
