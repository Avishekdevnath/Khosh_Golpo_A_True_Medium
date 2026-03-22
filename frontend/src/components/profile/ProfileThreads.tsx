// frontend/src/components/profile/ProfileThreads.tsx
"use client";

import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { ThreadOut } from "@/lib/profileApi";
import type { ProfileUserSummary } from "@/lib/profileViewModel";
import { relativeTime } from "@/lib/workspaceUtils";

// ─── Thread status config ──────────────────────────────────────────────────────

const THREAD_STATUS_COLOR: Record<string, string> = {
  open: "text-success",
  closed: "text-accent-orange",
  archived: "text-text-tertiary",
};

const THREAD_STATUS_LABEL: Record<string, string> = {
  open: "Open",
  closed: "Closed",
  archived: "Archived",
};

// ─── Thread card ──────────────────────────────────────────────────────────────

function ThreadCard({ thread, onClick }: { thread: ThreadOut; onClick: () => void }) {
  const statusColor = THREAD_STATUS_COLOR[thread.status] ?? THREAD_STATUS_COLOR.open;
  const statusLabel = THREAD_STATUS_LABEL[thread.status] ?? "Open";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block w-full text-left",
        "rounded-xl border border-app-border bg-gradient-to-b from-[#111422] to-app-bg",
        "px-[18px] py-4 cursor-pointer font-sans",
        "transition-all duration-[160ms]",
        "hover:border-app-border/80 hover:from-[#141827] hover:to-[#111422]",
        "hover:shadow-[0_4px_20px_rgba(0,0,0,0.35)] hover:-translate-y-px",
        "max-sm:px-3.5 max-sm:py-3 max-sm:rounded-[10px]"
      )}
    >
      {/* Head */}
      <div className="flex items-start gap-2.5 justify-between mb-2.5">
        <span className="text-sm font-semibold text-foreground leading-[1.45] flex-1 text-left">
          {thread.title}
        </span>
        <span className={cn("text-[10px] font-bold uppercase tracking-[0.08em] flex-shrink-0 pt-0.5", statusColor)}>
          {statusLabel}
        </span>
      </div>

      {/* Tags */}
      {thread.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {thread.tags.map(tag => (
            <span
              key={tag}
              className="rounded-full border border-accent-purple/20 bg-accent-purple/10 px-2 py-0.5 text-[10px] font-semibold text-accent-purple"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 border-t border-app-border/40 pt-2.5">
        <span className="inline-flex items-center gap-1 text-[11px] text-text-tertiary">
          <MessageSquare size={11} />
          {thread.post_count} {thread.post_count === 1 ? "reply" : "replies"}
        </span>
        <span className="text-[11px] text-app-border ml-auto">
          {relativeTime(thread.created_at)}
        </span>
      </div>
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfileThreadsProps {
  threads: ThreadOut[];
  threadTotal: number;
  threadsLoading: boolean;
  profileUser: ProfileUserSummary;
  isOwnProfile: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileThreads({
  threads,
  threadTotal,
  threadsLoading,
  profileUser,
  isOwnProfile,
}: ProfileThreadsProps) {
  const router = useRouter();

  return (
    <div className="px-7 pt-[22px] max-sm:px-3.5 max-sm:pt-3.5 sm:max-lg:px-5">
      {/* Section header */}
      <div className="flex items-baseline gap-1.5 mb-3.5 max-sm:mb-2.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-tertiary">
          Threads
        </span>
        {threadTotal > 0 && (
          <span className="text-[11px] font-bold text-text-tertiary">{threadTotal}</span>
        )}
      </div>

      {/* Loading skeletons */}
      {threadsLoading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map(i => (
            <Skeleton
              key={i}
              className="h-[72px] rounded-xl border border-app-border"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!threadsLoading && threads.length === 0 && (
        <EmptyState
          icon={<MessageSquare />}
          title="No threads yet"
          description={
            isOwnProfile
              ? "Start a conversation in the threads section."
              : `${profileUser.display_name} hasn't posted any threads yet.`
          }
          className="border border-dashed border-app-border/70 rounded-[14px] py-12 max-sm:py-7"
        />
      )}

      {/* Threads list */}
      {!threadsLoading && threads.length > 0 && (
        <div className="flex flex-col gap-2">
          {threads.map(t => (
            <ThreadCard
              key={t.id}
              thread={t}
              onClick={() => router.push(`/threads/${t.id}`)}
            />
          ))}
          {threadTotal > threads.length && (
            <p className="text-[11px] text-app-border text-center mt-2.5">
              Showing {threads.length} of {threadTotal} threads
            </p>
          )}
        </div>
      )}
    </div>
  );
}
