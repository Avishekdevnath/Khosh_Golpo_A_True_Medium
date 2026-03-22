"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Edit2, Globe, Link as LinkIcon, Lock, MapPin, MoreHorizontal } from "lucide-react";

import ConnectionButton from "@/components/shared/ConnectionButton";
import FollowButton from "@/components/shared/FollowButton";
import type { PublicProfilePayload } from "@/lib/profileApi";
import { getPublicProfileCoverLayout } from "@/lib/profileCoverLayout";
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
  const coverLayout = getPublicProfileCoverLayout();
  const bannerFallbackStyle = {
    background: `linear-gradient(135deg, ${accentA}25 0%, ${accentB}18 58%, rgba(255,255,255,0) 100%), var(--card-hover)`,
  };

  return (
    <>
      <div className="absolute left-0 top-0 z-10 px-5 py-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-2 text-[13px] font-medium text-foreground backdrop-blur-sm transition-all hover:bg-card-hover cursor-pointer"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Back
        </button>
      </div>

      <div
        className={`${coverLayout.frameClassName} h-[200px] sm:h-[240px] md:h-[220px]`}
        style={publicProfile.basics.banner_url ? undefined : bannerFallbackStyle}
      >
        {publicProfile.basics.banner_url && (
          <img
            src={publicProfile.basics.banner_url}
            alt=""
            className={coverLayout.imageClassName}
          />
        )}
      </div>

      <div className="px-7 pb-7 max-sm:px-4">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div className={`${coverLayout.avatarOverlapClassName} flex items-end gap-4`}>
            {publicProfile.user.avatar_url ? (
              <img
                src={publicProfile.user.avatar_url}
                alt={publicProfile.user.display_name}
                className="size-[120px] rounded-full border-4 border-background object-cover shadow-lg max-sm:size-[96px]"
              />
            ) : (
              <div
                className="grid size-[120px] place-items-center rounded-full border-4 border-background font-serif text-[36px] font-bold text-white shadow-lg max-sm:size-[96px] max-sm:text-[28px]"
                style={{ background: `linear-gradient(135deg, ${accentA}, ${accentB})` }}
              >
                {initials(publicProfile.user.display_name)}
              </div>
            )}

            <div className="pb-1 max-sm:hidden">
              {isPrivate && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
                  <Lock size={11} strokeWidth={2.5} />
                  Private
                </span>
              )}
            </div>
          </div>

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
                  className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/8 px-3.5 py-2 text-[13px] font-semibold text-primary transition-all hover:bg-primary/12 cursor-pointer"
                >
                  <Edit2 size={13} strokeWidth={2} />
                  Manage Profile
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
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
              </div>
            )}
          </div>

          <div className="relative pb-1 sm:hidden" ref={mobileMenuRef}>
            <button
              type="button"
              onClick={onToggleMobileMenu}
              aria-label="Profile actions"
              className="grid size-9 place-items-center rounded-full border border-border bg-background text-text-secondary transition-colors hover:text-foreground"
            >
              <MoreHorizontal size={16} />
            </button>

            {mobileMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[210px] rounded-[18px] border border-border bg-background p-1.5 shadow-xl">
                {isOwnProfile ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onCloseMobileMenu();
                        onTogglePrivacy();
                      }}
                      className="flex w-full items-center gap-2 rounded-[14px] px-3 py-2.5 text-[13px] text-text-secondary transition-colors hover:bg-card-hover hover:text-foreground"
                    >
                      {isPrivate ? <Lock size={13} /> : <Globe size={13} />}
                      {isPrivate ? "Make public" : "Make private"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onCloseMobileMenu();
                        router.push("/profile/manage");
                      }}
                      className="flex w-full items-center gap-2 rounded-[14px] px-3 py-2.5 text-[13px] text-text-secondary transition-colors hover:bg-card-hover hover:text-foreground"
                    >
                      <Edit2 size={13} />
                      Manage Profile
                    </button>
                  </>
                ) : (
                  <>
                    <div onClick={onCloseMobileMenu}>
                      <ConnectionButton userId={publicProfile.user.id} />
                    </div>
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
                        onClick={() => {
                          onCloseMobileMenu();
                          onOpenAdminEdit();
                        }}
                        className="flex w-full items-center gap-2 rounded-[14px] px-3 py-2.5 text-[13px] text-text-secondary transition-colors hover:bg-card-hover hover:text-foreground"
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

        <div className="mb-2 flex flex-wrap items-center gap-2.5">
          <h1 className="font-serif text-[36px] font-bold leading-tight text-foreground max-sm:text-[28px]">
            {publicProfile.user.display_name}
          </h1>
          {publicProfile.user.is_bot && (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              Automated
            </span>
          )}
        </div>

        <div className="mb-3 text-[15px] font-medium text-text-secondary">@{publicProfile.user.username}</div>

        {publicProfile.basics.headline && (
          <p className="mb-4 max-w-[720px] text-[17px] leading-relaxed text-foreground max-sm:text-[16px]">
            {publicProfile.basics.headline}
          </p>
        )}

        {publicProfile.user.bio && (
          <p className="mb-5 max-w-[720px] text-[15px] leading-relaxed text-foreground">{publicProfile.user.bio}</p>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-4 text-[14px] text-foreground">
          {publicProfile.basics.location && (
            <span className="inline-flex items-center gap-1.5 font-medium">
              <MapPin size={14} strokeWidth={2} />
              {publicProfile.basics.location}
            </span>
          )}
          {publicProfile.basics.website && (
            <a
              href={publicProfile.basics.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              <LinkIcon size={14} strokeWidth={2} />
              {publicProfile.basics.website}
            </a>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[14px] text-foreground">
          <button
            type="button"
            onClick={onOpenFollowers}
            className="border-none bg-transparent p-0 hover:opacity-75 transition-opacity cursor-pointer font-medium"
          >
            <span className="font-bold text-primary">{followersCount}</span> followers
          </button>
          <span className="text-border">•</span>
          <button
            type="button"
            onClick={onOpenFollowing}
            className="border-none bg-transparent p-0 hover:opacity-75 transition-opacity cursor-pointer font-medium"
          >
            <span className="font-bold text-primary">{followingCount}</span> following
          </button>
          <span className="text-border">•</span>
          <span className="font-medium">
            <span className="font-bold text-primary">{threadTotal}</span> {threadTotal === 1 ? "thread" : "threads"}
          </span>
          <span className="text-border">•</span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={13} strokeWidth={2} />
            Joined {formatJoinDate(publicProfile.user.created_at)}
          </span>
        </div>
      </div>
    </>
  );
}
