"use client";

import { useRouter } from "next/navigation";
import { Bookmark, Lock, MessageSquare } from "lucide-react";

import {
  formatCertificationTimeline,
  formatTimelineRange,
  getRenderableOverviewSections,
  type PublicProfilePayload,
  type ProfileTabKey,
} from "@/lib/profileViewModel";
import type { ThreadOut } from "@/lib/profileApi";
import { relativeTime } from "@/lib/workspaceUtils";


function ThreadCard({ thread, onClick }: { thread: ThreadOut; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-[16px] border border-border bg-background/50 px-5 py-5 text-left transition-all hover:bg-card-hover hover:border-border/80 cursor-pointer group"
    >
      <p className="mb-2.5 text-[16px] font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">{thread.title}</p>
      {thread.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {thread.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border/60 bg-background px-2.5 py-1 text-[12px] font-medium text-foreground/70"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 text-[13px] text-foreground/60">
        <span className="inline-flex items-center gap-1.5">
          <MessageSquare size={13} strokeWidth={2} />
          {thread.post_count} {thread.post_count === 1 ? "reply" : "replies"}
        </span>
        <span className="ml-auto">{relativeTime(thread.created_at)}</span>
      </div>
    </button>
  );
}


function TabSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((index) => (
        <div key={index} className="h-[86px] animate-pulse rounded-[18px] bg-card-hover" />
      ))}
    </div>
  );
}


function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[18px] border border-dashed border-border/50 bg-background/30 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border/60 bg-background text-foreground/50">
        {icon}
      </div>
      <p className="text-[15px] font-semibold text-foreground">{title}</p>
      <p className="max-w-md text-[14px] leading-relaxed text-foreground/70">{description}</p>
    </div>
  );
}


function ActivityLockedState({ displayName }: { displayName: string }) {
  return (
    <div className="rounded-[20px] border border-border bg-card px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-border bg-background text-text-tertiary">
        <Lock size={20} />
      </div>
      <p className="mb-2 text-[15px] font-semibold text-foreground">Activity is private</p>
      <p className="mx-auto max-w-md text-[13px] leading-relaxed text-text-secondary">
        {displayName} only exposes the professional overview publicly right now. Threads and replies stay visible to
        approved viewers.
      </p>
    </div>
  );
}


function OverviewSectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[18px] border border-border bg-background/40 px-5 py-5">
      <h2 className="mb-5 font-serif text-[24px] font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}


