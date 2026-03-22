"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LoaderCircle, Search, Users } from "lucide-react";

import PeopleWorkspaceShell from "@/components/people/PeopleWorkspaceShell";
import ConnectionButton from "@/components/shared/ConnectionButton";
import FollowButton from "@/components/shared/FollowButton";
import { usePeopleSearch } from "@/hooks/usePeople";
import { avatarSeed, initials } from "@/lib/workspaceUtils";
import { canonicalProfilePath } from "@/lib/profileRouting";
import type { PeopleRelationshipFilter, PeopleSearchSort } from "@/types/people";

const SORT_OPTIONS: Array<{ value: PeopleSearchSort; label: string }> = [
  { value: "relevance",     label: "Relevance" },
  { value: "most_followed", label: "Most followed" },
  { value: "newest",        label: "Newest" },
];

const RELATIONSHIP_OPTIONS: Array<{ value: PeopleRelationshipFilter; label: string }> = [
  { value: "all",           label: "All" },
  { value: "not_following", label: "Not following" },
  { value: "can_connect",   label: "Can connect" },
  { value: "connections",   label: "Connections" },
];

function parseSearchSort(v: string | null): PeopleSearchSort {
  if (v === "most_followed" || v === "newest") return v;
  return "relevance";
}
function parseRelationship(v: string | null): PeopleRelationshipFilter {
  if (v === "not_following" || v === "can_connect" || v === "connections") return v;
  return "all";
}
function parsePage(v: string | null): number {
  const n = Number.parseInt(v ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export default function PeopleSearchWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query        = searchParams.get("q") ?? "";
  const sort         = parseSearchSort(searchParams.get("sort"));
  const relationship = parseRelationship(searchParams.get("relationship"));
  const pageCount    = parsePage(searchParams.get("page"));
  const [queryInput, setQueryInput] = useState(query);

  const { data, total, isLoading, isLoadingMore, error, hasMore, mutate } = usePeopleSearch({
    query,
    sort,
    relationship,
    pageCount,
  });

  useEffect(() => { setQueryInput(query); }, [query]);

  const updateParams = (mutateFn: (p: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutateFn(params);
    const next = params.toString();
    router.replace(next ? `/people/search?${next}` : "/people/search", { scroll: false });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateParams((p) => {
      const normalized = queryInput.trim();
      normalized ? p.set("q", normalized) : p.delete("q");
      p.set("page", "1");
    });
  };

  const showPrompt = query.trim().length === 0;

  return (
    <PeopleWorkspaceShell>
      <div className="flex flex-col gap-5">

        {/* ── Search bar ── */}
        <form className="flex gap-2" onSubmit={handleSubmit}>
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
            />
            <input
              type="search"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search by name, username, or bio…"
              className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-4 text-[14px] text-foreground placeholder:text-text-tertiary focus:border-foreground focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            className="h-10 rounded-full bg-foreground px-5 text-[13px] font-medium text-background transition-opacity hover:opacity-80"
          >
            Search
          </button>
        </form>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {/* Relationship filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[12px] text-text-tertiary">Show</span>
            {RELATIONSHIP_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateParams((p) => { p.set("relationship", opt.value); p.set("page", "1"); })}
                className={[
                  "rounded-full border px-3 py-1 text-[12.5px] transition-colors",
                  relationship === opt.value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-text-secondary hover:border-foreground hover:text-foreground",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Sort filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[12px] text-text-tertiary">Sort</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateParams((p) => { p.set("sort", opt.value); p.set("page", "1"); })}
                className={[
                  "rounded-full border px-3 py-1 text-[12.5px] transition-colors",
                  sort === opt.value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-text-secondary hover:border-foreground hover:text-foreground",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Results ── */}
        {showPrompt ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-card-hover">
              <Search size={20} strokeWidth={1.5} className="text-text-tertiary" />
            </div>
            <p className="m-0 text-[13.5px] font-medium text-foreground">Find people on KhoshGolpo</p>
            <p className="m-0 max-w-xs text-[12.5px] text-text-tertiary">
              Search by username, display name, or a phrase from someone&apos;s bio.
            </p>
            <Link
              href="/people/explore"
              className="mt-1 text-[13px] font-medium text-primary no-underline hover:underline"
            >
              Browse everyone →
            </Link>
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-2 py-10 text-[13px] text-text-tertiary">
            <LoaderCircle size={15} className="animate-spin" />
            Searching…
          </div>
        ) : error ? (
          <p className="py-6 text-[13px] text-destructive">Failed to search. Try refreshing.</p>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-card-hover">
              <Users size={20} strokeWidth={1.5} className="text-text-tertiary" />
            </div>
            <p className="m-0 text-[13.5px] font-medium text-foreground">No people found</p>
            <p className="m-0 text-[12.5px] text-text-tertiary">
              Try a different name, username, or bio phrase.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[12.5px] text-text-tertiary">{total} result{total !== 1 ? "s" : ""}</p>

            <div className="flex flex-col divide-y divide-border">
              {data.map((person) => {
                const [av1, av2] = avatarSeed(person.id);
                const label = person.display_name || person.username;
                const href = canonicalProfilePath({
                  id: person.id,
                  username: person.username,
                  profile_slug: person.profile_slug,
                });

                return (
                  <div key={person.id} className="flex items-center gap-3 py-3 px-1 hover:bg-card-hover transition-colors">
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
                        <p className="m-0 mt-0.5 text-[12.5px] text-text-secondary line-clamp-1">
                          {person.bio}
                        </p>
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
              <div className="mt-2 text-center">
                <button
                  type="button"
                  disabled={isLoadingMore}
                  onClick={() => updateParams((p) => { p.set("page", String(pageCount + 1)); })}
                  className="rounded-full border border-border bg-transparent px-6 py-2 text-[13px] text-text-secondary transition-colors hover:bg-card-hover disabled:opacity-50 font-sans"
                >
                  {isLoadingMore ? "Loading…" : `Show more · ${data.length} of ${total}`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PeopleWorkspaceShell>
  );
}
