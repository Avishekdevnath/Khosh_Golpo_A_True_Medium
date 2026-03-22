"use client";

import { ArrowLeft, ClipboardList, Key, Sparkles, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import PageLoader from "@/components/shared/PageLoader";
import WorkspaceShell from "@/components/app/WorkspaceShell";
import { Avatar } from "@/components/ui/avatar";
import { TabBar } from "@/components/ui/tab-bar";
import { avatarSeed } from "@/lib/workspaceUtils";

import { useSettingsPage, type Tab } from "./useSettingsPage";
import { ProfileSection } from "./ProfileSection";
import { PasswordSection } from "./PasswordSection";
import { ActivitySection } from "./ActivitySection";
import FeedTopicsSettings from "./FeedTopicsSettings";

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS: { value: Tab; label: string; icon: typeof UserIcon }[] = [
  { value: "profile", label: "Account", icon: UserIcon },
  { value: "feed", label: "Feed", icon: Sparkles },
  { value: "password", label: "Password", icon: Key },
  { value: "activity", label: "Activity", icon: ClipboardList },
];

// ── Orchestrator ──────────────────────────────────────────────────────────────

export default function SettingsWorkspace() {
  const router = useRouter();
  const s = useSettingsPage();

  if (!s.authHydrated || !s.user || !s.accessToken) {
    return <PageLoader />;
  }

  const [av1, av2] = avatarSeed(s.user.id);

  return (
    <WorkspaceShell wrapPanel={false}>
      <section className="ws-panel flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-10 ws-scroll">

          {/* ── Top bar ── */}
          <div className="flex items-center gap-3.5 px-7 py-4 border-b border-app-border shrink-0">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-app-border bg-transparent px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all duration-150 hover:text-foreground hover:border-border-strong hover:bg-card-hover font-[inherit]"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <h1 className="font-serif text-xl font-bold m-0">Settings</h1>
          </div>

          {/* ── User header + tabs ── */}
          <div className="px-7 pt-6 border-b border-app-border">
            <div className="flex items-center gap-3.5 mb-5">
              <Avatar
                name={s.user.display_name}
                size="lg"
                className="shrink-0"
                style={{ background: `linear-gradient(135deg,${av1},${av2})` } as React.CSSProperties}
              />
              <div className="min-w-0">
                <div className="text-base font-bold text-foreground">{s.user.display_name}</div>
                <div className="text-[13px] text-muted-foreground mt-0.5">@{s.user.username}</div>
              </div>
            </div>

            <TabBar
              tabs={TABS.map(t => ({ value: t.value, label: t.label }))}
              activeTab={s.tab}
              onChange={v => s.setTab(v as Tab)}
            />
          </div>

          {/* ── Content ── */}
          <div className={["px-7 pt-7", s.tab === "feed" ? "max-w-[720px]" : "max-w-[520px]"].join(" ")}>

            {s.tab === "profile" && (
              <ProfileSection
                username={s.user.username}
                firstName={s.firstName}
                lastName={s.lastName}
                gender={s.gender}
                bio={s.bio}
                profileSaving={s.profileSaving}
                profileMsg={s.profileMsg}
                setFirstName={s.setFirstName}
                setLastName={s.setLastName}
                setGender={s.setGender}
                setBio={s.setBio}
                onProfileSave={s.handleProfileSave}
                slugLocked={s.slugLocked}
                slugCooldownLeft={s.slugCooldownLeft}
                slugDraft={s.slugDraft}
                slugStatus={s.slugStatus}
                slugMessage={s.slugMessage}
                slugSaving={s.slugSaving}
                slugMsg={s.slugMsg}
                setSlugDraft={s.setSlugDraft}
                onSlugSave={s.handleSlugSave}
              />
            )}

            {s.tab === "feed" && <FeedTopicsSettings />}

            {s.tab === "password" && (
              <PasswordSection
                currentPassword={s.currentPassword}
                recoveryCode={s.recoveryCode}
                favAnimal={s.favAnimal}
                favPerson={s.favPerson}
                newPassword={s.newPassword}
                confirmPassword={s.confirmPassword}
                pwSaving={s.pwSaving}
                pwMsg={s.pwMsg}
                setCurrentPassword={s.setCurrentPassword}
                setRecoveryCode={s.setRecoveryCode}
                setFavAnimal={s.setFavAnimal}
                setFavPerson={s.setFavPerson}
                setNewPassword={s.setNewPassword}
                setConfirmPassword={s.setConfirmPassword}
                onPasswordChange={s.handlePasswordChange}
              />
            )}

            {s.tab === "activity" && (
              <ActivitySection
                items={s.activityItems}
                category={s.activityCategory}
                page={s.activityPage}
                limit={s.activityLimit}
                total={s.activityTotal}
                loading={s.activityLoading}
                error={s.activityError}
                actionPendingId={s.activityActionPendingId}
                onCategoryChange={s.setActivityCategory}
                onPageChange={s.setActivityPage}
                onQuickAction={s.handleActivityQuickAction}
              />
            )}
          </div>
        </div>
      </section>
    </WorkspaceShell>
  );
}
