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

  const sectionName = getSectionName(pathname);
  const isThreadsSection = pathname.startsWith("/threads");
  const isThreadDetail = /^\/threads\/[^/]+/.test(pathname) && pathname !== "/threads/new";
  const showSearch = isThreadsSection && !isThreadDetail;
  const showNewThread = isThreadsSection;

  const displayName = user?.display_name ?? user?.username ?? "Guest";
  const [av1, av2] = avatarSeed(user?.id ?? "guest");
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
      className={[
        "flex items-center gap-4 px-5 z-20 sticky top-0",
        "h-[60px] max-[859px]:h-[52px] max-[859px]:px-3",
        "bg-[rgba(6,8,16,0.85)] dark:bg-[rgba(6,8,16,0.85)]",
        "backdrop-blur-[12px]",
        "border-b border-border",
      ].join(" ")}
    >
      {/* Hamburger — hidden on desktop, shown on mobile */}
      <button
        type="button"
        onClick={handleHamburger}
        aria-label="Toggle sidebar"
        className="hidden max-[859px]:grid place-items-center w-9 h-9 border-0 bg-transparent text-foreground cursor-pointer rounded-lg hover:bg-card-hover transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Section name / breadcrumb */}
      <div className="flex items-center gap-2 whitespace-nowrap">
        {isThreadDetail ? (
          <>
            <Link
              href="/threads"
              className="font-serif text-base font-bold text-muted-foreground no-underline transition-colors hover:text-foreground"
            >
              Threads
            </Link>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="font-serif text-base font-bold text-foreground whitespace-nowrap">Detail</span>
          </>
        ) : (
          <span className="font-serif text-base font-bold text-foreground whitespace-nowrap">{sectionName}</span>
        )}
      </div>

      {/* Center zone — search */}
      {showSearch ? (
        <div className="flex-1 flex justify-center max-[859px]:hidden">
          <div className="relative w-full max-w-[320px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search threads..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className={[
                "w-full h-8 rounded-lg text-[13px] font-sans",
                "bg-secondary border border-border text-foreground",
                "pl-8 pr-3",
                "outline-none transition-[border,box-shadow] duration-200",
                "focus:border-primary focus:shadow-[0_0_0_2px_rgba(14,165,233,0.15)]",
              ].join(" ")}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Right zone */}
      <div className="flex items-center gap-2 ml-auto">
        {showNewThread && (
          <Link
            href="/threads/new"
            className={[
              "h-8 px-[14px] rounded-lg no-underline",
              "bg-primary text-white text-[13px] font-semibold font-sans",
              "flex items-center gap-1.5 transition-colors duration-200",
              "hover:bg-[#38BDF8]",
            ].join(" ")}
          >
            <Plus size={14} />
            <span className="max-[859px]:hidden">New Thread</span>
          </Link>
        )}

        <ThemeToggle />

        <Link
          href="/notifications"
          aria-label="Notifications"
          className={[
            "w-8 h-8 rounded-lg grid place-items-center no-underline relative",
            "text-muted-foreground transition-all duration-200",
            "hover:text-foreground hover:bg-card-hover",
          ].join(" ")}
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span
              className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary border-2 border-[rgba(6,8,16,0.85)]"
              aria-hidden="true"
            />
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-8 h-8 rounded-full border-0 grid place-items-center text-[11px] font-bold text-white cursor-pointer"
              style={{ background: `linear-gradient(135deg,${av1},${av2})` }}
            >
              {initials(displayName)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link href={profilePath}>
                <UserRound size={14} style={{ marginRight: 8 }} /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings size={14} style={{ marginRight: 8 }} /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-400">
              <LogOut size={14} style={{ marginRight: 8 }} /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
