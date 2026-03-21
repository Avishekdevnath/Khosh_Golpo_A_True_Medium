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
      { label: "Threads",  href: "/threads",   Icon: MessageSquare },
      { label: "Messages", href: "/messages",   Icon: Mail,         badgeKey: "messages"      },
      { label: "People",   href: "/people",     Icon: Users         },
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

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  useEffect(() => {
    const h = () => setMobileOpen(v => !v);
    window.addEventListener("toggle-sidebar", h);
    return () => window.removeEventListener("toggle-sidebar", h);
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

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
  const totalBadge  = (msgCount || 0) + (unreadCount || 0);

  return (
    <>
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={cn(
          // Base layout
          "flex flex-col w-[240px] h-screen sticky top-0 shrink-0 overflow-hidden z-30",
          // Cinema dark glass look
          "bg-[rgba(6,8,14,0.97)] border-r border-[rgba(255,255,255,0.06)]",
          // Mobile: fixed drawer
          "max-[859px]:fixed max-[859px]:left-0 max-[859px]:top-0 max-[859px]:bottom-0 max-[859px]:h-dvh max-[859px]:z-40",
          "max-[859px]:translate-x-[-100%] max-[859px]:transition-transform max-[859px]:duration-[240ms] max-[859px]:ease-in",
          "max-[859px]:shadow-[6px_0_40px_rgba(0,0,0,0.7)]",
          mobileOpen && "max-[859px]:translate-x-0 max-[859px]:duration-[280ms] max-[859px]:ease-out",
          "min-[860px]:translate-x-0",
        )}
        aria-label="Primary navigation"
      >
        {/* Ambient top glow — orange blob */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -left-6 w-[180px] h-[180px] rounded-full opacity-[0.12]"
          style={{ background: "radial-gradient(circle, #0EA5E9 0%, transparent 70%)", filter: "blur(40px)" }}
        />
        {/* Ambient bottom glow — purple blob */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-16 -right-8 w-[140px] h-[140px] rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, #7c73f0 0%, transparent 70%)", filter: "blur(40px)" }}
        />

        {/* ── Logo ──────────────────────────────────────────────────── */}
        <button
          className={[
            "relative flex items-center gap-3 px-4 h-[60px] shrink-0 w-full text-left z-10",
            "border-0 border-b border-[rgba(255,255,255,0.06)] bg-transparent cursor-pointer",
            "transition-colors duration-150 hover:bg-[rgba(14,165,233,0.04)]",
          ].join(" ")}
          type="button"
          onClick={() => go("/")}
          aria-label="KhoshGolpo home"
        >
          {/* Logo icon with glow */}
          <span
            className="relative w-[32px] h-[32px] rounded-[10px] grid place-items-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)",
              boxShadow: "0 0 14px rgba(14,165,233,0.45), 0 2px 8px rgba(0,0,0,0.4)",
            }}
            aria-hidden="true"
          >
            <span className="font-serif font-bold text-white text-[15px] leading-none">K</span>
          </span>

          <span className="flex flex-col min-w-0 flex-1">
            <span className="font-serif text-[15px] font-bold text-white tracking-tight leading-[1.2]">
              KhoshGolpo
            </span>
            <span className="text-[10px] text-[rgba(255,255,255,0.3)] font-sans leading-none mt-0.5 tracking-wide">
              Community
            </span>
          </span>

          {totalBadge > 0 && (
            <span
              className="text-white rounded-full text-[10px] font-bold px-1.5 h-[18px] min-w-[18px] inline-flex items-center justify-center shrink-0"
              style={{ background: "#0EA5E9", boxShadow: "0 0 8px rgba(14,165,233,0.5)" }}
              aria-label={`${totalBadge} unread`}
            >
              {totalBadge > 99 ? "99+" : totalBadge}
            </span>
          )}
        </button>

        {/* ── Nav body ───────────────────────────────────────────────── */}
        <nav
          className="relative flex-1 overflow-y-auto py-2 min-h-0 flex flex-col [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar-thumb]:bg-[rgba(255,255,255,0.08)] [&::-webkit-scrollbar-thumb]:rounded"
          role="navigation"
        >
          {NAV_SECTIONS.map((section, si) => (
            <div key={section.label} className={cn("flex flex-col px-3 gap-0.5", si > 0 && "mt-4")}>
              {/* Section label */}
              <span
                className="block px-2 pt-1 pb-1.5 text-[9.5px] font-bold tracking-[0.12em] uppercase font-sans pointer-events-none select-none"
                style={{ color: "rgba(255,255,255,0.22)" }}
                aria-hidden="true"
              >
                {section.label}
              </span>

              {section.items.map(({ label, href, Icon, badgeKey }) => {
                const count  = badgeKey ? badges[badgeKey] : 0;
                const active = isActive(href);
                return (
                  <button
                    key={href}
                    type="button"
                    className={cn(
                      "group flex items-center gap-2.5 w-full h-[38px] px-2.5 rounded-xl",
                      "border-0 text-[13px] font-medium font-sans",
                      "cursor-pointer text-left transition-all duration-150 outline-offset-2",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(14,165,233,0.5)]",
                      active
                        ? "text-[#0EA5E9] font-semibold"
                        : "text-[rgba(255,255,255,0.48)] hover:text-[rgba(255,255,255,0.85)]",
                    )}
                    style={active ? {
                      background: "rgba(14,165,233,0.10)",
                      boxShadow: "inset 2px 0 0 #0EA5E9",
                    } : undefined}
                    onMouseEnter={e => {
                      if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                    }}
                    onMouseLeave={e => {
                      if (!active) (e.currentTarget as HTMLElement).style.background = "";
                    }}
                    onClick={() => go(href)}
                    aria-label={count > 0 ? `${label}, ${count} unread` : label}
                    aria-current={active ? "page" : undefined}
                  >
                    <span
                      className="flex items-center justify-center w-[18px] shrink-0 transition-all duration-150"
                      style={active ? { filter: "drop-shadow(0 0 6px rgba(14,165,233,0.6))" } : undefined}
                      aria-hidden="true"
                    >
                      <Icon size={15} strokeWidth={active ? 2.3 : 1.8} />
                    </span>
                    <span className="flex-1 leading-none">{label}</span>
                    {count > 0 && (
                      <span
                        className="text-white rounded-full text-[9px] font-bold px-1.5 h-[16px] min-w-[16px] inline-flex items-center justify-center"
                        style={{
                          background: active ? "#0EA5E9" : "rgba(14,165,233,0.7)",
                          boxShadow: active ? "0 0 6px rgba(14,165,233,0.4)" : "none",
                        }}
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
            <div className="flex flex-col px-3 gap-0.5 mt-4">
              <span
                className="block px-2 pt-1 pb-1.5 text-[9.5px] font-bold tracking-[0.12em] uppercase font-sans pointer-events-none select-none"
                style={{ color: "rgba(255,255,255,0.22)" }}
                aria-hidden="true"
              >
                Admin
              </span>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2.5 w-full h-[38px] px-2.5 rounded-xl",
                  "border-0 text-[13px] font-medium font-sans",
                  "cursor-pointer text-left transition-all duration-150 outline-offset-2",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(14,165,233,0.5)]",
                  isActive("/admin")
                    ? "text-[#0EA5E9] font-semibold"
                    : "text-[rgba(255,255,255,0.48)] hover:text-[rgba(255,255,255,0.85)]",
                )}
                style={isActive("/admin") ? {
                  background: "rgba(14,165,233,0.10)",
                  boxShadow: "inset 2px 0 0 #0EA5E9",
                } : undefined}
                onMouseEnter={e => {
                  if (!isActive("/admin")) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={e => {
                  if (!isActive("/admin")) (e.currentTarget as HTMLElement).style.background = "";
                }}
                onClick={() => go("/admin")}
                aria-current={isActive("/admin") ? "page" : undefined}
              >
                <span
                  className="flex items-center justify-center w-[18px] shrink-0"
                  style={isActive("/admin") ? { filter: "drop-shadow(0 0 6px rgba(14,165,233,0.6))" } : undefined}
                  aria-hidden="true"
                >
                  <BarChart3 size={15} strokeWidth={isActive("/admin") ? 2.3 : 1.8} />
                </span>
                <span className="flex-1 leading-none">Dashboard</span>
              </button>
            </div>
          )}
        </nav>

        {/* ── Divider ─────────────────────────────────────────────────── */}
        <div className="mx-3 h-px bg-[rgba(255,255,255,0.06)]" />

        {/* ── User footer ─────────────────────────────────────────────── */}
        <div className="relative p-2.5 pb-3 shrink-0" ref={menuRef}>
          {/* Pop-up menu */}
          {menuOpen && user && (
            <div
              className="absolute bottom-[calc(100%+6px)] left-2.5 right-2.5 rounded-2xl p-1.5 z-50"
              style={{
                background: "rgba(12,14,22,0.98)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 -8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
                animation: "popUp 0.15s cubic-bezier(0.16,1,0.3,1)",
              }}
              role="menu"
              aria-label="User options"
            >
              <button
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl border-0 bg-transparent text-[rgba(255,255,255,0.75)] text-[12.5px] font-sans cursor-pointer text-left transition-colors duration-120 hover:bg-[rgba(255,255,255,0.05)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(14,165,233,0.5)] outline-offset-2"
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); go(profileHref); }}
              >
                <User size={13} strokeWidth={1.8} className="shrink-0" />
                <span>View profile</span>
              </button>
              <button
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl border-0 bg-transparent text-[rgba(255,255,255,0.75)] text-[12.5px] font-sans cursor-pointer text-left transition-colors duration-120 hover:bg-[rgba(255,255,255,0.05)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(14,165,233,0.5)] outline-offset-2"
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); go("/settings"); }}
              >
                <Settings size={13} strokeWidth={1.8} className="shrink-0" />
                <span>Settings</span>
              </button>
              <div className="h-px bg-[rgba(255,255,255,0.06)] my-1 mx-2" role="separator" />
              <button
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl border-0 bg-transparent text-[#ef4444] text-[12.5px] font-sans cursor-pointer text-left transition-colors duration-120 hover:bg-[rgba(239,68,68,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(14,165,233,0.5)] outline-offset-2"
                type="button"
                role="menuitem"
                onClick={async () => {
                  setMenuOpen(false);
                  await logout();
                  router.push("/login");
                }}
              >
                <LogOut size={13} strokeWidth={1.8} className="shrink-0" />
                <span>Sign out</span>
              </button>
            </div>
          )}

          {/* User row */}
          <button
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl border-0 bg-transparent cursor-pointer text-left font-sans transition-colors duration-150 hover:bg-[rgba(255,255,255,0.04)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(14,165,233,0.5)] outline-offset-2"
            type="button"
            onClick={() => user && setMenuOpen(v => !v)}
            aria-label={user ? `${name} — open user menu` : "User options"}
            aria-expanded={menuOpen}
          >
            {/* Avatar */}
            <span
              className="relative w-[32px] h-[32px] rounded-[9px] grid place-items-center shrink-0"
              style={{ background: `linear-gradient(135deg,${c1},${c2})` }}
              aria-hidden="true"
            >
              <span className="text-[11px] font-bold text-white font-sans">{initials(name)}</span>
              {user && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-[8px] h-[8px] rounded-full border-2 border-[rgba(6,8,14,0.97)]"
                  style={{ background: "#3dd68c", boxShadow: "0 0 6px rgba(61,214,140,0.6)" }}
                  aria-hidden="true"
                />
              )}
            </span>

            {/* Text */}
            <span className="flex flex-col min-w-0 flex-1 gap-[2px]">
              <span className="text-[12.5px] font-semibold text-[rgba(255,255,255,0.85)] whitespace-nowrap overflow-hidden text-ellipsis leading-[1.3]">
                {name}
              </span>
              {handle && (
                <span className="text-[11px] text-[rgba(255,255,255,0.28)] whitespace-nowrap overflow-hidden text-ellipsis leading-[1.3]">
                  {handle}
                </span>
              )}
            </span>

            {/* Chevron */}
            {user && (
              <span
                className={cn(
                  "flex items-center text-[rgba(255,255,255,0.25)] shrink-0 transition-transform duration-200",
                  menuOpen && "rotate-180",
                )}
                aria-hidden="true"
              >
                <ChevronDown size={12} strokeWidth={2} />
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ── Mobile scrim ──────────────────────────────────────────────── */}
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
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(3px)",
              WebkitBackdropFilter: "blur(3px)",
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
