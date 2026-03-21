"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Edit2, Globe, Lock, MoreHorizontal } from "lucide-react";
import FollowButton from "@/components/shared/FollowButton";
import type { UserOut } from "./useUserProfile";
import { avatarSeed, initials } from "@/lib/workspaceUtils";

function formatJoinDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long" });
}

interface ProfileHeaderProps {
  profileUser: UserOut;
  isOwnProfile: boolean;
  isAdmin: boolean;
  threadTotal: number;
  isFollowing: boolean;
  followsYou: boolean;
  followersCount: number;
  followingCount: number;
  isPrivate: boolean;
  onFollowChange: (following: boolean, fCount: number, fgCount: number) => void;
  onTogglePrivacy: () => void;
  onOpenAdminEdit: () => void;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
  mobileMenuOpen: boolean;
  mobileMenuRef: React.RefObject<HTMLDivElement | null>;
  onToggleMobileMenu: () => void;
  onCloseMobileMenu: () => void;
}

export default function ProfileHeader({
  profileUser, isOwnProfile, isAdmin, threadTotal,
  isFollowing, followsYou, followersCount, followingCount,
  isPrivate, onFollowChange, onTogglePrivacy,
  onOpenAdminEdit, onOpenFollowers, onOpenFollowing,
  mobileMenuOpen, mobileMenuRef, onToggleMobileMenu, onCloseMobileMenu,
}: ProfileHeaderProps) {
  const router = useRouter();
  const [av1, av2] = avatarSeed(profileUser.id);

  return (
    <>
      {/* Back button */}
      <div className="absolute top-0 left-0 z-10 px-5 py-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-[12px] font-medium text-text-secondary backdrop-blur-sm transition-colors hover:text-foreground cursor-pointer font-sans"
        >
          <ArrowLeft size={13} /> Back
        </button>
      </div>

      {/* Banner — light gradient using avatar seed */}
      <div
        className="h-[120px] w-full relative overflow-hidden flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${av1}26 0%, ${av2}18 60%, transparent 100%), var(--card-hover)` }}
      />

      {/* Header body */}
      <div className="px-7 pb-6 max-sm:px-4 max-sm:pb-4">

        {/* Avatar row */}
        <div className="flex items-end justify-between mb-4">
          {/* Avatar */}
          <div
            className="relative -mt-11 flex-shrink-0 size-[88px] rounded-full grid place-items-center font-serif text-[26px] font-bold text-white border-4 border-background shadow-sm max-sm:size-[72px] max-sm:text-xl max-sm:-mt-9"
            style={{ background: `linear-gradient(135deg,${av1},${av2})` }}
          >
            {initials(profileUser.display_name)}
          </div>

          {/* Actions — desktop */}
          <div className="hidden sm:flex items-center gap-2 pb-1">
            {isOwnProfile ? (
              <>
                <button
                  type="button"
                  onClick={onTogglePrivacy}
                  title={isPrivate ? "Profile is private — click to make public" : "Profile is public — click to make private"}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-[7px] text-[12px] text-text-secondary transition-colors hover:text-foreground cursor-pointer font-sans"
                >
                  {isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                  {isPrivate ? "Private" : "Public"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/settings")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-[7px] text-[12px] text-text-secondary transition-colors hover:text-foreground cursor-pointer font-sans"
                >
                  <Edit2 size={12} /> Edit profile
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={onOpenAdminEdit}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-[7px] text-[12px] text-text-secondary transition-colors hover:text-foreground cursor-pointer font-sans"
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                )}
                <FollowButton userId={profileUser.id} initialFollowing={isFollowing} followsYou={followsYou} onFollowChange={onFollowChange} />
              </div>
            )}
          </div>

          {/* Actions — mobile */}
          <div className="sm:hidden relative pb-1" ref={mobileMenuRef}>
            <button
              type="button"
              onClick={onToggleMobileMenu}
              aria-label="Profile actions"
              className="size-9 grid place-items-center rounded-full border border-border bg-background text-text-secondary transition-colors hover:text-foreground cursor-pointer font-sans"
            >
              <MoreHorizontal size={16} />
            </button>
            {mobileMenuOpen && (
              <div className="absolute top-[calc(100%+6px)] right-0 z-50 min-w-[180px] rounded-xl border border-border bg-background p-1.5 shadow-lg">
                {isOwnProfile ? (
                  <>
                    <button type="button" onClick={() => { onCloseMobileMenu(); onTogglePrivacy(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] text-text-secondary hover:bg-card-hover cursor-pointer font-sans">
                      {isPrivate ? <Lock size={13} /> : <Globe size={13} />}
                      {isPrivate ? "Make public" : "Make private"}
                    </button>
                    <button type="button" onClick={() => { onCloseMobileMenu(); router.push("/settings"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] text-text-secondary hover:bg-card-hover cursor-pointer font-sans">
                      <Edit2 size={13} /> Edit profile
                    </button>
                  </>
                ) : (
                  <>
                    <div onClick={onCloseMobileMenu}>
                      <FollowButton userId={profileUser.id} initialFollowing={isFollowing} followsYou={followsYou} onFollowChange={onFollowChange} />
                    </div>
                    {isAdmin && (
                      <button type="button" onClick={() => { onCloseMobileMenu(); onOpenAdminEdit(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] text-text-secondary hover:bg-card-hover cursor-pointer font-sans">
                        <Edit2 size={13} /> Admin edit
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <h1 className="font-serif text-[22px] leading-tight text-foreground mb-0.5 break-words">
          {profileUser.display_name}
        </h1>

        {/* Username + privacy pill */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-[13px] text-text-tertiary">@{profileUser.username}</span>
          {profileUser.is_bot && <span className="text-[11px] text-primary font-medium">Automated</span>}
          {isPrivate && isOwnProfile && (
            <span className="inline-flex items-center gap-1 rounded-full bg-card-hover border border-border px-2 py-0.5 text-[11px] text-text-tertiary">
              <Lock size={9} /> Private
            </span>
          )}
        </div>

        {/* Bio */}
        {profileUser.bio && (
          <p className="text-[14px] leading-relaxed text-text-secondary mb-3 max-w-[520px] break-words">
            {profileUser.bio}
          </p>
        )}

        {/* Stats row — Medium-style inline */}
        <div className="flex items-center gap-1 text-[13px] text-text-secondary flex-wrap">
          <button onClick={onOpenFollowers} className="font-sans border-none bg-transparent p-0 cursor-pointer hover:underline">
            <strong className="text-foreground font-semibold">{followersCount}</strong>{" "}
            <span className="text-text-tertiary">followers</span>
          </button>
          <span className="text-text-tertiary mx-1">·</span>
          <button onClick={onOpenFollowing} className="font-sans border-none bg-transparent p-0 cursor-pointer hover:underline">
            <strong className="text-foreground font-semibold">{followingCount}</strong>{" "}
            <span className="text-text-tertiary">following</span>
          </button>
          <span className="text-text-tertiary mx-1">·</span>
          <span>
            <strong className="text-foreground font-semibold">{threadTotal}</strong>{" "}
            <span className="text-text-tertiary">{threadTotal === 1 ? "thread" : "threads"}</span>
          </span>
          <span className="text-text-tertiary mx-1">·</span>
          <span className="inline-flex items-center gap-1 text-text-tertiary">
            <Calendar size={11} />
            {formatJoinDate(profileUser.created_at)}
          </span>
        </div>
      </div>
    </>
  );
}
