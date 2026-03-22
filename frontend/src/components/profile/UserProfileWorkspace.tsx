"use client";

import { useRouter } from "next/navigation";

import WorkspaceShell from "@/components/app/WorkspaceShell";
import FollowersModal from "@/components/shared/FollowersModal";
import PageLoader from "@/components/shared/PageLoader";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";

import AdminEditModal from "./AdminEditModal";
import ProfileContent from "./ProfileContent";
import ProfileHeader from "./ProfileHeader";
import ProfileTabs from "./ProfileTabs";
import { useUserProfile } from "./useUserProfile";


function ProfileSkeleton() {
  return (
    <div>
      {/* Banner with overlapping avatar — mirrors ProfileHeader layout */}
      <div className="relative w-full aspect-[4/1]">
        <Skeleton className="absolute inset-0 w-full h-full" />
        <div className="absolute bottom-0 left-6 translate-y-1/2 z-10">
          <Skeleton variant="circle" className="size-[120px] rounded-full border-4 border-background" />
        </div>
      </div>
      <div className="px-7 pt-[84px] pb-7 max-sm:px-4 max-sm:pt-[68px]">
        <Skeleton variant="text" className="mb-2 h-8 w-2/5" />
        <Skeleton variant="text" className="mb-3 h-4 w-1/4" />
        <Skeleton variant="text" className="mb-2 h-4 w-3/5" />
        <Skeleton variant="text" className="mb-6 h-4 w-2/5" />
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="mb-3 h-[90px] rounded-[18px]" />
        ))}
      </div>
    </div>
  );
}


type UserProfileWorkspaceProps = {
  userId: string;
};

export default function UserProfileWorkspace({ userId }: UserProfileWorkspaceProps) {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const {
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
    savedThreads,
    savedLoading,
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

  if (loading && !publicProfile) {
    return <PageLoader />;
  }

  return (
    <WorkspaceShell wrapPanel={false}>
      <section className="ws-panel flex flex-col overflow-hidden">
        <div className="relative flex-1 overflow-y-auto pb-10 ws-scroll">
          {loading && <ProfileSkeleton />}

          {!loading && error && (
            <div className="mx-6 mt-[60px] flex items-center justify-between gap-3 rounded-[12px] border border-destructive/35 bg-destructive/[0.08] p-4 text-[13px] text-destructive/90 max-sm:mx-3.5 max-sm:mt-[50px] max-sm:flex-col max-sm:text-center">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => router.push("/threads")}
                className="rounded-[8px] border border-destructive/30 px-3 py-1.5 text-xs transition-opacity hover:opacity-80"
              >
                Go to Threads
              </button>
            </div>
          )}

          {!loading && !error && publicProfile && (
            <>
              <ProfileHeader
                publicProfile={publicProfile}
                isOwnProfile={isOwnProfile}
                isAdmin={isAdmin}
                threadTotal={threadTotal}
                isFollowing={isFollowing}
                followsYou={followsYou}
                followersCount={followersCount}
                followingCount={followingCount}
                isPrivate={isPrivate}
                onFollowChange={(following, followerCount, followingValue) => {
                  setIsFollowing(following);
                  setFollowersCount(followerCount);
                  setFollowingCount(followingValue);
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

              <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} isOwnProfile={isOwnProfile} />

              <ProfileContent
                activeTab={activeTab}
                publicProfile={publicProfile}
                isOwnProfile={isOwnProfile}
                threads={threads}
                threadTotal={threadTotal}
                threadsLoading={threadsLoading}
                replies={replies}
                repliesLoading={repliesLoading}
                savedThreads={savedThreads}
                savedLoading={savedLoading}
              />

              {followersModalOpen && (
                <FollowersModal userId={publicProfile.user.id} type={modalType} onClose={closeFollowersModal} />
              )}
              {followingModalOpen && (
                <FollowersModal userId={publicProfile.user.id} type={modalType} onClose={closeFollowingModal} />
              )}

              <AdminEditModal
                open={adminEditOpen}
                onClose={closeAdminEdit}
                displayName={editDisplayName}
                bio={editBio}
                saving={editSaving}
                msg={editMsg}
                onDisplayNameChange={setEditDisplayName}
                onBioChange={setEditBio}
                onSave={() => void handleAdminEditSave()}
              />
            </>
          )}
        </div>
      </section>
    </WorkspaceShell>
  );
}
