"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type TrendingTag = {
  tag: string;
  count: number;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DiscoveryPanel({ onTagClick }: { onTagClick?: (tag: string) => void }) {
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);

  useEffect(() => {
    apiGet<{ tags: TrendingTag[] }>("threads/trending-tags?limit=10")
      .then(r => setTags(r.tags ?? []))
      .catch(() => setTags([]))
      .finally(() => setTagsLoading(false));
  }, []);

  return (
    <aside className="hidden xl:flex flex-col w-[300px] shrink-0 border-l border-border bg-background px-5 py-6 overflow-y-auto ws-scroll h-full justify-between">

      {/* ── Top content ── */}
      <div>
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
      </div>

      {/* ── Footer ── */}
      <div>
        <div className="border-t border-border mb-4" />
        <p className="text-[11.5px] text-text-tertiary leading-[1.8] m-0">
          <a className="mr-2 hover:underline cursor-pointer">Help</a>
          <a className="mr-2 hover:underline cursor-pointer">Status</a>
          <a className="mr-2 hover:underline cursor-pointer">About</a>
          <a className="mr-2 hover:underline cursor-pointer">Privacy</a>
          <a className="mr-2 hover:underline cursor-pointer">Terms</a>
          <br />
          KhoshGolpo © 2025
        </p>
      </div>
    </aside>
  );
}
