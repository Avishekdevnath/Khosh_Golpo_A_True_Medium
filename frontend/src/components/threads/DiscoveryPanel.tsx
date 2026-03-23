"use client";

import { useEffect, useState } from "react";
import { Flame, Sparkles, TrendingUp } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { ThreadOut } from "./useThreadsPage";

// ─── Types ─────────────────────────────────────────────────────────────────────

type TrendingTag = { tag: string; count: number };

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-primary">{icon}</span>
      <h2 className="m-0 text-[13px] font-semibold text-foreground">{title}</h2>
    </div>
  );
}

function PopularThreadCard({ thread, onClick }: { thread: ThreadOut; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left group flex flex-col gap-1 px-3 py-2.5 rounded-xl hover:bg-card-hover transition-colors border-0 bg-transparent cursor-pointer"
    >
      <p className="text-[12.5px] font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
        {thread.title}
      </p>
      <div className="flex items-center gap-2.5 text-[11px] text-text-tertiary">
        {thread.tags[0] && (
          <span className="text-primary/80 font-medium">{thread.tags[0]}</span>
        )}
        <span>{thread.post_count} replies</span>
        <span>{thread.like_count} likes</span>
      </div>
    </button>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function DiscoveryPanel({ onTagClick }: { onTagClick?: (tag: string) => void }) {
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [popularThreads, setPopularThreads] = useState<ThreadOut[]>([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const [recentThreads, setRecentThreads] = useState<ThreadOut[]>([]);

  useEffect(() => {
    // Trending tags
    apiGet<{ tags: TrendingTag[] }>("threads/trending-tags?limit=12")
      .then(r => setTags(r.tags ?? []))
      .catch(() => setTags([]))
      .finally(() => setTagsLoading(false));

    // Most replied threads
    apiGet<{ data: ThreadOut[] }>("threads?sort=most_replies&limit=5&status=open")
      .then(r => setPopularThreads(r.data ?? []))
      .catch(() => setPopularThreads([]))
      .finally(() => setPopularLoading(false));

    // Recently active
    apiGet<{ data: ThreadOut[] }>("threads?sort=newest&limit=4")
      .then(r => setRecentThreads(r.data ?? []))
      .catch(() => setRecentThreads([]));
  }, []);

  function openThread(thread: ThreadOut) {
    window.location.href = `/threads/${thread.id}`;
  }

  return (
    <aside className="hidden xl:flex flex-col w-[300px] shrink-0 border-l border-border bg-background overflow-y-auto ws-scroll h-full">

      <div className="px-5 py-5 flex flex-col gap-6">

        {/* ── Trending Topics ── */}
        <div>
          <SectionHeader icon={<TrendingUp size={14} />} title="Trending Topics" />
          {tagsLoading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="h-7 rounded-full bg-card-hover animate-pulse" style={{ width: `${50 + (i % 4) * 18}px` }} />
              ))}
            </div>
          ) : tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map(({ tag, count }) => (
                <button
                  key={tag}
                  type="button"
                  className="flex items-center gap-1 rounded-full bg-card-hover px-3 py-1.5 text-[12.5px] text-foreground font-sans transition-colors duration-150 hover:bg-primary/10 hover:text-primary cursor-pointer border-0"
                  onClick={() => onTagClick?.(tag)}
                >
                  {tag}
                  {count > 0 && <span className="text-[10px] text-text-tertiary ml-0.5">{count}</span>}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[12.5px] text-text-tertiary">No trending topics yet.</p>
          )}
        </div>

        <div className="h-px bg-border" />

        {/* ── Most Active Threads ── */}
        <div>
          <SectionHeader icon={<Flame size={14} />} title="Most Active" />
          {popularLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="px-3 py-2.5 rounded-xl">
                  <div className="h-4 w-4/5 rounded bg-card-hover animate-pulse mb-1.5" />
                  <div className="h-3 w-1/2 rounded bg-card-hover animate-pulse opacity-60" />
                </div>
              ))}
            </div>
          ) : popularThreads.length > 0 ? (
            <div className="flex flex-col -mx-1">
              {popularThreads.map(thread => (
                <PopularThreadCard key={thread.id} thread={thread} onClick={() => openThread(thread)} />
              ))}
            </div>
          ) : (
            <p className="text-[12.5px] text-text-tertiary">No active threads yet.</p>
          )}
        </div>

        <div className="h-px bg-border" />

        {/* ── Just Posted ── */}
        {recentThreads.length > 0 && (
          <div>
            <SectionHeader icon={<Sparkles size={14} />} title="Just Posted" />
            <div className="flex flex-col -mx-1">
              {recentThreads.map(thread => (
                <PopularThreadCard key={thread.id} thread={thread} onClick={() => openThread(thread)} />
              ))}
            </div>
          </div>
        )}

        {recentThreads.length > 0 && <div className="h-px bg-border" />}

        {/* ── Footer ── */}
        <div>
          <p className="text-[11.5px] text-text-tertiary leading-[1.9] m-0">
            <a className="mr-2 hover:underline cursor-pointer hover:text-foreground transition-colors">Help</a>
            <a className="mr-2 hover:underline cursor-pointer hover:text-foreground transition-colors">About</a>
            <a className="mr-2 hover:underline cursor-pointer hover:text-foreground transition-colors">Privacy</a>
            <a className="mr-2 hover:underline cursor-pointer hover:text-foreground transition-colors">Terms</a>
            <br />
            KhoshGolpo © 2025
          </p>
        </div>

      </div>
    </aside>
  );
}
