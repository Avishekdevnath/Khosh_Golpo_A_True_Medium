import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import ConnectionButton from "@/components/shared/ConnectionButton";
import FollowButton from "@/components/shared/FollowButton";
import { useFollow } from "@/hooks/useFollow";
import { avatarSeed, initials } from "@/lib/workspaceUtils";
import type { FollowerListResponse, FollowerOut } from "@/types/follow";

interface FollowersModalProps {
  userId: string;
  type: "followers" | "following";
  onClose: () => void;
}

function UserRow({ item }: { item: FollowerOut }) {
  const [av1, av2] = avatarSeed(item.id);
  const label = item.display_name || item.username;
  const href = `/${item.username}`;

  return (
    <div className="flex items-center gap-3 rounded-[10px] bg-card-hover px-3 py-2.5 transition-colors hover:bg-card-hover/80">
      {/* Avatar */}
      <Link href={href} className="shrink-0 no-underline" tabIndex={-1} aria-hidden>
        <div
          className="flex size-9 items-center justify-center rounded-full text-[12px] font-bold text-white border border-white/10"
          style={{ background: `linear-gradient(135deg, ${av1}, ${av2})` }}
        >
          {initials(label)}
        </div>
      </Link>

      {/* Identity */}
      <div className="flex-1 min-w-0">
        <Link href={href} className="no-underline block">
          <span className="block text-[13px] font-semibold text-foreground hover:text-primary transition-colors truncate leading-tight">
            {label}
          </span>
        </Link>
        <span className="text-[11px] text-foreground/50">@{item.username}</span>
        {item.bio && (
          <p className="m-0 mt-0.5 text-[11px] text-foreground/50 line-clamp-1 leading-[1.45]">
            {item.bio}
          </p>
        )}
      </div>

      {/* Icon-only action buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <FollowButton
          userId={item.id}
          iconOnly
        />
        <ConnectionButton
          userId={item.id}
          iconOnly
        />
      </div>
    </div>
  );
}

export default function FollowersModal({ userId, type, onClose }: FollowersModalProps) {
  const { loadFollowers, loadFollowing } = useFollow(userId);
  const [data, setData] = useState<FollowerListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadList = async () => {
      setLoading(true);
      const result = type === "followers" ? await loadFollowers(page) : await loadFollowing(page);
      setData(result);
      setLoading(false);
    };
    void loadList();
  }, [type, page, loadFollowers, loadFollowing, userId]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/50 backdrop-blur-[2px]"
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="flex w-[90%] max-w-[420px] max-h-[70vh] flex-col overflow-hidden rounded-[16px] border border-border bg-card text-foreground shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
          <h2 className="text-[15px] font-semibold">
            {type === "followers" ? "Followers" : "Following"}
            {data && (
              <span className="ml-2 text-[12px] font-normal text-foreground/40">
                {data.total}
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid place-items-center rounded-lg p-1.5 text-foreground/50 transition-colors hover:text-foreground hover:bg-background cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex flex-col gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-[10px] bg-card-hover px-3 py-2.5 animate-pulse">
                  <div className="size-9 shrink-0 rounded-full bg-border/50" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-28 rounded-full bg-border/50" />
                    <div className="h-2.5 w-16 rounded-full bg-border/50" />
                  </div>
                  <div className="flex gap-1.5">
                    <div className="size-9 rounded-full bg-border/50" />
                    <div className="size-9 rounded-full bg-border/50" />
                  </div>
                </div>
              ))}
            </div>
          ) : !data || data.data.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-foreground/50">
              No {type} yet
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {data.data.map((item: FollowerOut) => (
                <UserRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && data.total > 20 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[12px] text-foreground/60">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded-lg px-3 py-1 cursor-pointer transition-colors hover:text-foreground hover:bg-card-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-foreground/40">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg px-3 py-1 cursor-pointer transition-colors hover:text-foreground hover:bg-card-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
