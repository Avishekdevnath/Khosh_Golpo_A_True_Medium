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
    <>
      <header className="app-header">
        {/* Left zone */}
        <button type="button" className="hamburger" onClick={handleHamburger} aria-label="Toggle sidebar">
          <Menu size={20} />
        </button>
        <div className="section-name-wrap">
          {isThreadDetail ? (
            <>
              <Link href="/threads" className="section-link">Threads</Link>
              <span className="breadcrumb-sep">/</span>
              <span className="section-name">Detail</span>
            </>
          ) : (
            <span className="section-name">{sectionName}</span>
          )}
        </div>

        {/* Center zone — search */}
        {showSearch && (
          <div className="header-search">
            <div className="search-input-wrap">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search threads..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </div>
          </div>
        )}
        {!showSearch && <div className="header-search" />}

        {/* Right zone */}
        <div className="header-actions">
          {showNewThread && (
            <Link href="/threads/new" className="new-thread-btn">
              <Plus size={14} />
              <span>New Thread</span>
            </Link>
          )}

          <ThemeToggle />

          <Link href="/notifications" className="icon-btn" aria-label="Notifications">
            <Bell size={16} />
            {unreadCount > 0 && <span className="notif-dot" />}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="avatar-btn"
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

      <style jsx>{`
        .app-header {
          height: 60px;
          background: var(--app-header, rgba(6, 8, 16, 0.85));
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--app-border, #1c1f2e);
          display: flex;
          align-items: center;
          padding: 0 20px;
          z-index: 20;
          position: sticky;
          top: 0;
          gap: 16px;
        }
        .section-name-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }
        .section-name {
          font-family: var(--serif);
          font-size: 16px;
          font-weight: 700;
          color: var(--text, #e4e8f4);
          white-space: nowrap;
        }
        .section-link {
          font-family: var(--serif);
          font-size: 16px;
          font-weight: 700;
          color: var(--muted, #9ba3be);
          text-decoration: none;
          transition: color 0.15s;
        }
        .section-link:hover {
          color: var(--text, #e4e8f4);
        }
        .breadcrumb-sep {
          color: var(--muted, #9ba3be);
          font-size: 14px;
        }
        .header-search {
          flex: 1;
          display: flex;
          justify-content: center;
        }
        .search-input-wrap {
          position: relative;
          max-width: 320px;
          width: 100%;
        }
        .search-input {
          width: 100%;
          height: 32px;
          border-radius: 8px;
          background: var(--app-input, #151821);
          border: 1px solid var(--app-border, #1c1f2e);
          color: var(--text, #e4e8f4);
          font-size: 13px;
          padding: 0 12px 0 32px;
          font-family: var(--sans);
          outline: none;
          transition: border 0.2s, box-shadow 0.2s;
        }
        .search-input:focus {
          border-color: #0EA5E9;
          box-shadow: 0 0 0 2px rgba(14,165,233,0.15);
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }
        .icon-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--muted, #9ba3be);
          display: grid;
          place-items: center;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
          text-decoration: none;
        }
        .icon-btn:hover {
          color: var(--text, #e4e8f4);
          background: var(--app-card-hover, #181b27);
        }
        .notif-dot {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #0EA5E9;
          border: 2px solid var(--app-header, rgba(6,8,16,0.85));
        }
        .new-thread-btn {
          height: 32px;
          padding: 0 14px;
          border-radius: 8px;
          border: none;
          background: #0EA5E9;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          font-family: var(--sans);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background 0.2s;
          text-decoration: none;
        }
        .new-thread-btn:hover {
          background: #38BDF8;
        }
        .avatar-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          display: grid;
          place-items: center;
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
        }
        .hamburger {
          display: none;
        }
        @media (max-width: 859px) {
          .app-header {
            height: 52px;
            padding: 0 12px;
          }
          .hamburger {
            display: grid;
            place-items: center;
            width: 36px;
            height: 36px;
            border: none;
            background: transparent;
            color: var(--text, #e4e8f4);
            cursor: pointer;
            border-radius: 8px;
          }
          .hamburger:hover {
            background: var(--app-card-hover, #181b27);
          }
          .header-search {
            display: none;
          }
          .new-thread-btn :global(span) {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
