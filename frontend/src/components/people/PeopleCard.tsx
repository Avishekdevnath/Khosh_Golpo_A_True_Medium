"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Users } from "lucide-react";

import ConnectionButton from "@/components/shared/ConnectionButton";
import FollowButton from "@/components/shared/FollowButton";
import { canonicalProfilePath } from "@/lib/profileRouting";
import { avatarSeed, initials } from "@/lib/workspaceUtils";
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

  return (
    <article className="grid gap-2.5 rounded-2xl border border-app-border bg-app-bg px-4 py-3.5 transition-colors duration-150 hover:border-[#252d48] hover:bg-[#101525]">

      {/* Row 1: identity */}
      <div className="flex min-w-0 items-center gap-2.5">
        <Link href={profileHref} className="group flex min-w-0 flex-1 items-center gap-2.5 no-underline">
          {/* Avatar */}
          <div
            className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${av1}, ${av2})` }}
          >
            {initials(personState.display_name || personState.username)}
          </div>

          {/* Identity text */}
          <div className="grid min-w-0 gap-px">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-bold text-[#dde4f5] transition-colors duration-150 group-hover:text-white">
                {personState.display_name}
              </span>
              {personState.role !== "member" && (
                <span className="rounded-full border border-purple-500/28 bg-purple-500/12 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-accent-purple">
                  {personState.role}
                </span>
              )}
            </div>
            <span className="text-xs text-[#5e6a8a]">@{personState.username}</span>
          </div>
        </Link>
      </div>

      {/* Reason pill */}
      {personState.reason.label && (
        <div className="flex min-w-0 items-center">
          <span
            className="inline-flex max-w-full items-center truncate rounded-full border border-orange-500/20 bg-orange-500/[0.06] px-2.5 py-1 text-[10px] font-bold leading-tight text-[#d99874]"
            title={personState.reason.label}
          >
            {personState.reason.label}
          </span>
        </div>
      )}

      {/* Row 2: bio */}
      {bioText && (
        <p className="m-0 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
          {bioText}
        </p>
      )}

      {/* Row 3: meta + signals */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] text-[#505870]">
          <Users size={11} />
          {followersCount}
        </span>
        {personState.follows_you && (
          <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/20 bg-orange-500/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-[#d4a76a]">
            Follows you
          </span>
        )}
        {personState.shared_interest_count > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-[#a9a3f5]">
            <Sparkles size={10} />
            {personState.shared_interest_count} shared
          </span>
        )}
        {personState.shared_interest_count === 0 && personState.mutual_follow_count > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-green-400/18 bg-green-400/[0.05] px-1.5 py-0.5 text-[10px] font-semibold text-[#72ceaa]">
            {personState.mutual_follow_count} mutual
          </span>
        )}
      </div>

      {/* Row 4: actions */}
      <div className="flex gap-2 [&>*]:flex-1 [&_button]:h-8 [&_button]:min-h-8 [&_button]:justify-center [&_button]:px-2.5 [&_button]:py-1.5 [&_button]:text-xs">
        <FollowButton
          userId={personState.id}
          initialFollowing={personState.is_following}
          followsYou={personState.follows_you}
          onFollowChange={(isFollowing, nextFollowersCount) => {
            setPersonState((c) => ({ ...c, is_following: isFollowing }));
            setFollowersCount(nextFollowersCount);
            scheduleRevalidate(onRelationshipChange);
          }}
        />
        <ConnectionButton
          userId={personState.id}
          initialStatus={toConnectionStatus(personState)}
          skipStatusFetch
          onConnectionChange={(status) => {
            setPersonState((c) => ({ ...c, ...status }));
            scheduleRevalidate(onRelationshipChange);
          }}
        />
      </div>
    </article>
  );
}
