"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { avatarSeed, initials } from "@/lib/workspaceUtils";
import { profilePathFromUsername, toProfilePath } from "@/lib/profileRouting";
import ConnectionButton from "@/components/shared/ConnectionButton";
import FollowButton from "@/components/shared/FollowButton";

// ─── Types ────────────────────────────────────────────────────────────────────

type TrendingTag = {
  tag: string;
  count: number;
};

type SuggestedUser = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  bio?: string | null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DiscoveryPanel({ onTagClick }: { onTagClick?: (tag: string) => void }) {
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  useEffect(() => {
    apiGet<{ tags: TrendingTag[] }>("threads/trending-tags?limit=10")
      .then(r => setTags(r.tags ?? []))
      .catch(() => setTags([]))
      .finally(() => setTagsLoading(false));
  }, []);

  useEffect(() => {
    apiGet<{ users: SuggestedUser[] }>("users/suggested?limit=5")
      .then(r => setUsers(r.users ?? []))
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, []);

  return (
    <aside className="hidden xl:flex flex-col w-[300px] shrink-0 border-l border-border bg-background px-5 py-6 overflow-y-auto ws-scroll">

      {/* ── Recommended topics (pill tags) ── */}
      <div className="mb-6">
        <h2 className="m-0 mb-3.5 text-[13px] font-semibold text-foreground">Recommended topics</h2>

        {tagsLoading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-8 w-20 rounded-full bg-card-hover animate-pulse" style={{ width: `${60 + (i % 3) * 20}px` }} />
            ))}
          </div>
        ) : tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map(({ tag }) => (
              <button
                key={tag}
                type="button"
                className="rounded-full bg-card-hover px-3.5 py-[7px] text-[13px] text-foreground font-sans transition-colors duration-150 hover:bg-[#e2e2e2] dark:hover:bg-card cursor-pointer"
                onClick={() => onTagClick?.(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-text-tertiary">No trending topics yet.</p>
        )}

        <a className="mt-3 block text-[13px] text-primary hover:underline cursor-pointer">
          See more topics
        </a>
      </div>

      <div className="border-t border-border mb-6" />

      {/* ── Who to follow ── */}
      <div className="mb-6">
        <h2 className="m-0 mb-3.5 text-[13px] font-semibold text-foreground">Who to follow</h2>

        {usersLoading ? (
          <div className="flex flex-col gap-3.5">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="size-[30px] rounded-full bg-card-hover animate-pulse shrink-0" />
                <div className="flex-1">
                  <div className="h-3.5 w-20 rounded bg-card-hover animate-pulse mb-1" />
                  <div className="h-3 w-32 rounded bg-card-hover animate-pulse opacity-60" />
                </div>
                <div className="h-7 w-16 rounded-full bg-card-hover animate-pulse" />
              </div>
            ))}
          </div>
        ) : users.length > 0 ? (
          <div className="flex flex-col gap-3.5">
            {users.map(u => {
              const label = u.display_name ?? u.username ?? "User";
              const href = u.username ? profilePathFromUsername(u.username) : toProfilePath(u.id);
              const [c1, c2] = avatarSeed(u.id);
              return (
                <div key={u.id} className="flex items-center gap-2.5">
                  <Link href={href} className="no-underline shrink-0">
                    <span
                      className="flex size-[30px] items-center justify-center rounded-full text-[11px] font-bold text-white"
                      style={{ background: `linear-gradient(135deg,${c1},${c2})` }}
                    >
                      {initials(label)}
                    </span>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={href} className="no-underline">
                      <p className="m-0 text-[13px] font-semibold text-foreground leading-tight truncate hover:underline">
                        {label}
                      </p>
                    </Link>
                    {u.bio && (
                      <p className="m-0 text-[12px] text-text-secondary leading-tight line-clamp-1 mt-px">
                        {u.bio}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <ConnectionButton userId={u.id} />
                    <FollowButton userId={u.id} initialFollowing={false} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[12.5px] text-text-tertiary">No suggestions yet.</p>
        )}

        <a className="mt-3 block text-[13px] text-primary hover:underline cursor-pointer">
          See more suggestions
        </a>
      </div>

      <div className="border-t border-border mb-4" />

      {/* Footer links */}
      <p className="text-[11.5px] text-text-tertiary leading-[1.8]">
        <a className="mr-2 hover:underline cursor-pointer">Help</a>
        <a className="mr-2 hover:underline cursor-pointer">Status</a>
        <a className="mr-2 hover:underline cursor-pointer">About</a>
        <a className="mr-2 hover:underline cursor-pointer">Privacy</a>
        <a className="mr-2 hover:underline cursor-pointer">Terms</a>
        <br />
        KhoshGolpo © 2025
      </p>
    </aside>
  );
}
