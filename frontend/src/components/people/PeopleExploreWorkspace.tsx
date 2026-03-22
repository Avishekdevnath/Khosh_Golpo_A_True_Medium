"use client";

import { useState } from "react";
import Link from "next/link";
import { LoaderCircle, Users } from "lucide-react";

import PeopleWorkspaceShell from "@/components/people/PeopleWorkspaceShell";
import ConnectionButton from "@/components/shared/ConnectionButton";
import FollowButton from "@/components/shared/FollowButton";
import { useAllPeople } from "@/hooks/usePeople";
import { avatarSeed, initials } from "@/lib/workspaceUtils";
import { canonicalProfilePath } from "@/lib/profileRouting";

export default function PeopleExploreWorkspace() {
  const [pageCount, setPageCount] = useState(1);
  const { data, total, isLoading, isLoadingMore, error, hasMore, mutate } = useAllPeople(pageCount);

  return (
    <PeopleWorkspaceShell>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 py-10 text-[13px] text-text-tertiary">
          <LoaderCircle size={15} className="animate-spin" />
          Loading…
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <p className="py-6 text-[13px] text-destructive">Failed to load. Try refreshing.</p>
      )}

      {/* Empty */}
      {!isLoading && !error && data.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-card-hover">
            <Users size={20} strokeWidth={1.5} className="text-text-tertiary" />
          </div>
          <p className="m-0 text-[13.5px] font-medium text-foreground">No people yet</p>
          <p className="m-0 text-[12.5px] text-text-tertiary">Check back as more people join.</p>
        </div>
      )}

      {/* Flat list */}
      {!isLoading && !error && data.length > 0 && (
        <>
          <p className="mb-4 text-[12.5px] text-text-tertiary">{total} members</p>

          <div className="flex flex-col divide-y divide-border">
            {data.map(person => {
              const [av1, av2] = avatarSeed(person.id);
              const label = person.display_name || person.username;
              const href = canonicalProfilePath({
                id: person.id,
                username: person.username,
                profile_slug: person.profile_slug,
              });

              return (
                <div key={person.id} className="flex items-center gap-3 py-3 hover:bg-card-hover px-1 transition-colors">
                  {/* Avatar */}
                  <Link href={href} className="shrink-0 no-underline">
                    <div
                      className="flex size-[40px] items-center justify-center rounded-full text-[13px] font-bold text-white"
                      style={{ background: `linear-gradient(135deg,${av1},${av2})` }}
                    >
                      {initials(label)}
                    </div>
                  </Link>

                  {/* Identity */}
                  <div className="flex-1 min-w-0">
                    <Link href={href} className="no-underline">
                      <span className="block text-[14px] font-semibold text-foreground hover:underline truncate">
                        {label}
                      </span>
                    </Link>
                    <span className="text-[12px] text-text-tertiary">@{person.username}</span>
                    {person.bio && (
                      <p className="m-0 mt-0.5 text-[12.5px] text-text-secondary line-clamp-1">{person.bio}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
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
              );
            })}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="mt-4 text-center">
              <button
                type="button"
                disabled={isLoadingMore}
                onClick={() => setPageCount(c => c + 1)}
                className="rounded-full border border-border bg-transparent px-6 py-2 text-[13px] text-text-secondary transition-colors hover:bg-card-hover disabled:opacity-50 font-sans"
              >
                {isLoadingMore ? "Loading…" : `Show more · ${data.length} of ${total}`}
              </button>
            </div>
          )}
        </>
      )}

    </PeopleWorkspaceShell>
  );
}
