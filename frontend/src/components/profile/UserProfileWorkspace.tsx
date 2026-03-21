// frontend/src/components/profile/UserProfileWorkspace.tsx
"use client";

import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import WorkspaceShell from "@/components/app/WorkspaceShell";
import PageLoader from "@/components/shared/PageLoader";
import FollowersModal from "@/components/shared/FollowersModal";
import FollowButton from "@/components/shared/FollowButton";
import { useAuthStore } from "@/store/authStore";
import { useUserProfile } from "./useUserProfile";
import type { UserOut } from "./useUserProfile";
import ProfileHeader from "./ProfileHeader";
import ProfileTabs from "./ProfileTabs";
import ProfileContent from "./ProfileContent";
import AdminEditModal from "./AdminEditModal";
import { initials } from "@/lib/workspaceUtils";

// ─── Profile skeleton ─────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div>
      <Skeleton className="h-[148px] w-full rounded-t-[13px]" />
      <div className="px-7 pb-7">
        <Skeleton variant="circle" className="size-[88px] -mt-11 mb-4 border-4 border-background" />
        <Skeleton variant="text" className="h-6 w-2/5 mb-2.5" />
        <Skeleton variant="text" className="h-3.5 w-1/4 mb-3.5" />
        <div className="flex gap-2 mb-5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton variant="text" className="h-3 w-full mb-2" />
        <Skeleton variant="text" className="h-3 w-3/5 mb-6" />
        {[0, 1, 2].map(i => (
          <Skeleton
            key={i}
            className="h-[72px] rounded-xl mb-2"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Locked wall ──────────────────────────────────────────────────────────────

function LockedWall({ profileUser }: { profileUser: UserOut }) {
  const colors = profileUser.avatar_seed ?? ["#1e3a5f", "#0ea5e9"];
  return (
    <>
      <div
        className="h-[120px] w-full"
        style={{ background: `linear-gradient(135deg, ${colors[0]}26 0%, ${colors[1]}18 60%, transparent 100%), var(--card-hover)` }}
      />
      <div className="px-7 pb-8 max-sm:px-4">
        <div
          className="-mt-11 mb-4 size-[88px] rounded-full grid place-items-center font-serif text-[26px] font-bold text-white border-4 border-background shadow-sm"
          style={{ background: `linear-gradient(135deg,${colors[0]},${colors[1]})` }}
        >
          {initials(profileUser.display_name)}
        </div>
        <h1 className="font-serif text-[22px] text-foreground mb-0.5">{profileUser.display_name}</h1>
        <p className="text-[13px] text-text-tertiary mb-3">@{profileUser.username}</p>
        {profileUser.bio && (
          <p className="text-[14px] leading-relaxed text-text-secondary mb-5 max-w-[480px]">{profileUser.bio}</p>
        )}
        <div className="flex flex-col items-center gap-3 py-10 text-center border-t border-border">
          <Lock size={20} className="text-text-tertiary" strokeWidth={1.5} />
          <p className="text-[13.5px] font-medium text-foreground">This profile is private</p>
          <p className="text-[12.5px] text-text-secondary max-w-xs">
            Connect with {profileUser.display_name} to see their threads and activity.
          </p>
          <FollowButton userId={profileUser.id} initialFollowing={false} />
        </div>
      </div>
    </>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type UserProfileWorkspaceProps = {
  userId: string;
};

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export default function UserProfileWorkspace({ userId }: UserProfileWorkspaceProps) {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const {
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

    savedThreads,
    savedLoading,

    readHistory,
    historyLoading,

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
  } = useUserProfile(userId, currentUser?.id);

  const isOwnProfile = Boolean(currentUser && profileUser && currentUser.id === profileUser.id);
  const isAdmin = currentUser?.role === "admin";

  if (loading && !profileUser) {
    return <PageLoader />;
  }

  return (
    <WorkspaceShell wrapPanel={false}>
      <section className="ws-panel flex flex-col overflow-hidden">
        <div className="flex-1 pb-10 relative ws-scroll">

          {/* Loading skeleton overlay */}
          {loading && <ProfileSkeleton />}

          {/* Error state */}
          {!loading && error && (
            <div className={cn(
              "mx-6 mt-[60px] flex items-center justify-between gap-3 rounded-[10px] p-4",
              "border border-destructive/35 bg-destructive/[0.08] text-destructive/90 text-[13px]",
              "max-sm:mx-3.5 max-sm:mt-[50px] max-sm:flex-col max-sm:text-center"
            )}>
              <span>{error}</span>
              <button
                type="button"
                onClick={() => router.push("/threads")}
                className="flex-shrink-0 rounded-[7px] border border-destructive/30 bg-transparent px-3 py-1.5 text-xs text-destructive/90 cursor-pointer font-sans transition-opacity hover:opacity-80 whitespace-nowrap"
              >
                Go to Threads
              </button>
            </div>
          )}

          {/* Profile content */}
          {!loading && !error && profileUser && (
            <>
              {profileUser.is_locked && !isOwnProfile && !isAdmin ? (
                <LockedWall profileUser={profileUser} />
              ) : (
                <>
                  <ProfileHeader
                    profileUser={profileUser}
                    isOwnProfile={isOwnProfile}
                    isAdmin={isAdmin}
                    threadTotal={threadTotal}
                    isFollowing={isFollowing}
                    followsYou={followsYou}
                    followersCount={followersCount}
                    followingCount={followingCount}
                    isPrivate={isPrivate}
                    onFollowChange={(following, fCount, fgCount) => {
                      setIsFollowing(following);
                      setFollowersCount(fCount);
                      setFollowingCount(fgCount);
                    }}
                    onTogglePrivacy={togglePrivacy}
                    mobileMenuOpen={mobileMenuOpen}
                    mobileMenuRef={mobileMenuRef}
                    onToggleMobileMenu={toggleMobileMenu}
                    onCloseMobileMenu={closeMobileMenu}
                    onOpenAdminEdit={openAdminEdit}
                    onOpenFollowers={openFollowersModal}
                    onOpenFollowing={openFollowingModal}
                  />

                  <ProfileTabs
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    isOwnProfile={isOwnProfile}
                  />

                  <ProfileContent
                    activeTab={activeTab}
                    threads={threads}
                    threadsLoading={threadsLoading}
                    threadTotal={threadTotal}
                    replies={replies}
                    repliesLoading={repliesLoading}
                    savedThreads={savedThreads}
                    savedLoading={savedLoading}
                    readHistory={readHistory}
                    historyLoading={historyLoading}
                    profileUser={profileUser}
                    isOwnProfile={isOwnProfile}
                  />
                </>
              )}

              {/* Followers/Following modals */}
              {followersModalOpen && (
                <FollowersModal
                  userId={profileUser.id}
                  type={modalType}
                  onClose={closeFollowersModal}
                />
              )}
              {followingModalOpen && (
                <FollowersModal
                  userId={profileUser.id}
                  type={modalType}
                  onClose={closeFollowingModal}
                />
              )}

              {/* Admin edit modal */}
              <AdminEditModal
                open={adminEditOpen}
                onClose={closeAdminEdit}
                displayName={editDisplayName}
                bio={editBio}
                saving={editSaving}
                msg={editMsg}
                onDisplayNameChange={setEditDisplayName}
                onBioChange={setEditBio}
                onSave={handleAdminEditSave}
              />
            </>
          )}
        </div>
      </section>
    </WorkspaceShell>
  );
}
