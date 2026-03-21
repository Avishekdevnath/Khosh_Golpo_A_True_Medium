"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Plus, Search, Settings, UserRound } from "lucide-react";

import { useNotifications } from "@/hooks/useNotifications";
import { useAuthStore } from "@/store/authStore";
import { avatarSeed, initials } from "@/lib/workspaceUtils";
import { profilePathFromUsername } from "@/lib/profileRouting";
import ThemeToggle from "@/components/shared/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function getSectionName(pathname: string): string {
  if (pathname.startsWith("/threads")) return "Threads";
  if (pathname.startsWith("/messages")) return "Messages";
  if (pathname.startsWith("/people")) return "People";
  if (pathname.startsWith("/notifications")) return "Notifications";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/admin")) return "Admin";
  return "Home";
}

export default function AppNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotifications();
  const [searchValue, setSearchValue] = useState("");

  const sectionName   = getSectionName(pathname);
  const isThreadsSection = pathname.startsWith("/threads");
  const isThreadDetail   = /^\/threads\/[^/]+/.test(pathname) && pathname !== "/threads/new";
  const showSearch    = isThreadsSection && !isThreadDetail;
  const showNewThread = isThreadsSection;

  const displayName = user?.display_name ?? user?.username ?? "Guest";
  const [av1, av2]  = avatarSeed(user?.id ?? "guest");
  const profilePath = user ? profilePathFromUsername(user.username) : "/login";

  function handleHamburger() {
    window.dispatchEvent(new CustomEvent("toggle-sidebar"));
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header
      className="flex items-center gap-3 px-5 z-20 sticky top-0 h-[60px] max-[859px]:h-[52px] max-[859px]:px-3"
      style={{
        background: "rgba(6,8,14,0.88)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Hamburger — mobile only */}
      <button
        type="button"
        onClick={handleHamburger}
        aria-label="Toggle sidebar"
        className="hidden max-[859px]:grid place-items-center w-8 h-8 border-0 bg-transparent text-[rgba(255,255,255,0.55)] cursor-pointer rounded-lg hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors duration-150"
      >
        <Menu size={18} />
      </button>

      {/* Page title */}
      <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
        {isThreadDetail ? (
          <>
            <Link
              href="/threads"
              className="font-serif text-[15px] font-bold text-[rgba(255,255,255,0.35)] no-underline transition-colors hover:text-[rgba(255,255,255,0.7)]"
            >
              Threads
            </Link>
            <span className="text-[rgba(255,255,255,0.2)] text-sm leading-none">/</span>
            <span className="font-serif text-[15px] font-bold text-[rgba(255,255,255,0.85)]">Thread</span>
          </>
        ) : (
          <span className="font-serif text-[15px] font-bold text-[rgba(255,255,255,0.85)]">{sectionName}</span>
        )}
      </div>

      {/* Center — search */}
      {showSearch ? (
        <div className="flex-1 flex justify-center max-[859px]:hidden">
          <div className="relative w-full max-w-[340px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "rgba(255,255,255,0.28)" }} />
            <input
              type="text"
              placeholder="Search threads..."
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              className="w-full h-[34px] rounded-xl text-[12.5px] font-sans pl-8.5 pr-3 outline-none transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.85)",
              }}
              onFocus={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                e.currentTarget.style.border = "1px solid rgba(240,131,74,0.4)";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(240,131,74,0.08)";
              }}
              onBlur={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Right actions */}
      <div className="flex items-center gap-1.5 ml-auto">

        {/* New Thread CTA */}
        {showNewThread && (
          <Link
            href="/threads/new"
            className="h-[34px] px-3.5 rounded-xl no-underline text-white text-[12.5px] font-semibold font-sans flex items-center gap-1.5 transition-all duration-150 hover:scale-[1.03] active:scale-[0.97] max-[859px]:w-8 max-[859px]:px-0 max-[859px]:justify-center"
            style={{
              background: "linear-gradient(135deg, #f0834a 0%, #d96030 100%)",
              boxShadow: "0 2px 12px rgba(240,131,74,0.35), 0 0 0 1px rgba(240,131,74,0.2)",
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            <span className="max-[859px]:hidden">New Thread</span>
          </Link>
        )}

        <ThemeToggle />

        {/* Notifications bell */}
        <Link
          href="/notifications"
          aria-label={unreadCount > 0 ? `Notifications — ${unreadCount} unread` : "Notifications"}
          className="w-8 h-8 rounded-xl grid place-items-center no-underline relative transition-all duration-150 hover:bg-[rgba(255,255,255,0.06)]"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          <Bell size={15} strokeWidth={1.8} />
          {unreadCount > 0 && (
            <span
              className="absolute top-[5px] right-[5px] w-[7px] h-[7px] rounded-full border-[1.5px] border-[rgba(6,8,14,0.88)]"
              style={{ background: "#f0834a", boxShadow: "0 0 6px rgba(240,131,74,0.7)" }}
              aria-hidden="true"
            />
          )}
        </Link>

        {/* User avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-[32px] h-[32px] rounded-[9px] border-0 grid place-items-center text-[11px] font-bold text-white cursor-pointer transition-all duration-150 hover:scale-[1.06] hover:shadow-[0_0_0_2px_rgba(240,131,74,0.4)] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(240,131,74,0.5)]"
              style={{ background: `linear-gradient(135deg,${av1},${av2})` }}
              aria-label="Open user menu"
            >
              {initials(displayName)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-44"
            style={{
              background: "rgba(10,12,20,0.98)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <DropdownMenuItem asChild>
              <Link href={profilePath} className="flex items-center gap-2">
                <UserRound size={13} strokeWidth={1.8} /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings size={13} strokeWidth={1.8} /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-[#f06b6b] flex items-center gap-2 focus:text-[#f06b6b]">
              <LogOut size={13} strokeWidth={1.8} /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
