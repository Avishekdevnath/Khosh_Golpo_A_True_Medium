"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import PeopleCard from "@/components/people/PeopleCard";
import PeopleWorkspaceShell from "@/components/people/PeopleWorkspaceShell";
import SearchStatePanel from "@/components/people/SearchStatePanel";
import { SearchInput } from "@/components/ui/search-input";
import { FilterChips } from "@/components/ui/filter-chips";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { usePeopleSearch } from "@/hooks/usePeople";
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
  const query       = searchParams.get("q") ?? "";
  const sort        = parseSearchSort(searchParams.get("sort"));
  const relationship = parseRelationship(searchParams.get("relationship"));
  const pageCount   = parsePage(searchParams.get("page"));
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateParams((params) => {
      const normalized = queryInput.trim();
      normalized ? params.set("q", normalized) : params.delete("q");
      params.set("page", "1");
    });
  };

  /* ── toolbar ── */
  const toolbar = (
    <form className="flex flex-wrap gap-2.5" onSubmit={handleSubmit}>
      <div className="min-w-[280px] flex-1">
        <SearchInput
          value={queryInput}
          onChange={setQueryInput}
          placeholder="Search by username, display name, or bio"
          className="h-10"
        />
      </div>
      <button
        type="submit"
        className="min-h-10 rounded-[10px] border border-orange-500/30 bg-gradient-to-br from-[#f0834a] to-[#f3ae53] px-4 text-[13px] font-bold text-white max-sm:w-full"
      >
        Search
      </button>
    </form>
  );

  const showPrompt = query.trim().length === 0;

  return (
    <PeopleWorkspaceShell
      title="Search people"
      subtitle="Look up members by username, display name, or bio, then follow, connect, or jump straight into messaging."
      toolbar={toolbar}
      bodyScrollable={false}
    >
      {/* Outer flex column — fills the scrollable body */}
      <div className="flex flex-1 min-h-0 flex-col gap-[18px]">

        {/* Filters bar */}
        <div className="grid shrink-0 gap-2.5 rounded-2xl border border-[#1b2133] bg-[#0d1120] px-4 py-3.5 max-sm:rounded-xl max-sm:px-3.5 max-sm:py-3">
          <div className="grid gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8fa0ca]">
              Relationship
            </span>
            <FilterChips
              items={RELATIONSHIP_OPTIONS}
              value={relationship}
              onChange={(v) => updateParams((p) => { p.set("relationship", v as string); p.set("page", "1"); })}
              aria-label="Filter by relationship"
            />
          </div>
          <div className="grid gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8fa0ca]">
              Sort
            </span>
            <FilterChips
              items={SORT_OPTIONS}
              value={sort}
              onChange={(v) => updateParams((p) => { p.set("sort", v as string); p.set("page", "1"); })}
              aria-label="Sort results"
            />
          </div>
        </div>

        {/* Results pane — scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden grid content-start gap-4 pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
          {showPrompt ? (
            <SearchStatePanel
              title="Start with a name or handle"
              text="Search by username, display name, or bio. If you want inspiration first, head back to Explore."
              actionLabel="Go to Explore"
              actionHref="/people/explore"
            />
          ) : isLoading ? (
            <div className="inline-flex items-center gap-2.5 text-sm text-[#93a2cb]">
              <LoaderCircle size={18} className="animate-spin" />
              Searching people...
            </div>
          ) : error ? (
            <div className="text-sm text-[#f4b0b0]">Failed to search people. Refresh and try again.</div>
          ) : data.length === 0 ? (
            <SearchStatePanel
              title="No people found"
              text="Try a username, full name, or a phrase from someone's bio."
            />
          ) : (
            <section className="grid gap-2.5">
              {/* Results header */}
              <div className="grid gap-0.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8fa0ca]">
                  Results
                </span>
                <h2 className="mt-1 text-base font-bold text-[#d0d8f0]">{total} people found</h2>
              </div>

              {/* Result grid */}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-1.5 max-sm:grid-cols-1">
                {data.map((person) => (
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
                onClick={() => updateParams((p) => { p.set("page", String(pageCount + 1)); })}
              />
              {hasMore && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Showing {data.length} of {total}
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </PeopleWorkspaceShell>
  );
}
