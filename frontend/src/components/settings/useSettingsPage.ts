"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

// ── Types ────────────────────────────────────────────────────────────────────

export type Tab = "profile" | "feed" | "password" | "activity";
export type ActivityCategory = "all" | "security" | "content" | "account" | "system";

export type ActivityItem = {
  id: string;
  action: string;
  actor_id: string | null;
  target_type: string;
  target_id: string | null;
  severity: "info" | "warning" | "critical";
  result: "success" | "failed";
  request_id: string | null;
  ip: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

type ActivityListResponse = {
  data: ActivityItem[];
  page: number;
  limit: number;
  total: number;
};

export type Msg = { type: "ok" | "err"; text: string } | null;

// ── Slug cooldown helper ──────────────────────────────────────────────────────

function slugCooldownDaysLeft(changedAt: string | null | undefined): number {
  if (!changedAt) return 0;
  const cooldownUntil = new Date(changedAt).getTime() + 30 * 24 * 60 * 60 * 1000;
  const diff = cooldownUntil - Date.now();
  return diff > 0 ? Math.ceil(diff / (24 * 60 * 60 * 1000)) : 0;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSettingsPage() {
  const router = useRouter();
  const { user, accessToken, setUser } = useAuthStore();
  const [authHydrated, setAuthHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>("profile");

  // ── Profile ────────────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [gender, setGender] = useState(user?.gender ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<Msg>(null);

  // ── Slug ───────────────────────────────────────────────────────────────────
  const slugCooldownLeft = slugCooldownDaysLeft(user?.profile_slug_changed_at);
  const slugLocked = slugCooldownLeft > 0;
  const [slugDraft, setSlugDraftRaw] = useState(user?.profile_slug ?? user?.username ?? "");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [slugMessage, setSlugMessage] = useState("");
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugMsg, setSlugMsg] = useState<Msg>(null);

  function setSlugDraft(raw: string) {
    setSlugDraftRaw(raw.toLowerCase().replace(/[^a-z0-9._]/g, ""));
  }

  // ── Password ───────────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [favAnimal, setFavAnimal] = useState("");
  const [favPerson, setFavPerson] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<Msg>(null);

  // ── Activity ───────────────────────────────────────────────────────────────
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [activityCategory, setActivityCategory] = useState<ActivityCategory>("all");
  const [activityPage, setActivityPage] = useState(1);
  const activityLimit = 12;
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  // ── Effects ────────────────────────────────────────────────────────────────

  // Sync form fields when user changes
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? "");
      setLastName(user.last_name ?? "");
      setGender(user.gender ?? "");
      setBio(user.bio ?? "");
      setSlugDraftRaw(user.profile_slug ?? user.username ?? "");
    }
  }, [user]);

  // Slug availability check
  useEffect(() => {
    if (slugLocked) return;
    const normalized = slugDraft.trim().toLowerCase();
    if (!normalized || normalized === (user?.profile_slug ?? user?.username)) {
      setSlugStatus("idle");
      setSlugMessage("");
      return;
    }
    setSlugStatus("checking");
    const t = setTimeout(async () => {
      try {
        const res = await apiGet<{ available: boolean; reason?: string }>(
          `users/me/profile-slug/check?slug=${encodeURIComponent(normalized)}`
        );
        if (res.available) {
          setSlugStatus("available");
          setSlugMessage("Available");
        } else {
          setSlugStatus("taken");
          setSlugMessage(res.reason ?? "Not available");
        }
      } catch {
        setSlugStatus("invalid");
        setSlugMessage("Could not check availability");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [slugDraft, user?.profile_slug, user?.username, slugLocked]);

  // Activity log fetch
  useEffect(() => {
    if (tab !== "activity") return;
    let cancelled = false;
    const loadActivity = async () => {
      setActivityLoading(true);
      setActivityError(null);
      try {
        const query = new URLSearchParams({
          page: String(activityPage),
          limit: String(activityLimit),
          category: activityCategory,
        }).toString();
        const res = await apiGet<ActivityListResponse>(`users/me/activity?${query}`);
        if (cancelled) return;
        setActivityItems(res.data);
        setActivityTotal(res.total);
      } catch {
        if (cancelled) return;
        setActivityError("Failed to load activity log.");
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    };
    void loadActivity();
    return () => { cancelled = true; };
  }, [activityCategory, activityLimit, activityPage, tab]);

  // Auth hydration + guard
  useEffect(() => {
    setAuthHydrated(useAuthStore.persist.hasHydrated());
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => setAuthHydrated(true));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authHydrated) return;
    if (user && accessToken) return;
    router.replace("/login?from=/settings");
  }, [accessToken, authHydrated, router, user]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  async function handleProfileSave() {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const updated = await apiPatch<typeof user>("users/me", {
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        gender: gender || null,
        bio: bio.trim() || null,
      });
      setUser(updated!);
      setProfileMsg({ type: "ok", text: "Profile updated" });
    } catch {
      setProfileMsg({ type: "err", text: "Failed to update profile" });
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleSlugSave() {
    setSlugSaving(true);
    setSlugMsg(null);
    try {
      const updated = await apiPost<typeof user>("users/me/profile-slug", {
        slug: slugDraft.trim().toLowerCase(),
      });
      setUser(updated!);
      setSlugMsg({ type: "ok", text: "Profile URL updated" });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Failed to update";
      setSlugMsg({ type: "err", text: msg });
    } finally {
      setSlugSaving(false);
    }
  }

  async function handlePasswordChange() {
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: "err", text: "Passwords do not match" });
      return;
    }
    if (newPassword.length < 6) {
      setPwMsg({ type: "err", text: "Password must be at least 6 characters" });
      return;
    }
    if (!currentPassword && !recoveryCode && !favAnimal && !favPerson) {
      setPwMsg({ type: "err", text: "Provide your current password or a security answer" });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      await apiPost<{ message: string }>("auth/change-password", {
        new_password: newPassword,
        ...(currentPassword ? { current_password: currentPassword } : {}),
        ...(recoveryCode ? { recovery_code: recoveryCode } : {}),
        ...(favAnimal ? { fav_animal: favAnimal } : {}),
        ...(favPerson ? { fav_person: favPerson } : {}),
      });
      setPwMsg({ type: "ok", text: "Password changed successfully" });
      setCurrentPassword("");
      setRecoveryCode("");
      setFavAnimal("");
      setFavPerson("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPwMsg({ type: "err", text: "Verification failed — check your current password or security answers" });
    } finally {
      setPwSaving(false);
    }
  }

  return {
    // auth
    authHydrated,
    user,
    accessToken,
    // tabs
    tab,
    setTab,
    // profile
    firstName, setFirstName,
    lastName, setLastName,
    gender, setGender,
    bio, setBio,
    profileSaving, profileMsg,
    handleProfileSave,
    // slug
    slugLocked, slugCooldownLeft,
    slugDraft, setSlugDraft,
    slugStatus, slugMessage,
    slugSaving, slugMsg,
    handleSlugSave,
    // password
    currentPassword, setCurrentPassword,
    recoveryCode, setRecoveryCode,
    favAnimal, setFavAnimal,
    favPerson, setFavPerson,
    newPassword, setNewPassword,
    confirmPassword, setConfirmPassword,
    pwSaving, pwMsg,
    handlePasswordChange,
    // activity
    activityItems, activityCategory, setActivityCategory,
    activityPage, setActivityPage,
    activityLimit, activityTotal,
    activityLoading, activityError,
  };
}
