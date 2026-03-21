// frontend/src/components/profile/ProfileHeader.tsx
"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Edit2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import FollowButton from "@/components/shared/FollowButton";
import ConnectionButton from "@/components/shared/ConnectionButton";
import type { UserOut } from "./useUserProfile";
import { avatarSeed, initials } from "@/lib/workspaceUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatJoinDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

const ROLE_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "danger"> = {
  admin: "warning",
  moderator: "secondary",
  member: "success",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfileHeaderProps {
  profileUser: UserOut;
  isOwnProfile: boolean;
  isAdmin: boolean;
  threadTotal: number;

  isFollowing: boolean;
  followsYou: boolean;
  followersCount: number;
  followingCount: number;
  onFollowChange: (following: boolean, fCount: number, fgCount: number) => void;

  mobileMenuOpen: boolean;
  mobileMenuRef: React.RefObject<HTMLDivElement | null>;
  onToggleMobileMenu: () => void;
  onCloseMobileMenu: () => void;

  onOpenAdminEdit: () => void;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileHeader({
  profileUser,
  isOwnProfile,
  isAdmin,
  threadTotal,
  isFollowing,
  followsYou,
  followersCount,
  followingCount,
  onFollowChange,
  mobileMenuOpen,
  mobileMenuRef,
  onToggleMobileMenu,
  onCloseMobileMenu,
  onOpenAdminEdit,
  onOpenFollowers,
  onOpenFollowing,
}: ProfileHeaderProps) {
  const router = useRouter();
  const [pav1, pav2] = avatarSeed(profileUser.id);

  return (
    <>
      {/* Back row — floats above cover */}
      <div className="absolute top-0 left-0 z-10 flex items-center gap-2.5 px-5 py-4">
        <button
          type="button"
          onClick={() => router.back()}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-app-border/70 bg-app-bg/70",
            "px-3 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur-md",
            "transition-all duration-150 hover:border-app-border hover:bg-app-panel/90 hover:text-foreground",
            "cursor-pointer font-sans"
          )}
        >
          <ArrowLeft size={14} /> Back
        </button>
        {isOwnProfile && (
          <span className="rounded-full border border-accent-orange/35 bg-app-bg/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.07em] text-accent-orange backdrop-blur-md">
            Your profile
          </span>
        )}
      </div>

      {/* Cover banner */}
      <div
        className="h-[148px] w-full relative overflow-hidden flex-shrink-0 rounded-t-[13px] max-sm:h-[100px] max-sm:rounded-none"
        style={{
          background: `linear-gradient(135deg, ${pav1}26 0%, ${pav2}18 50%, #0f1118 100%),
                       linear-gradient(180deg, #131828 0%, #0f1118 100%)`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse at 25% 60%, ${pav1}1f 0%, transparent 55%)` }}
        />
      </div>

      {/* Profile header body */}
      <div className="px-7 pb-6 border-b border-app-border/50 max-sm:px-3.5 max-sm:pb-4 sm:max-lg:px-5">
        {/* Avatar row */}
        <div className="flex items-end justify-between mb-3.5 max-sm:mb-2">
          {/* Avatar */}
          <div className="relative -mt-11 flex-shrink-0 max-sm:-mt-8">
            <span
              className={cn(
                "size-[88px] rounded-full grid place-items-center",
                "font-serif text-[26px] font-bold text-white",
                "border-4 border-app-panel",
                "shadow-[0_0_0_1px_var(--color-border-subtle),0_8px_28px_rgba(0,0,0,0.55)]",
                "max-sm:size-[68px] max-sm:text-xl max-sm:border-[3px]"
              )}
              style={{ background: `linear-gradient(135deg,${pav1},${pav2})` }}
            >
              {initials(profileUser.display_name)}
            </span>
            {profileUser.is_active && (
              <span className="absolute bottom-1.5 right-1 size-3 rounded-full bg-success border-[2.5px] border-app-panel max-sm:size-2.5 max-sm:bottom-0.5 max-sm:right-0.5" />
            )}
          </div>

          {/* Desktop action buttons */}
          <div className="hidden sm:flex items-end gap-2 flex-wrap justify-end">
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => router.push("/settings")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-app-border bg-app-input text-muted-foreground px-3.5 py-[7px] text-xs font-semibold transition-all duration-150 hover:border-app-border/80 hover:bg-app-panel hover:text-foreground cursor-pointer font-sans"
              >
                <Edit2 size={12} /> Edit profile
              </button>
            )}
            {!isOwnProfile && (
              <div className="flex gap-2 flex-wrap justify-end">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={onOpenAdminEdit}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-app-border bg-app-input text-muted-foreground px-3.5 py-[7px] text-xs font-semibold transition-all duration-150 hover:border-app-border/80 hover:bg-app-panel hover:text-foreground cursor-pointer font-sans"
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                )}
                <ConnectionButton userId={profileUser.id} />
                <FollowButton
                  userId={profileUser.id}
                  initialFollowing={isFollowing}
                  followsYou={followsYou}
                  onFollowChange={onFollowChange}
                />
              </div>
            )}
          </div>

          {/* Mobile "..." menu */}
          <div className="sm:hidden relative" ref={mobileMenuRef}>
            <button
              type="button"
              onClick={onToggleMobileMenu}
              aria-label="Profile actions"
              className={cn(
                "size-9 grid place-items-center rounded-[10px]",
                "border border-app-border bg-app-panel/90 backdrop-blur-md",
                "text-muted-foreground transition-all duration-150",
                "hover:border-app-border/80 hover:bg-app-input hover:text-foreground",
                "cursor-pointer font-sans"
              )}
            >
              <MoreHorizontal size={18} />
            </button>

            {mobileMenuOpen && (
              <div className="absolute top-[calc(100%+6px)] right-0 z-50 min-w-[200px] rounded-xl border border-app-border bg-app-panel p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)] animate-in fade-in slide-in-from-top-1.5 duration-150">
                {!isOwnProfile && (
                  <>
                    <div onClick={onCloseMobileMenu} className="[&>button]:!w-full [&>button]:!justify-start [&>button]:!rounded-lg [&>button]:!px-3 [&>button]:!py-2.5 [&>button]:!text-[13px] [&>button]:!font-semibold [&>button]:!border-none [&>button]:!bg-transparent [&>button]:!text-muted-foreground hover:[&>button]:!bg-white/[0.04] hover:[&>button]:!text-foreground">
                      <FollowButton
                        userId={profileUser.id}
                        initialFollowing={isFollowing}
                        followsYou={followsYou}
                        onFollowChange={onFollowChange}
                      />
                    </div>
                    <div onClick={onCloseMobileMenu} className="[&>button]:!w-full [&>button]:!justify-start [&>button]:!rounded-lg [&>button]:!px-3 [&>button]:!py-2.5 [&>button]:!text-[13px] [&>button]:!font-semibold [&>button]:!border-none [&>button]:!bg-transparent [&>button]:!text-muted-foreground hover:[&>button]:!bg-white/[0.04] hover:[&>button]:!text-foreground">
                      <ConnectionButton userId={profileUser.id} />
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => { onCloseMobileMenu(); onOpenAdminEdit(); }}
                        className="flex w-full items-center gap-2.5 rounded-lg border-none bg-transparent px-3 py-2.5 text-[13px] font-semibold text-muted-foreground transition-all duration-150 hover:bg-white/[0.04] hover:text-foreground cursor-pointer font-sans"
                      >
                        <Edit2 size={14} /> Admin Edit
                      </button>
                    )}
                  </>
                )}
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => { onCloseMobileMenu(); router.push("/settings"); }}
                    className="flex w-full items-center gap-2.5 rounded-lg border-none bg-transparent px-3 py-2.5 text-[13px] font-semibold text-muted-foreground transition-all duration-150 hover:bg-white/[0.04] hover:text-foreground cursor-pointer font-sans"
                  >
                    <Edit2 size={14} /> Edit profile
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Name + username */}
        <h1 className="font-serif text-2xl leading-tight tracking-tight text-foreground mb-1 break-words max-sm:text-[19px] max-sm:mb-0.5">
          {profileUser.display_name}
        </h1>
        {profileUser.is_bot && (
          <div className="text-xs text-accent-purple mb-0.5">Automated Account</div>
        )}
        <div className="flex items-center gap-2 mb-2.5 flex-wrap max-sm:mb-1.5">
          <span className="text-[13px] text-text-tertiary max-sm:text-xs">@{profileUser.username}</span>
          {profileUser.gender && (
            <span className="rounded-full border border-accent-purple/20 bg-accent-purple/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-accent-purple">
              {profileUser.gender}
            </span>
          )}
        </div>

        {/* Role + active badges */}
        <div className="flex flex-wrap gap-1.5 mb-3 max-sm:mb-2 max-sm:gap-1">
          <Badge variant={ROLE_VARIANT[profileUser.role] ?? "success"} size="sm">
            {profileUser.role.charAt(0).toUpperCase() + profileUser.role.slice(1)}
          </Badge>
          <Badge variant={profileUser.is_active ? "success" : "danger"} size="sm">
            {profileUser.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>

        {/* Bio */}
        {profileUser.bio && (
          <p className="text-[13.5px] leading-[1.7] text-muted-foreground mb-4 max-w-[580px] break-words max-sm:text-[13px] max-sm:leading-[1.55] max-sm:mb-3">
            {profileUser.bio}
          </p>
        )}

        {/* Follow stats */}
        <div className="flex gap-5 mb-4 max-sm:gap-3.5 max-sm:mb-2.5">
          <button
            onClick={onOpenFollowers}
            className="border-none bg-transparent p-0 font-sans text-[13px] text-muted-foreground transition-colors duration-150 hover:text-foreground cursor-pointer max-sm:text-xs"
          >
            <strong className="text-foreground font-bold">{followersCount}</strong>{" "}
            <span>followers</span>
          </button>
          <button
            onClick={onOpenFollowing}
            className="border-none bg-transparent p-0 font-sans text-[13px] text-muted-foreground transition-colors duration-150 hover:text-foreground cursor-pointer max-sm:text-xs"
          >
            <strong className="text-foreground font-bold">{followingCount}</strong>{" "}
            <span>following</span>
          </button>
        </div>

        {/* Stats row */}
        <div className="inline-flex items-center gap-4 rounded-[10px] border border-app-border bg-app-bg px-4 py-2.5 max-sm:gap-2.5 max-sm:px-3 max-sm:py-[7px] max-sm:rounded-lg max-[400px]:flex-col max-[400px]:gap-1.5 max-[400px]:w-full">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-foreground leading-none max-sm:text-sm">{threadTotal}</span>
            <span className="text-xs text-text-tertiary max-sm:text-[10px]">
              {threadTotal === 1 ? "Thread" : "Threads"}
            </span>
          </div>
          <div className="w-px h-[18px] bg-app-border max-sm:h-3.5 max-[400px]:w-full max-[400px]:h-px" />
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="text-text-tertiary" />
            <span className="text-xs text-text-tertiary max-sm:text-[10px]">
              Joined {formatJoinDate(profileUser.created_at)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
