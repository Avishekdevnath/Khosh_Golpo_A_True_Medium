"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Users } from "lucide-react";

import PeopleWorkspaceShell from "@/components/people/PeopleWorkspaceShell";
import ConnectionButton from "@/components/shared/ConnectionButton";
import FollowButton from "@/components/shared/FollowButton";
import { useAllPeople } from "@/hooks/usePeople";
import { avatarSeed, initials } from "@/lib/workspaceUtils";
import { canonicalProfilePath } from "@/lib/profileRouting";
import { useAuthStore } from "@/store/authStore";

/* Skeleton row while loading */
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3.5 px-2 animate-pulse">
      <div className="size-11 shrink-0 rounded-full bg-card-hover" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="h-3.5 w-32 rounded-full bg-card-hover" />
        <div className="h-3 w-20 rounded-full bg-card-hover" />
      </div>
      <div className="flex gap-1.5 shrink-0">
        <div className="h-8 w-8 sm:w-20 rounded-full bg-card-hover" />
        <div className="h-8 w-8 sm:w-20 rounded-full bg-card-hover" />
      </div>
    </div>
  );
}

export default function PeopleExploreWorkspace() {
  const [pageCount, setPageCount] = useState(1);
  const { data, total, isLoading, isLoadingMore, error, hasMore, mutate } = useAllPeople(pageCount);
  const { user: currentUser } = useAuthStore();

  return (
    <PeopleWorkspaceShell>

      {/* Loading */}
      {isLoading && (
        <div className="divide-y divide-border/60">
          {[...Array(8)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/[0.07]">
            <Users size={20} strokeWidth={1.5} className="text-destructive/70" />
          </div>
          <p className="m-0 text-[13.5px] font-medium text-foreground">Failed to load</p>
          <p className="m-0 text-[12.5px] text-foreground/50">Try refreshing the page.</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && data.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-card-hover">
            <Users size={22} strokeWidth={1.5} className="text-foreground/40" />
          </div>
          <p className="m-0 text-[14px] font-semibold text-foreground">No people yet</p>
          <p className="m-0 text-[13px] text-foreground/50">Check back as more people join the community.</p>
        </div>
      )}

      {/* List */}
      {!isLoading && !error && data.length > 0 && (
        <>
          {/* Member count header */}
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-foreground/40">
              {total.toLocaleString()} member{total !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="divide-y divide-border/50 sm:rounded-[18px] sm:border sm:border-border sm:overflow-hidden -mx-6 sm:mx-0">
            {data.map(person => {
              const [av1, av2] = avatarSeed(person.id);
              const label = person.display_name || person.username;
              const href = canonicalProfilePath({
                id: person.id,
                username: person.username,
                profile_slug: person.profile_slug,
              });

              return (
                <div
                  key={person.id}
                  className="group flex items-center gap-3 px-6 sm:px-4 py-3.5 bg-background transition-colors hover:bg-card-hover"
                >
                  {/* Avatar */}
                  <Link href={href} className="shrink-0 no-underline" tabIndex={-1} aria-hidden>
                    {person.avatar_url ? (
                      <img
                        src={person.avatar_url}
                        alt={label}
                        className="size-11 rounded-full object-cover border border-border/50"
                      />
                    ) : (
                      <div
                        className="flex size-11 items-center justify-center rounded-full text-[13px] font-bold text-white border border-white/10"
                        style={{ background: `linear-gradient(135deg,${av1},${av2})` }}
                      >
                        {initials(label)}
                      </div>
                    )}
                  </Link>

                  {/* Identity */}
                  <div className="flex-1 min-w-0">
                    <Link href={href} className="no-underline block">
                      <span className="block text-[14px] font-semibold text-foreground hover:text-primary transition-colors truncate leading-tight">
                        {label}
                      </span>
                    </Link>
                    <span className="text-[12px] text-foreground/50">@{person.username}</span>
                    {person.bio && (
                      <p className="m-0 mt-0.5 text-[12px] text-foreground/60 line-clamp-1">
                        {person.bio}
                      </p>
                    )}
                  </div>

                  {/* Actions — skip for own row */}
                  {person.id !== currentUser?.id && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Mobile: icon only */}
                      <div className="flex items-center gap-1.5 sm:hidden">
                        <ConnectionButton
                          userId={person.id}
                          initialStatus={{
                            is_connected: person.is_connected,
                            has_pending_request: person.has_pending_request,
                            is_requester: person.is_requester,
                            pending_request_id: person.pending_request_id,
                            can_message: person.can_message,
                            blocked_by_me: person.blocked_by_me,
                            blocked_you: person.blocked_you,
                          }}
                          skipStatusFetch
                          iconOnly
                          onConnectionChange={() => { void mutate(); }}
                        />
                        <FollowButton
                          userId={person.id}
                          initialFollowing={person.is_following}
                          followsYou={person.follows_you}
                          iconOnly
                          onFollowChange={() => { void mutate(); }}
                        />
                      </div>
                      {/* Desktop: with labels */}
                      <div className="hidden sm:flex items-center gap-1.5">
                        <ConnectionButton
                          userId={person.id}
                          initialStatus={{
                            is_connected: person.is_connected,
                            has_pending_request: person.has_pending_request,
                            is_requester: person.is_requester,
                            pending_request_id: person.pending_request_id,
                            can_message: person.can_message,
                            blocked_by_me: person.blocked_by_me,
                            blocked_you: person.blocked_you,
                          }}
                          skipStatusFetch
                          onConnectionChange={() => { void mutate(); }}
                        />
                        <FollowButton
                          userId={person.id}
                          initialFollowing={person.is_following}
                          followsYou={person.follows_you}
                          onFollowChange={() => { void mutate(); }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="mt-5 text-center">
              <button
                type="button"
                disabled={isLoadingMore}
                onClick={() => setPageCount(c => c + 1)}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-transparent px-6 py-2.5 text-[13px] font-medium text-foreground/60 transition-all hover:bg-card-hover hover:text-foreground disabled:opacity-50 cursor-pointer"
              >
                {isLoadingMore && <Loader2 size={13} className="animate-spin" />}
                {isLoadingMore ? "Loading…" : `Show more · ${data.length} of ${total}`}
              </button>
            </div>
          )}
        </>
      )}

    </PeopleWorkspaceShell>
  );
}
