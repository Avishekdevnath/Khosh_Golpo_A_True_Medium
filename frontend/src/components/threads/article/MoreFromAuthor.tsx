"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { relativeTime } from "@/lib/workspaceUtils";

type MiniThread = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  post_count: number;
  like_count: number;
  created_at: string;
};

type ThreadListResponse = {
  data: MiniThread[];
  total: number;
  page: number;
  limit: number;
};

type Props = {
  authorId: string;
  authorName: string;
  currentThreadId: string;
};

export default function MoreFromAuthor({ authorId, authorName, currentThreadId }: Props) {
  const [threads, setThreads] = useState<MiniThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGet<ThreadListResponse>(`threads?author_id=${authorId}&limit=5&page=1`)
      .then(res => {
        if (cancelled) return;
        setThreads(res.data.filter(t => t.id !== currentThreadId).slice(0, 4));
      })
      .catch(() => {
        if (cancelled) return;
        setThreads([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [authorId, currentThreadId]);

  if (loading || threads.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-border">
      <h2
        className="text-xl font-bold text-foreground mb-6"
        style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
      >
        More from {authorName}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {threads.map(t => (
          <Link
            key={t.id}
            href={`/threads/${t.id}`}
            className="group flex flex-col gap-2 p-4 rounded-lg border border-border hover:border-border-strong hover:bg-card-hover transition-all duration-150"
          >
            <h3 className="text-[14px] font-bold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
              {t.title}
            </h3>
            {t.body && (
              <p className="text-[12.5px] text-text-secondary leading-relaxed line-clamp-2">
                {t.body.replace(/[#*`>_~[\]()]/g, "").slice(0, 100)}
              </p>
            )}
            <div className="flex items-center gap-3 mt-auto pt-1 text-[11px] text-text-tertiary">
              <span>{relativeTime(t.created_at)}</span>
              {t.like_count > 0 && <span>· {t.like_count} likes</span>}
              {t.post_count > 0 && <span>· {t.post_count} replies</span>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
