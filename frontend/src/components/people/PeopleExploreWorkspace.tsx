"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import PageLoader from "@/components/shared/PageLoader";
import PeopleWorkspaceShell from "@/components/people/PeopleWorkspaceShell";
import ExploreSectionBlock from "@/components/people/ExploreSectionBlock";
import PeopleCard from "@/components/people/PeopleCard";
import { SearchInput } from "@/components/ui/search-input";
import { FilterChips } from "@/components/ui/filter-chips";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { usePeopleExplore } from "@/hooks/usePeople";
import type { PeopleExploreSort } from "@/types/people";

const SORT_OPTIONS: Array<{ value: PeopleExploreSort; label: string }> = [
  { value: "social",        label: "For you" },
  { value: "most_followed", label: "Most followed" },
  { value: "newest",        label: "Newest" },
];

export default function PeopleExploreWorkspace() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<PeopleExploreSort>("social");
  const [pageCount, setPageCount] = useState(1);

  const { sections, ranked, total, isLoading, isLoadingMore, error, hasMore, mutate } =
    usePeopleExplore({ sort, pageCount });

  const sectionMap = useMemo(
    () => sections.reduce<Record<string, (typeof sections)[number]>>((acc, s) => { acc[s.key] = s; return acc; }, {}),
    [sections],
  );

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || (isLoading && ranked.length === 0 && sections.length === 0)) {
    return <PageLoader />;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = query.trim();
    router.push(normalized ? `/people/search?q=${encodeURIComponent(normalized)}` : "/people/search");
  };

  const toolbar = (
    <form className="flex flex-wrap gap-2" onSubmit={handleSubmit}>
      <div className="min-w-[260px] flex-1">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by username, name, or bio"
          className="h-[38px]"
        />
      </div>
      <button
        type="submit"
        className="rounded-[9px] bg-gradient-to-br from-[#f0834a] to-[#f3ae53] px-[18px] text-[13px] font-bold text-white transition-opacity hover:opacity-90 min-h-[38px] max-sm:w-full"
      >
        Search
      </button>
    </form>
  );

  const hasSections =
    (sectionMap.suggested?.data.length ?? 0) > 0 ||
    (sectionMap.popular?.data.length ?? 0)   > 0 ||
    (sectionMap.new?.data.length ?? 0)        > 0;

  return (
    <PeopleWorkspaceShell
      title="Find your people"
      subtitle="Discover who to follow, who to connect with, and who is already moving through your side of KhoshGolpo."
      toolbar={toolbar}
    >
      {/* Curated sections */}
      {hasSections && (
        <div className="grid gap-5">
          <ExploreSectionBlock
            title="Suggested for you"
            subtitle="Personalized from your interests and network."
            items={sectionMap.suggested?.data ?? []}
            onRelationshipChange={() => { void mutate(); }}
          />
          <ExploreSectionBlock
            title="Popular on KhoshGolpo"
            subtitle="Members with strong reach across the app."
            items={sectionMap.popular?.data ?? []}
            onRelationshipChange={() => { void mutate(); }}
          />
          <ExploreSectionBlock
            title="New arrivals"
            subtitle="Fresh profiles worth checking early."
            items={sectionMap.new?.data ?? []}
            onRelationshipChange={() => { void mutate(); }}
          />
        </div>
      )}

      {/* Ranked / browse-all section */}
      {(!mounted || isLoading || ranked.length > 0 || error) && (
        <section className="grid gap-2.5">
          {/* Section header + sort chips */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#161c2e] pb-1">
            <div className="text-[15px] font-bold text-[#d0d8f0]">Browse everyone</div>
            <FilterChips
              items={SORT_OPTIONS}
              value={sort}
              onChange={(v) => {
                setSort(v as PeopleExploreSort);
                setPageCount(1);
              }}
              aria-label="Sort people"
            />
          </div>

          {/* States */}
          {(!mounted || isLoading) ? (
            <div className="inline-flex items-center gap-2 text-[13px] text-[#4e5a78]">
              <LoaderCircle size={16} className="animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <div className="text-[13px] text-[#c47474]">Failed to load. Refresh and try again.</div>
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-1.5 max-sm:grid-cols-1">
                {ranked.map((person) => (
                  <PeopleCard
                    key={person.id}
                    person={person}
                    onRelationshipChange={() => { void mutate(); }}
                  />
                ))}
              </div>
              <LoadMoreButton
                hasMore={hasMore}
                loading={isLoadingMore}
                onClick={() => setPageCount((c) => c + 1)}
              />
              {hasMore && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Showing {ranked.length} of {total}
                </p>
              )}
            </>
          )}
        </section>
      )}
    </PeopleWorkspaceShell>
  );
}
