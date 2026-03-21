// frontend/src/components/profile/UserProfileWorkspace.tsx
"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import WorkspaceShell from "@/components/app/WorkspaceShell";
import PageLoader from "@/components/shared/PageLoader";
import FollowersModal from "@/components/shared/FollowersModal";
import { useAuthStore } from "@/store/authStore";
import { useUserProfile } from "./useUserProfile";
import ProfileHeader from "./ProfileHeader";
import ProfileThreads from "./ProfileThreads";
import AdminEditModal from "./AdminEditModal";

// ─── Profile skeleton ─────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div>
      <Skeleton className="h-[148px] w-full rounded-t-[13px]" />
      <div className="px-7 pb-7">
        <Skeleton variant="circle" className="size-[88px] -mt-11 mb-4 border-4 border-app-panel" />
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
  } = useUserProfile(userId);

  const isOwnProfile = Boolean(currentUser && profileUser && currentUser.id === profileUser.id);
  const isAdmin = currentUser?.role === "admin";

  if (loading && !profileUser) {
    return <PageLoader />;
  }

  return (
    <WorkspaceShell wrapPanel={false}>
      <section className="ws-panel main-panel">
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
              <ProfileHeader
                profileUser={profileUser}
                isOwnProfile={isOwnProfile}
                isAdmin={isAdmin}
                threadTotal={threadTotal}
                isFollowing={isFollowing}
                followsYou={followsYou}
                followersCount={followersCount}
                followingCount={followingCount}
                onFollowChange={(following, fCount, fgCount) => {
                  setIsFollowing(following);
                  setFollowersCount(fCount);
                  setFollowingCount(fgCount);
                }}
                mobileMenuOpen={mobileMenuOpen}
                mobileMenuRef={mobileMenuRef}
                onToggleMobileMenu={toggleMobileMenu}
                onCloseMobileMenu={closeMobileMenu}
                onOpenAdminEdit={openAdminEdit}
                onOpenFollowers={openFollowersModal}
                onOpenFollowing={openFollowingModal}
              />

              <ProfileThreads
                threads={threads}
                threadTotal={threadTotal}
                threadsLoading={threadsLoading}
                profileUser={profileUser}
                isOwnProfile={isOwnProfile}
              />

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
