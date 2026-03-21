// frontend/src/components/profile/ProfileContent.tsx
"use client";

import { useRouter } from "next/navigation";
import { MessageSquare, Bookmark, Clock } from "lucide-react";
import { relativeTime } from "@/lib/workspaceUtils";
import type { ProfileTab, ThreadOut, UserOut } from "./useUserProfile";

// ─── Thread card ──────────────────────────────────────────────────────────────

function ThreadCard({ thread, onClick }: { thread: ThreadOut; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left rounded-xl border border-border bg-background px-5 py-4 cursor-pointer font-sans transition-colors hover:bg-card-hover"
    >
      <p className="text-[14px] font-semibold text-foreground leading-snug mb-1.5">
        {thread.title}
      </p>
      {thread.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {thread.tags.slice(0, 3).map((tag: string) => (
            <span
              key={tag}
              className="rounded-full bg-card-hover border border-border px-2 py-0.5 text-[11px] text-text-tertiary"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 text-[12px] text-text-tertiary">
        <span className="inline-flex items-center gap-1">
          <MessageSquare size={11} />
          {thread.post_count} {thread.post_count === 1 ? "reply" : "replies"}
        </span>
        <span className="ml-auto">{relativeTime(thread.created_at)}</span>
      </div>
    </button>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TabSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2].map(i => (
        <div key={i} className="h-[76px] rounded-xl bg-card-hover animate-pulse" />
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function TabEmpty({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-card-hover text-text-tertiary">
        {icon}
      </div>
      <p className="text-[13.5px] font-medium text-foreground">{title}</p>
      <p className="text-[12.5px] text-text-secondary max-w-xs">{description}</p>
    </div>
  );
}

// ─── Thread list ──────────────────────────────────────────────────────────────

function ThreadList({
  threads,
  loading,
  emptyIcon,
  emptyTitle,
  emptyDescription,
}: {
  threads: ThreadOut[];
  loading: boolean;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const router = useRouter();

  if (loading) return <TabSkeleton />;

  if (threads.length === 0) {
    return (
      <TabEmpty
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {threads.map(t => (
        <ThreadCard
          key={t.id}
          thread={t}
          onClick={() => router.push(`/threads/${t.id}`)}
        />
      ))}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfileContentProps {
  activeTab: ProfileTab;
  profileUser: UserOut;
  isOwnProfile: boolean;

  // Threads tab
  threads: ThreadOut[];
  threadTotal: number;
  threadsLoading: boolean;

  // Replies tab
  replies: ThreadOut[];
  repliesLoading: boolean;

  // Saved tab
  savedThreads: ThreadOut[];
  savedLoading: boolean;

  // History tab
  readHistory: ThreadOut[];
  historyLoading: boolean;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProfileContent({
  activeTab,
  profileUser,
  isOwnProfile,
  threads,
  threadTotal,
  threadsLoading,
  replies,
  repliesLoading,
  savedThreads,
  savedLoading,
  readHistory,
  historyLoading,
}: ProfileContentProps) {
  const router = useRouter();

  return (
    <div className="px-7 pt-[22px] pb-10 max-sm:px-3.5 max-sm:pt-3.5 sm:max-lg:px-5">
      {/* Threads tab */}
      {activeTab === "threads" && (
        <>
          <div className="flex items-baseline gap-1.5 mb-3.5 max-sm:mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-tertiary">
              Threads
            </span>
            {threadTotal > 0 && (
              <span className="text-[11px] font-bold text-text-tertiary">{threadTotal}</span>
            )}
          </div>
          <ThreadList
            threads={threads}
            loading={threadsLoading}
            emptyIcon={<MessageSquare size={20} />}
            emptyTitle="No threads yet"
            emptyDescription={
              isOwnProfile
                ? "Start a conversation in the threads section."
                : `${profileUser.display_name} hasn't posted any threads yet.`
            }
          />
          {!threadsLoading && threadTotal > threads.length && (
            <p className="text-[11px] text-text-tertiary text-center mt-3">
              Showing {threads.length} of {threadTotal} threads
            </p>
          )}
        </>
      )}

      {/* Replies tab */}
      {activeTab === "replies" && (
        <>
          <div className="flex items-baseline gap-1.5 mb-3.5 max-sm:mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-tertiary">
              Replies
            </span>
          </div>
          <ThreadList
            threads={replies}
            loading={repliesLoading}
            emptyIcon={<MessageSquare size={20} />}
            emptyTitle="No replies yet"
            emptyDescription={
              isOwnProfile
                ? "You haven't replied to any threads yet."
                : `${profileUser.display_name} hasn't replied to any threads yet.`
            }
          />
        </>
      )}

      {/* Saved tab */}
      {activeTab === "saved" && isOwnProfile && (
        <>
          <div className="flex items-baseline gap-1.5 mb-3.5 max-sm:mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-tertiary">
              Saved
            </span>
          </div>
          <ThreadList
            threads={savedThreads}
            loading={savedLoading}
            emptyIcon={<Bookmark size={20} />}
            emptyTitle="No saved threads"
            emptyDescription="Threads you save will appear here."
          />
        </>
      )}

      {/* History tab */}
      {activeTab === "history" && isOwnProfile && (
        <>
          <div className="flex items-baseline gap-1.5 mb-3.5 max-sm:mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-tertiary">
              Read History
            </span>
          </div>
          <ThreadList
            threads={readHistory}
            loading={historyLoading}
            emptyIcon={<Clock size={20} />}
            emptyTitle="No history yet"
            emptyDescription="Threads you've read will appear here."
          />
        </>
      )}
    </div>
  );
}