function OverviewPanel({ profile }: { profile: PublicProfilePayload }) {
  const sections = getRenderableOverviewSections(profile);

  if (sections.length === 0) {
    return (
      <EmptyState
        icon={<Bookmark size={20} />}
        title="Nothing public yet"
        description="This professional profile has not published any overview sections yet."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) => {
        if (section.key === "about") {
          return (
            <OverviewSectionCard key={section.key} title={section.title}>
              <p className="text-[15px] leading-relaxed text-foreground">{section.body}</p>
            </OverviewSectionCard>
          );
        }

        if (section.key === "skills") {
          return (
            <OverviewSectionCard key={section.key} title={section.title}>
              <div className="flex flex-wrap gap-2">
                {section.items.map((skill) => (
                  <span
                    key={skill.id}
                    className="rounded-full border border-border bg-card-hover px-3 py-1 text-[12px] font-medium text-foreground"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </OverviewSectionCard>
          );
        }

        if (section.key === "contact") {
          return (
            <OverviewSectionCard key={section.key} title={section.title}>
              <div className="grid gap-3">
                {section.items.map((item) => (
                  <div key={item.id} className="rounded-[16px] border border-border bg-card px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
                      {item.label ?? item.type}
                    </div>
                    <div className="mt-1 text-[14px] text-foreground break-all">{item.value}</div>
                  </div>
                ))}
              </div>
            </OverviewSectionCard>
          );
        }

        return (
          <OverviewSectionCard key={section.key} title={section.title}>
            <div className="flex flex-col gap-3">
              {section.key === "experience" &&
                section.items.map((item) => (
                  <div key={item.id} className="rounded-[16px] border border-border bg-card px-4 py-3">
                    <div className="text-[15px] font-semibold text-foreground">{item.title}</div>
                    <div className="mt-1 text-[13px] text-text-secondary">{item.company}</div>
                    {formatTimelineRange(item.start_date, item.end_date, item.is_current) && (
                      <div className="mt-2 text-[12px] font-medium text-text-tertiary">
                        {formatTimelineRange(item.start_date, item.end_date, item.is_current)}
                      </div>
                    )}
                    {item.description && <div className="mt-2 text-[13px] leading-6 text-text-secondary">{item.description}</div>}
                  </div>
                ))}
              {section.key === "education" &&
                section.items.map((item) => (
                  <div key={item.id} className="rounded-[16px] border border-border bg-card px-4 py-3">
                    <div className="text-[15px] font-semibold text-foreground">{item.school}</div>
                    {item.degree && <div className="mt-1 text-[13px] text-text-secondary">{item.degree}</div>}
                    {formatTimelineRange(item.start_date, item.end_date, item.is_current) && (
                      <div className="mt-2 text-[12px] font-medium text-text-tertiary">
                        {formatTimelineRange(item.start_date, item.end_date, item.is_current)}
                      </div>
                    )}
                    {item.description && <div className="mt-2 text-[13px] leading-6 text-text-secondary">{item.description}</div>}
                  </div>
                ))}
              {section.key === "projects" &&
                section.items.map((item) => (
                  <div key={item.id} className="rounded-[16px] border border-border bg-card px-4 py-3">
                    <div className="text-[15px] font-semibold text-foreground">{item.name}</div>
                    {item.role && <div className="mt-1 text-[13px] text-text-secondary">{item.role}</div>}
                    {formatTimelineRange(item.start_date, item.end_date, item.is_ongoing) && (
                      <div className="mt-2 text-[12px] font-medium text-text-tertiary">
                        {formatTimelineRange(item.start_date, item.end_date, item.is_ongoing)}
                      </div>
                    )}
                    {item.description && <div className="mt-2 text-[13px] leading-6 text-text-secondary">{item.description}</div>}
                  </div>
                ))}
              {section.key === "certifications" &&
                section.items.map((item) => (
                  <div key={item.id} className="rounded-[16px] border border-border bg-card px-4 py-3">
                    <div className="text-[15px] font-semibold text-foreground">{item.name}</div>
                    {item.issuer && <div className="mt-1 text-[13px] text-text-secondary">{item.issuer}</div>}
                    {formatCertificationTimeline(item.issue_date, item.expiry_date) && (
                      <div className="mt-2 text-[12px] font-medium text-text-tertiary">
                        {formatCertificationTimeline(item.issue_date, item.expiry_date)}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </OverviewSectionCard>
        );
      })}
    </div>
  );
}


function ThreadList({
  threads,
  loading,
  emptyTitle,
  emptyDescription,
  icon,
}: {
  threads: ThreadOut[];
  loading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  icon: React.ReactNode;
}) {
  const router = useRouter();

  if (loading) return <TabSkeleton />;

  if (threads.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} icon={icon} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {threads.map((thread) => (
        <ThreadCard key={thread.id} thread={thread} onClick={() => router.push(`/threads/${thread.id}`)} />
      ))}
    </div>
  );
}


type ProfileContentProps = {
  activeTab: ProfileTabKey;
  publicProfile: PublicProfilePayload;
  isOwnProfile: boolean;
  threads: ThreadOut[];
  threadTotal: number;
  threadsLoading: boolean;
  replies: ThreadOut[];
  repliesLoading: boolean;
  savedThreads: ThreadOut[];
  savedLoading: boolean;
};

export default function ProfileContent({
  activeTab,
  publicProfile,
  isOwnProfile,
  threads,
  threadTotal,
  threadsLoading,
  replies,
  repliesLoading,
  savedThreads,
  savedLoading,
}: ProfileContentProps) {
  const isLockedActivity = !publicProfile.viewer.can_view_activity && !isOwnProfile && activeTab !== "overview";

  return (
    <div className="px-7 pb-10 pt-6 max-sm:px-3.5 max-sm:pt-4">
      {activeTab === "overview" && <OverviewPanel profile={publicProfile} />}

      {isLockedActivity && <ActivityLockedState displayName={publicProfile.user.display_name} />}

      {!isLockedActivity && activeTab === "threads" && (
        <>
          <div className="mb-3.5 flex items-baseline gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-tertiary">Threads</span>
            {threadTotal > 0 && <span className="text-[11px] font-bold text-text-tertiary">{threadTotal}</span>}
          </div>
          <ThreadList
            threads={threads}
            loading={threadsLoading}
            icon={<MessageSquare size={20} />}
            emptyTitle="No threads yet"
            emptyDescription={
              isOwnProfile
                ? "Start a conversation in the threads section."
                : `${publicProfile.user.display_name} has not posted any threads yet.`
            }
          />
        </>
      )}

      {!isLockedActivity && activeTab === "replies" && (
        <>
          <div className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-text-tertiary">Replies</div>
          <ThreadList
            threads={replies}
            loading={repliesLoading}
            icon={<MessageSquare size={20} />}
            emptyTitle="No replies yet"
            emptyDescription={
              isOwnProfile
                ? "You have not replied to any threads yet."
                : `${publicProfile.user.display_name} has not replied to any threads yet.`
            }
          />
        </>
      )}

      {!isLockedActivity && activeTab === "saved" && isOwnProfile && (
        <>
          <div className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-text-tertiary">Saved</div>
          <ThreadList
            threads={savedThreads}
            loading={savedLoading}
            icon={<Bookmark size={20} />}
            emptyTitle="No saved threads"
            emptyDescription="Threads you save will appear here."
          />
        </>
      )}
    </div>
  );
}
