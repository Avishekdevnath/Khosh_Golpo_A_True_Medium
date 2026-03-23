"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { useAuthStore } from "@/store/authStore";
import { avatarSeed, initials } from "@/lib/workspaceUtils";

/** Route config: maps pathname to top bar content */
function useTopBarConfig() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEdit = searchParams.get("edit");

  if (pathname === "/jobs" || pathname === "/jobs/") {
    return { mode: "browse" as const };
  }
  if (pathname.startsWith("/jobs/saved")) {
    return { mode: "sub" as const, title: "Saved Jobs", showPost: false };
  }
  if (pathname.startsWith("/jobs/my")) {
    return { mode: "sub" as const, title: "My Posts", showPost: true };
  }
  if (pathname.startsWith("/jobs/post")) {
    return { mode: "sub" as const, title: isEdit ? "Edit Job" : "Post a Job", showPost: false };
  }
  if (pathname.startsWith("/jobs/pipeline")) {
    return { mode: "sub" as const, title: "My Pipeline", showPost: false };
  }
  if (pathname.startsWith("/jobs/applications")) {
    return { mode: "sub" as const, title: "My Applications", showPost: false };
  }
  // /jobs/[slug] detail page
  return { mode: "detail" as const };
}

export default function JobsTopBar() {
  const router = useRouter();
  const config = useTopBarConfig();
  const { user, logout } = useAuthStore();
  const name = user?.display_name ?? user?.username ?? "U";
  const [av1, av2] = avatarSeed(user?.id ?? "guest");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="flex items-center gap-3 px-4 h-14 shrink-0 sticky top-0 z-40 bg-background border-b border-border">
      {/* Left */}
      {config.mode === "browse" ? (
        <Link href="/jobs" className="flex items-center gap-2 no-underline shrink-0 group">
          <span
            className="w-7 h-7 rounded-lg grid place-items-center shrink-0 transition-shadow duration-200 group-hover:shadow-[0_0_14px_rgba(14,165,233,0.4)]"
            style={{ background: "linear-gradient(135deg, #0EA5E9, #0284C7)" }}
          >
            <span className="font-bold text-white text-[10px] leading-none">◆</span>
          </span>
          <span className="font-serif text-[18px] font-bold text-foreground tracking-tight">
            Khosh Jobs
          </span>
        </Link>
      ) : config.mode === "detail" ? (
        <button
          type="button"
          onClick={() => router.push("/jobs")}
          className="flex items-center gap-1.5 border-0 bg-transparent text-muted-foreground hover:text-foreground cursor-pointer transition-colors text-[13px] font-medium shrink-0"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          <span>Browse</span>
        </button>
      ) : (
        /* Sub-pages — full logo + page title on the left */
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => router.push("/jobs")}
            className="flex items-center gap-2 border-0 bg-transparent cursor-pointer shrink-0 p-0 group"
            title="Back to Jobs"
          >
            <span
              className="w-7 h-7 rounded-lg grid place-items-center shrink-0 transition-shadow duration-200 group-hover:shadow-[0_0_14px_rgba(14,165,233,0.4)]"
              style={{ background: "linear-gradient(135deg, #0EA5E9, #0284C7)" }}
            >
              <span className="font-bold text-white text-[10px] leading-none">◆</span>
            </span>
            <span className="font-serif text-[18px] font-bold text-foreground tracking-tight">
              Khosh Jobs
            </span>
          </button>
          <span className="text-muted-foreground/40 text-[16px] select-none">|</span>
          <h1 className="text-[14px] font-semibold text-foreground tracking-tight truncate">
            {config.title}
          </h1>
        </div>
      )}

      {/* Center — spacer */}
      <div className="flex-1" />

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        <ThemeToggle />
        {(config.mode === "browse" || (config.mode === "sub" && (config as { showPost?: boolean }).showPost)) && (
          <Link
            href="/jobs/post"
            className="hidden min-[1024px]:flex items-center gap-1.5 h-8 px-3.5 rounded-full border-0 bg-primary text-primary-foreground text-[12.5px] font-semibold no-underline transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
          >
            <Plus size={13} strokeWidth={2.5} />
            Post a Job
          </Link>
        )}
        {/* Back to KhoshGolpo */}
        <button
          type="button"
          onClick={() => router.push("/threads")}
          className="hidden min-[1024px]:flex items-center gap-1.5 h-8 px-3 rounded-full border border-border text-[12px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors bg-transparent cursor-pointer"
        >
          ← KhoshGolpo
        </button>
        {/* Avatar + dropdown */}
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="w-8 h-8 rounded-full grid place-items-center text-[11px] font-bold text-white shrink-0 cursor-pointer border-0 p-0 hover:ring-2 hover:ring-primary/40 transition-all"
              style={{ background: `linear-gradient(135deg,${av1},${av2})` }}
              title={name}
            >
              {initials(name)}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-[180px] rounded-xl border border-border bg-card shadow-xl z-50 p-1.5">
                <div className="px-3 py-2 border-b border-border mb-1">
                  <p className="text-[13px] font-semibold text-foreground truncate">{name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user.email ?? ""}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); router.push("/threads"); }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors border-0 bg-transparent cursor-pointer text-left"
                >
                  ← KhoshGolpo
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); router.push("/settings"); }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors border-0 bg-transparent cursor-pointer text-left"
                >
                  <Settings size={13} strokeWidth={1.7} />
                  Settings
                </button>
                <div className="h-px bg-border mx-2 my-1" />
                <button
                  type="button"
                  onClick={async () => { setMenuOpen(false); await logout(); router.push("/login"); }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] text-destructive hover:bg-destructive/10 transition-colors border-0 bg-transparent cursor-pointer text-left"
                >
                  <LogOut size={13} strokeWidth={1.7} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
