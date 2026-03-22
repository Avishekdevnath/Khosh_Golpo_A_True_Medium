"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, LogOut, Menu, PenLine, Search, Settings, User } from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import { useNotifications } from "@/hooks/useNotifications";
import { avatarSeed, initials } from "@/lib/workspaceUtils";
import { profilePathFromUsername } from "@/lib/profileRouting";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/shared/ThemeToggle";

export default function AppNavbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotifications();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const name = user?.display_name ?? user?.username ?? "Guest";
  const [av1, av2] = avatarSeed(user?.id ?? "guest");
  const profileHref = user ? profilePathFromUsername(user.username) : "/login";

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  function handleHamburger() {
    window.dispatchEvent(new CustomEvent("toggle-sidebar"));
  }

  return (
    <header className="flex items-center gap-3 px-4 h-14 shrink-0 sticky top-0 z-40 bg-sidebar border-b border-sidebar-border">

      {/* ── Hamburger (mobile only) ── */}
      <button
        type="button"
        onClick={handleHamburger}
        aria-label="Toggle menu"
        className="min-[860px]:hidden w-9 h-9 grid place-items-center rounded-lg border-0 bg-transparent text-muted-foreground cursor-pointer hover:text-foreground hover:bg-sidebar-accent transition-colors shrink-0"
      >
        <Menu size={20} />
      </button>

      {/* ── Logo ── */}
      <button
        type="button"
        onClick={() => router.push("/")}
        className="flex items-center gap-2.5 border-0 bg-transparent cursor-pointer p-0 group shrink-0"
        aria-label="KhoshGolpo home"
      >
        <span
          className="w-7 h-7 rounded-lg grid place-items-center shrink-0 transition-shadow duration-200 group-hover:shadow-[0_0_14px_rgba(14,165,233,0.4)]"
          style={{ background: "linear-gradient(135deg, #0EA5E9, #0284C7)" }}
        >
          <span className="font-serif font-bold text-white text-xs leading-none">K</span>
        </span>
        <span className="font-serif text-[15px] font-bold text-foreground tracking-tight hidden min-[860px]:block">
          KhoshGolpo
        </span>
      </button>

      {/* ── Search pill (desktop) ── */}
      <button
        type="button"
        onClick={() => router.push("/threads")}
        className={cn(
          "hidden min-[860px]:flex items-center gap-2 ml-2",
          "h-9 px-4 rounded-full border border-border bg-card",
          "text-[13px] text-muted-foreground w-[200px]",
          "hover:border-border/80 hover:bg-card-hover transition-colors cursor-text",
        )}
        aria-label="Search threads"
      >
        <Search size={13} strokeWidth={2} className="shrink-0" />
        Search
      </button>

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Right actions ── */}

      {/* New Thread */}
      <Link
        href="/threads/new"
        className={cn(
          "hidden min-[860px]:flex items-center gap-1.5",
          "h-8 px-3.5 rounded-full border-0",
          "bg-primary text-white text-[12.5px] font-semibold no-underline",
          "transition-all duration-150 hover:brightness-110 active:scale-[0.97]",
        )}
      >
        <PenLine size={13} strokeWidth={2.5} />
        Write
      </Link>

      {/* Notifications bell */}
      <button
        type="button"
        onClick={() => router.push("/notifications")}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className="relative w-9 h-9 grid place-items-center rounded-lg border-0 bg-transparent text-muted-foreground cursor-pointer hover:text-foreground hover:bg-sidebar-accent transition-colors shrink-0"
      >
        <Bell size={18} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Avatar + dropdown */}
      <div ref={menuRef} className="relative">
        {/* Dropdown */}
        {menuOpen && user && (
          <div
            className="absolute top-[calc(100%+8px)] right-0 w-[180px] rounded-xl p-1.5 z-50 border border-border bg-popover shadow-xl animate-[popUp_0.15s_ease]"
            role="menu"
            aria-label="User options"
          >
            {[
              { label: "Profile",  icon: User,     action: () => router.push(profileHref) },
              { label: "Settings", icon: Settings, action: () => router.push("/settings") },
            ].map(({ label, icon: Ic, action }) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); action(); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg border-0 bg-transparent text-foreground/75 text-[13px] font-sans cursor-pointer text-left transition-colors hover:bg-card-hover hover:text-foreground"
              >
                <Ic size={14} strokeWidth={1.7} />
                {label}
              </button>
            ))}
            <div className="h-px bg-border mx-2 my-1" role="separator" />
            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                setMenuOpen(false);
                await logout();
                router.push("/login");
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg border-0 bg-transparent text-destructive text-[13px] font-sans cursor-pointer text-left transition-colors hover:bg-destructive/10"
            >
              <LogOut size={14} strokeWidth={1.7} />
              Sign out
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => user && setMenuOpen(v => !v)}
          aria-label={user ? `${name} — open user menu` : "Guest"}
          aria-expanded={menuOpen}
          className="w-8 h-8 rounded-full grid place-items-center border-0 bg-transparent cursor-pointer shrink-0 hover:ring-2 hover:ring-border transition-all"
        >
          <span
            className="w-8 h-8 rounded-full grid place-items-center text-[11px] font-bold text-white"
            style={{ background: `linear-gradient(135deg,${av1},${av2})` }}
          >
            {initials(name)}
          </span>
        </button>
      </div>
    </header>
  );
}
