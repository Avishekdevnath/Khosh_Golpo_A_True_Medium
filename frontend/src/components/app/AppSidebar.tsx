"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3, Bell, ChevronDown,
  LogOut, Mail, MessageSquare,
  Settings, User, Users,
} from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import { useNotifications } from "@/hooks/useNotifications";
import { useMessageUnreadCount } from "@/hooks/useMessages";
import { profilePathFromUsername } from "@/lib/profileRouting";
import { avatarSeed, initials } from "@/lib/workspaceUtils";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavSection {
  label: string;
  items: NavDef[];
}

interface NavDef {
  label: string;
  href:  string;
  Icon:  React.ComponentType<{ size?: number; strokeWidth?: number }>;
  badgeKey?: "messages" | "notifications";
}

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Main",
    items: [
      { label: "Threads",  href: "/threads",       Icon: MessageSquare },
      { label: "Messages", href: "/messages",       Icon: Mail,          badgeKey: "messages"      },
      { label: "People",   href: "/people",         Icon: Users          },
    ],
  },
  {
    label: "You",
    items: [
      { label: "Notifications", href: "/notifications", Icon: Bell,     badgeKey: "notifications" },
      { label: "Settings",      href: "/settings",       Icon: Settings  },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AppSidebar() {
  const router   = useRouter();
  const pathname = usePathname();

  const { user, logout }               = useAuthStore();
  const { unreadCount }                = useNotifications();
  const { unreadCount: msgCount }      = useMessageUnreadCount();
  const [menuOpen, setMenuOpen]        = useState(false);
  const [mobileOpen, setMobileOpen]    = useState(false);
  const [mounted, setMounted]          = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const badges: Record<string, number> = {
    messages:      msgCount,
    notifications: unreadCount,
  };

  // Client-only portal
  useEffect(() => setMounted(true), []);

  // Close user menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  // Listen for hamburger event from AppNavbar
  useEffect(() => {
    const h = () => setMobileOpen(v => !v);
    window.addEventListener("toggle-sidebar", h);
    return () => window.removeEventListener("toggle-sidebar", h);
  }, []);

  // Close drawer on route change
  useEffect(() => setMobileOpen(false), [pathname]);

  // ── helpers ──
  const go = (href: string) => router.push(href);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const name        = user?.display_name ?? user?.username ?? "Guest";
  const handle      = user?.username ? `@${user.username}` : null;
  const [c1, c2]   = avatarSeed(user?.id ?? "guest");
  const profileHref = user ? profilePathFromUsername(user.username) : "/login";
  const isAdmin     = user?.role === "admin";

  const totalBadge = (msgCount || 0) + (unreadCount || 0);

  return (
    <>
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={cn(
          // Base layout
          "flex flex-col w-[240px] h-screen sticky top-0 shrink-0 overflow-hidden z-30",
          // Visuals
          "bg-card border-r border-border",
          // Mobile: fixed drawer, hidden off-screen by default
          "max-[859px]:fixed max-[859px]:left-0 max-[859px]:top-0 max-[859px]:bottom-0 max-[859px]:h-dvh max-[859px]:z-40",
          "max-[859px]:translate-x-[-100%] max-[859px]:transition-transform max-[859px]:duration-[220ms] max-[859px]:ease-in",
          "max-[859px]:shadow-[4px_0_32px_rgba(0,0,0,0.6)]",
          // Mobile open state
          mobileOpen && "max-[859px]:translate-x-0 max-[859px]:duration-[260ms] max-[859px]:ease-out",
          // Desktop: never transform
          "min-[860px]:translate-x-0",
        )}
        aria-label="Primary navigation"
      >
        {/* Logo ───────────────────────────────────────────────────── */}
        <button
          className={[
            "flex items-center gap-2.5 px-4 h-14 shrink-0 w-full text-left",
            "border-0 border-b border-border bg-transparent cursor-pointer",
            "transition-colors duration-150 hover:bg-[rgba(14,165,233,0.04)]",
          ].join(" ")}
          type="button"
          onClick={() => go("/")}
          aria-label="KhoshGolpo home"
        >
          <span
            className="w-[30px] h-[30px] rounded-lg bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] text-white font-serif font-bold text-[15px] grid place-items-center shrink-0 shadow-[0_2px_8px_rgba(14,165,233,0.35)]"
            aria-hidden="true"
          >
            K
          </span>
          <span className="flex-1 font-serif text-[15px] font-bold text-foreground tracking-tight">
            KhoshGolpo
          </span>
          {totalBadge > 0 && (
            <span
              className="bg-primary text-white rounded-full text-[10px] font-bold px-1.5 h-[18px] min-w-[18px] inline-flex items-center justify-center"
              aria-label={`${totalBadge} unread`}
            >
              {totalBadge > 99 ? "99+" : totalBadge}
            </span>
          )}
        </button>

        {/* Nav body ──────────────────────────────────────────────── */}
        <nav
          className="flex-1 overflow-y-auto py-3 min-h-0 flex flex-col gap-1 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded"
          role="navigation"
        >
          {NAV_SECTIONS.map(section => (
            <div key={section.label} className="flex flex-col px-2 gap-px mt-2 first:mt-0">
              <span
                className="block px-2.5 pt-2 pb-1 text-[10px] font-bold tracking-[0.1em] uppercase text-muted-foreground opacity-50 font-sans pointer-events-none select-none"
                aria-hidden="true"
              >
                {section.label}
              </span>
              {section.items.map(({ label, href, Icon, badgeKey }) => {
                const count = badgeKey ? badges[badgeKey] : 0;
                const active = isActive(href);
                return (
                  <button
                    key={href}
                    type="button"
                    className={cn(
                      "flex items-center gap-2.5 w-full h-10 px-2.5 rounded-lg",
                      "border-0 border-l-2 border-l-transparent text-[13px] font-medium font-sans",
                      "cursor-pointer text-left transition-[background,color,border-color] duration-150 outline-offset-2",
                      "text-muted-foreground",
                      "hover:bg-card-hover hover:text-foreground",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(14,165,233,0.5)]",
                      active && "bg-[rgba(14,165,233,0.10)] text-primary border-l-primary font-semibold",
                    )}
                    onClick={() => go(href)}
                    aria-label={count > 0 ? `${label}, ${count} unread` : label}
                    aria-current={active ? "page" : undefined}
                  >
                    <span
                      className={cn(
                        "flex items-center justify-center w-5 shrink-0",
                        active && "[filter:drop-shadow(0_0_6px_rgba(14,165,233,0.4))]",
                      )}
                      aria-hidden="true"
                    >
                      <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                    </span>
                    <span className="flex-1">{label}</span>
                    {count > 0 && (
                      <span
                        className="bg-primary text-white rounded-full text-[10px] font-bold px-1.5 h-[18px] min-w-[18px] inline-flex items-center justify-center animate-[badgePop_0.2s_ease]"
                        aria-hidden="true"
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Admin section */}
          {isAdmin && (
            <div className="flex flex-col px-2 gap-px mt-2">
              <span
                className="block px-2.5 pt-2 pb-1 text-[10px] font-bold tracking-[0.1em] uppercase text-muted-foreground opacity-50 font-sans pointer-events-none select-none"
                aria-hidden="true"
              >
                Admin
              </span>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2.5 w-full h-10 px-2.5 rounded-lg",
                  "border-0 border-l-2 border-l-transparent text-[13px] font-medium font-sans",
                  "cursor-pointer text-left transition-[background,color,border-color] duration-150 outline-offset-2",
                  "text-muted-foreground",
                  "hover:bg-card-hover hover:text-foreground",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(14,165,233,0.5)]",
                  isActive("/admin") && "bg-[rgba(14,165,233,0.10)] text-primary border-l-primary font-semibold",
                )}
                onClick={() => go("/admin")}
                aria-current={isActive("/admin") ? "page" : undefined}
              >
                <span
                  className={cn(
                    "flex items-center justify-center w-5 shrink-0",
                    isActive("/admin") && "[filter:drop-shadow(0_0_6px_rgba(14,165,233,0.4))]",
                  )}
                  aria-hidden="true"
                >
                  <BarChart3 size={16} strokeWidth={isActive("/admin") ? 2.2 : 1.8} />
                </span>
                <span className="flex-1">Dashboard</span>
              </button>
            </div>
          )}
        </nav>

        {/* User footer ───────────────────────────────────────────── */}
        <div className="shrink-0 relative p-[10px_10px_12px] border-t border-border" ref={menuRef}>
          {/* Pop-up menu */}
          {menuOpen && user && (
            <div
              className="absolute bottom-[calc(100%+4px)] left-2.5 right-2.5 bg-card border border-border rounded-xl p-1 shadow-[0_-4px_6px_rgba(0,0,0,0.15),0_-12px_32px_rgba(0,0,0,0.4)] z-50 animate-[popUp_0.15s_ease]"
              role="menu"
              aria-label="User options"
            >
              <button
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border-0 bg-transparent text-foreground text-[13px] font-sans cursor-pointer text-left transition-colors duration-[120ms] hover:bg-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(14,165,233,0.5)] outline-offset-2"
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); go(profileHref); }}
              >
                <User size={14} strokeWidth={1.8} />
                <span>View profile</span>
              </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border-0 bg-transparent text-foreground text-[13px] font-sans cursor-pointer text-left transition-colors duration-[120ms] hover:bg-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(14,165,233,0.5)] outline-offset-2"
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); go("/settings"); }}
              >
                <Settings size={14} strokeWidth={1.8} />
                <span>Settings</span>
              </button>
              <div className="h-px bg-border my-[3px] mx-2.5" role="separator" />
              <button
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border-0 bg-transparent text-red-500 text-[13px] font-sans cursor-pointer text-left transition-colors duration-[120ms] hover:bg-[rgba(239,68,68,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(14,165,233,0.5)] outline-offset-2"
                type="button"
                role="menuitem"
                onClick={async () => {
                  setMenuOpen(false);
                  await logout();
                  router.push("/login");
                }}
              >
                <LogOut size={14} strokeWidth={1.8} />
                <span>Sign out</span>
              </button>
            </div>
          )}

          {/* User row */}
          <button
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[10px] border-0 bg-transparent cursor-pointer text-left font-sans text-inherit transition-colors duration-150 hover:bg-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(14,165,233,0.5)] outline-offset-2"
            type="button"
            onClick={() => user && setMenuOpen(v => !v)}
            aria-label={user ? `${name} — open user menu` : "User options"}
            aria-expanded={menuOpen}
          >
            {/* Avatar */}
            <span
              className="relative w-[34px] h-[34px] rounded-[10px] grid place-items-center shrink-0"
              style={{ background: `linear-gradient(135deg,${c1},${c2})` }}
              aria-hidden="true"
            >
              <span className="text-[11px] font-bold text-white font-sans">{initials(name)}</span>
              {user && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-[9px] h-[9px] rounded-full bg-success border-2 border-card shadow-[0_0_6px_rgba(61,214,140,0.5)]"
                  aria-hidden="true"
                />
              )}
            </span>

            {/* Text */}
            <span className="flex flex-col min-w-0 flex-1 gap-px">
              <span className="text-[13px] font-semibold text-foreground whitespace-nowrap overflow-hidden text-ellipsis leading-[1.3]">
                {name}
              </span>
              {handle && (
                <span className="text-[11px] text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis leading-[1.3]">
                  {handle}
                </span>
              )}
            </span>

            {/* Chevron */}
            {user && (
              <span
                className={cn(
                  "flex items-center text-muted-foreground shrink-0 transition-transform duration-200",
                  menuOpen && "rotate-180",
                )}
                aria-hidden="true"
              >
                <ChevronDown size={13} strokeWidth={2} />
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ── Mobile scrim (portal — outside grid) ─────────────────────── */}
      {mounted && mobileOpen &&
        createPortal(
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            tabIndex={-1}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
              zIndex: 39,
              border: "none",
              cursor: "pointer",
              animation: "scrimIn 0.2s ease",
            }}
          />,
          document.body
        )
      }
    </>
  );
}
