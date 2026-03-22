"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Edit2, Globe, Link as LinkIcon, Lock, MapPin, MoreHorizontal } from "lucide-react";

import ConnectionButton from "@/components/shared/ConnectionButton";
import FollowButton from "@/components/shared/FollowButton";
import type { PublicProfilePayload } from "@/lib/profileApi";
import { avatarSeed, initials } from "@/lib/workspaceUtils";


function formatJoinDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
}

type ProfileHeaderProps = {
  publicProfile: PublicProfilePayload;
  isOwnProfile: boolean;
  isAdmin: boolean;
  threadTotal: number;
  isFollowing: boolean;
  followsYou: boolean;
  followersCount: number;
  followingCount: number;
  isPrivate: boolean;
  onFollowChange: (following: boolean, followersCount: number, followingCount: number) => void;
  onTogglePrivacy: () => void;
  onOpenAdminEdit: () => void;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
  mobileMenuOpen: boolean;
  mobileMenuRef: React.RefObject<HTMLDivElement | null>;
  onToggleMobileMenu: () => void;
  onCloseMobileMenu: () => void;
};

export default function ProfileHeader({
  publicProfile,
  isOwnProfile,
  isAdmin,
  threadTotal,
  isFollowing,
  followsYou,
  followersCount,
  followingCount,
  isPrivate,
  onFollowChange,
  onTogglePrivacy,
  onOpenAdminEdit,
  onOpenFollowers,
  onOpenFollowing,
  mobileMenuOpen,
  mobileMenuRef,
  onToggleMobileMenu,
  onCloseMobileMenu,
}: ProfileHeaderProps) {
  const router = useRouter();
  const [accentA, accentB] = avatarSeed(publicProfile.user.id);
  const bannerFallbackStyle = {
    background: `linear-gradient(135deg, ${accentA}30 0%, ${accentB}22 58%, ${accentA}10 100%)`,
  };

  const avatarCls = "rounded-full border-[5px] border-background object-cover shadow-xl";
  const avatarEl = publicProfile.user.avatar_url ? (
    <img
      src={publicProfile.user.avatar_url}
      alt={publicProfile.user.display_name}
      className={`${avatarCls} size-[96px] sm:size-[200px] md:size-[240px]`}
    />
  ) : (
    <div
      className={`${avatarCls} grid place-items-center font-serif font-bold text-white size-[96px] text-[28px] sm:size-[200px] sm:text-[60px] md:size-[240px] md:text-[72px]`}
      style={{ background: `linear-gradient(135deg, ${accentA}, ${accentB})` }}
    >
      {initials(publicProfile.user.display_name)}
    </div>
  );

  return (
    <>
      {/* ── Banner ── aspect-[4/1], overflow:visible so avatar can protrude */}
      <div className="relative w-full aspect-[4/1]">

        {/* Inner clipping layer — keeps image/gradient inside 4:1 bounds */}
        <div
          className="absolute inset-0 overflow-hidden bg-card-hover"
          style={publicProfile.basics.banner_url ? undefined : bannerFallbackStyle}
        >
          {publicProfile.basics.banner_url && (
            <img
              src={publicProfile.basics.banner_url}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>

        {/* Back button — top-left inside banner */}
        <div className="absolute left-4 top-4 z-20">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-[13px] font-medium text-white backdrop-blur-sm transition-all hover:bg-black/50 cursor-pointer"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            Back
          </button>
        </div>

        {/* Avatar — mobile: left-4 half-overlap; desktop: left-[78px] 1/3-overlap */}
        <div className="absolute bottom-0 z-10 left-4 translate-y-1/2 sm:left-[78px] sm:translate-y-1/3">
          {avatarEl}
        </div>
      </div>

      {/* ── Profile info — pt accounts for avatar protrusion (60px half + 16px gap) ── */}
      <div className="px-4 pt-[64px] pb-5 sm:px-7 sm:pt-[68px]">

        {/* Action buttons row — right-aligned */}
        <div className="mb-5 flex items-center justify-end gap-3">
          {isPrivate && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
              <Lock size={11} strokeWidth={2.5} />
              Private
            </span>
          )}

          {/* Desktop actions */}
          <div className="hidden items-center gap-3 sm:flex">
            {isOwnProfile ? (
              <>
                <button
                  type="button"
                  onClick={onTogglePrivacy}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-[13px] font-medium text-foreground transition-all hover:bg-card-hover cursor-pointer"
                >
                  {isPrivate ? <Lock size={13} strokeWidth={2} /> : <Globe size={13} strokeWidth={2} />}
                  {isPrivate ? "Private" : "Public"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/profile/manage")}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-primary/90 cursor-pointer"
                >
                  <Edit2 size={13} strokeWidth={2} />
                  Manage Profile
                </button>
              </>
            ) : (
              <>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={onOpenAdminEdit}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-[13px] font-medium text-foreground transition-all hover:bg-card-hover cursor-pointer"
                  >
                    <Edit2 size={13} strokeWidth={2} />
                    Admin Edit
                  </button>
                )}
                <ConnectionButton userId={publicProfile.user.id} />
                <FollowButton
                  userId={publicProfile.user.id}
                  initialFollowing={isFollowing}
                  followsYou={followsYou}
                  onFollowChange={onFollowChange}
                />
              </>
            )}
          </div>

          {/* Mobile overflow menu */}
          <div className="relative sm:hidden" ref={mobileMenuRef}>
            <button
              type="button"
              onClick={onToggleMobileMenu}
              aria-label="Profile actions"
              className="grid size-9 place-items-center rounded-full border border-border bg-background text-foreground/60 transition-colors hover:text-foreground cursor-pointer"
            >
              <MoreHorizontal size={16} />
            </button>

            {mobileMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[210px] rounded-[18px] border border-border bg-background p-1.5 shadow-xl">
                {isOwnProfile ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { onCloseMobileMenu(); onTogglePrivacy(); }}
                      className="flex w-full items-center gap-2 rounded-[14px] px-3 py-2.5 text-[13px] text-foreground/70 transition-colors hover:bg-card-hover hover:text-foreground"
                    >
                      {isPrivate ? <Lock size={13} /> : <Globe size={13} />}
                      {isPrivate ? "Make public" : "Make private"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { onCloseMobileMenu(); router.push("/profile/manage"); }}
                      className="flex w-full items-center gap-2 rounded-[14px] px-3 py-2.5 text-[13px] text-foreground/70 transition-colors hover:bg-card-hover hover:text-foreground"
                    >
                      <Edit2 size={13} />
                      Manage Profile
                    </button>
                  </>
                ) : (
                  <>
                    <div onClick={onCloseMobileMenu}><ConnectionButton userId={publicProfile.user.id} /></div>
                    <div onClick={onCloseMobileMenu}>
                      <FollowButton
                        userId={publicProfile.user.id}
                        initialFollowing={isFollowing}
                        followsYou={followsYou}
                        onFollowChange={onFollowChange}
                      />
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => { onCloseMobileMenu(); onOpenAdminEdit(); }}
                        className="flex w-full items-center gap-2 rounded-[14px] px-3 py-2.5 text-[13px] text-foreground/70 transition-colors hover:bg-card-hover hover:text-foreground"
                      >
                        <Edit2 size={13} />
                        Admin Edit
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
          <h1 className="font-serif text-[32px] font-bold leading-tight text-foreground max-sm:text-[26px]">
            {publicProfile.user.display_name}
          </h1>
          {publicProfile.user.is_bot && (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              Automated
            </span>
          )}
        </div>

        {/* Username */}
        <div className="mb-3 text-[14px] font-medium text-foreground/60">@{publicProfile.user.username}</div>

        {/* Headline */}
        {publicProfile.basics.headline && (
          <p className="mb-3 max-w-[680px] text-[16px] leading-relaxed text-foreground max-sm:text-[15px]">
            {publicProfile.basics.headline}
          </p>
        )}

        {/* Bio */}
        {publicProfile.user.bio && (
          <p className="mb-4 max-w-[680px] text-[14px] leading-relaxed text-foreground/80">{publicProfile.user.bio}</p>
        )}

        {/* Location / website */}
        <div className="mb-4 flex flex-wrap items-center gap-4 text-[14px] text-foreground/70">
          {publicProfile.basics.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} strokeWidth={2} />
              {publicProfile.basics.location}
            </span>
          )}
          {publicProfile.basics.website && (
            <a
              href={publicProfile.basics.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              <LinkIcon size={14} strokeWidth={2} />
              {publicProfile.basics.website}
            </a>
          )}
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-4 text-[14px] text-foreground/70">
          <button
            type="button"
            onClick={onOpenFollowers}
            className="border-none bg-transparent p-0 hover:text-primary transition-colors cursor-pointer"
          >
            <span className="font-bold text-foreground">{followersCount}</span> followers
          </button>
          <span className="text-border">·</span>
          <button
            type="button"
            onClick={onOpenFollowing}
            className="border-none bg-transparent p-0 hover:text-primary transition-colors cursor-pointer"
          >
            <span className="font-bold text-foreground">{followingCount}</span> following
          </button>
          <span className="text-border">·</span>
          <span>
            <span className="font-bold text-foreground">{threadTotal}</span> {threadTotal === 1 ? "thread" : "threads"}
          </span>
          <span className="text-border">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={13} strokeWidth={2} />
            Joined {formatJoinDate(publicProfile.user.created_at)}
          </span>
        </div>
      </div>
    </>
  );
}
