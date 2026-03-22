"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Users } from "lucide-react";

import ConnectionButton from "@/components/shared/ConnectionButton";
import FollowButton from "@/components/shared/FollowButton";
import { canonicalProfilePath } from "@/lib/profileRouting";
import { avatarSeed, initials } from "@/lib/workspaceUtils";
import { useAuthStore } from "@/store/authStore";
import type { ConnectionStatusResponse } from "@/types/connection";
import type { PeopleCard as PeopleCardData } from "@/types/people";

type PeopleCardProps = {
  person: PeopleCardData;
  onRelationshipChange?: () => void | Promise<void>;
};

function toConnectionStatus(person: PeopleCardData): ConnectionStatusResponse {
  return {
    is_connected: person.is_connected,
    has_pending_request: person.has_pending_request,
    is_requester: person.is_requester,
    pending_request_id: person.pending_request_id,
    can_message: person.can_message,
    blocked_by_me: person.blocked_by_me,
    blocked_you: person.blocked_you,
  };
}

function scheduleRevalidate(callback?: () => void | Promise<void>) {
  if (!callback || typeof window === "undefined") return;
  window.setTimeout(() => { void callback(); }, 450);
}

export default function PeopleCard({ person, onRelationshipChange }: PeopleCardProps) {
  const [personState, setPersonState] = useState(person);
  const [followersCount, setFollowersCount] = useState(person.followers_count);
  const { user: currentUser } = useAuthStore();
  const isOwnCard = currentUser?.id === personState.id;
  const [av1, av2] = avatarSeed(person.id);
  const profileHref = canonicalProfilePath({
    id: personState.id,
    username: personState.username,
    profile_slug: personState.profile_slug,
  });

  useEffect(() => {
    setPersonState(person);
    setFollowersCount(person.followers_count);
  }, [person]);

  const bioText = personState.bio?.trim();
  const displayName = personState.display_name || personState.username;

  return (
    <article className="group relative flex flex-col rounded-[18px] border border-border bg-background p-4 transition-all duration-200 hover:border-border/80 hover:bg-card-hover hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]">

      {/* Top row: avatar + name + action buttons */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Link href={profileHref} className="shrink-0 no-underline" tabIndex={-1} aria-hidden>
          {personState.avatar_url ? (
            <img
              src={personState.avatar_url}
              alt={displayName}
              className="size-11 rounded-full object-cover border border-border/50"
            />
          ) : (
            <div
              className="flex size-11 items-center justify-center rounded-full text-[14px] font-bold text-white border border-white/10"
              style={{ background: `linear-gradient(135deg, ${av1}, ${av2})` }}
            >
              {initials(displayName)}
            </div>
          )}
        </Link>

        {/* Name + username */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 leading-tight">
            <Link
              href={profileHref}
              className="text-[14px] font-semibold text-foreground no-underline hover:text-primary transition-colors truncate"
            >
              {displayName}
            </Link>
            {personState.role !== "member" && (
              <span className="rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-primary">
                {personState.role}
              </span>
            )}
          </div>
          <Link href={profileHref} className="text-[12px] text-foreground/50 no-underline hover:text-foreground/70 transition-colors">
            @{personState.username}
          </Link>
        </div>

        {/* Action buttons — hidden for own card */}
        <div className="flex items-center gap-1.5 shrink-0">{isOwnCard ? null : (<>
          {/* Mobile: icon-only */}
          <div className="flex items-center gap-1.5 sm:hidden">
            <FollowButton
              userId={personState.id}
              initialFollowing={personState.is_following}
              followsYou={personState.follows_you}
              iconOnly
              onFollowChange={(isFollowing, nextFollowersCount) => {
                setPersonState(c => ({ ...c, is_following: isFollowing }));
                setFollowersCount(nextFollowersCount);
                scheduleRevalidate(onRelationshipChange);
              }}
            />
            <ConnectionButton
              userId={personState.id}
              initialStatus={toConnectionStatus(personState)}
              skipStatusFetch
              iconOnly
              onConnectionChange={status => {
                setPersonState(c => ({ ...c, ...status }));
                scheduleRevalidate(onRelationshipChange);
              }}
            />
          </div>
          {/* Desktop: with labels */}
          <div className="hidden sm:flex items-center gap-1.5">
            <FollowButton
              userId={personState.id}
              initialFollowing={personState.is_following}
              followsYou={personState.follows_you}
              onFollowChange={(isFollowing, nextFollowersCount) => {
                setPersonState(c => ({ ...c, is_following: isFollowing }));
                setFollowersCount(nextFollowersCount);
                scheduleRevalidate(onRelationshipChange);
              }}
            />
            <ConnectionButton
              userId={personState.id}
              initialStatus={toConnectionStatus(personState)}
              skipStatusFetch
              onConnectionChange={status => {
                setPersonState(c => ({ ...c, ...status }));
                scheduleRevalidate(onRelationshipChange);
              }}
            />
          </div>
        </>)}</div>
      </div>

      {/* Bio — 1 line on mobile, 2 on sm+ */}
      {bioText && (
        <p className="mt-2.5 mb-0 line-clamp-1 sm:line-clamp-2 text-[12.5px] leading-[1.6] text-foreground/65">
          {bioText}
        </p>
      )}

      {/* Signals row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-[11.5px] text-foreground/50">
          <Users size={11} strokeWidth={2} />
          {followersCount.toLocaleString()} followers
        </span>

        {personState.follows_you && (
          <span className="rounded-full border border-border/60 bg-card-hover px-2 py-0.5 text-[10.5px] font-medium text-foreground/60">
            Follows you
          </span>
        )}

        {personState.shared_interest_count > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-primary/8 px-2 py-0.5 text-[10.5px] font-semibold text-primary border border-primary/15">
            <Sparkles size={9} />
            {personState.shared_interest_count} shared
          </span>
        )}

        {personState.shared_interest_count === 0 && personState.mutual_follow_count > 0 && (
          <span className="rounded-full border border-border/60 bg-card-hover px-2 py-0.5 text-[10.5px] font-medium text-foreground/60">
            {personState.mutual_follow_count} mutual
          </span>
        )}

        {personState.reason.label && (
          <span
            className="rounded-full border border-border/50 bg-card-hover px-2 py-0.5 text-[10.5px] text-foreground/50 truncate max-w-[130px]"
            title={personState.reason.label}
          >
            {personState.reason.label}
          </span>
        )}
      </div>
    </article>
  );
}
