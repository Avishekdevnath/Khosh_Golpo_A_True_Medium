"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  ChevronUp,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  Search,
  Settings,
  User,
  Users,
} from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import { useNotifications } from "@/hooks/useNotifications";
import { useMessageUnreadCount } from "@/hooks/useMessages";
import { profilePathFromUsername } from "@/lib/profileRouting";
import { avatarSeed, initials } from "@/lib/workspaceUtils";
import { cn } from "@/lib/utils";

/* ─── Nav items ───────────────────────────────────────────────────────────── */

interface NavItem {
  label: string;
  href: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  badgeKey?: "messages" | "notifications";
}

const TOP_NAV: NavItem[] = [
  { label: "Threads",       href: "/threads",       Icon: MessageSquare },
  { label: "Messages",      href: "/messages",      Icon: Mail,    badgeKey: "messages" },
  { label: "People",        href: "/people",        Icon: Users },
];

const BOTTOM_NAV: NavItem[] = [
  { label: "Notifications", href: "/notifications", Icon: Bell,    badgeKey: "notifications" },
  { label: "Settings",      href: "/settings",      Icon: Settings },
];

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotifications();
  const { unreadCount: msgCount } = useMessageUnreadCount();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const badges: Record<string, number> = {
    messages: msgCount,
    notifications: unreadCount,
  };

  useEffect(() => setMounted(true), []);

  /* Close user menu on outside click */
  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  /* Listen for hamburger toggle from MobileTopBar */
  useEffect(() => {
    const h = () => setMobileOpen((v) => !v);
    window.addEventListener("toggle-sidebar", h);
    return () => window.removeEventListener("toggle-sidebar", h);
  }, []);

  /* Close drawer on route change */
  useEffect(() => setMobileOpen(false), [pathname]);

  /* ── helpers ── */
  const go = (href: string) => router.push(href);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const name = user?.display_name ?? user?.username ?? "Guest";
  const handle = user?.username ? `@${user.username}` : null;
  const [c1, c2] = avatarSeed(user?.id ?? "guest");
  const profileHref = user ? profilePathFromUsername(user.username) : "/login";
  const isAdmin = user?.role === "admin";

  /* ── render a nav row ── */
  function NavRow({ item }: { item: NavItem }) {
    const { label, href, Icon, badgeKey } = item;
    const active = isActive(href);
    const count = badgeKey ? badges[badgeKey] : 0;

    return (
      <button
        type="button"
        onClick={() => go(href)}
        aria-label={count > 0 ? `${label}, ${count} unread` : label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 w-full h-10 px-3 rounded-lg",
          "border-0 text-[13.5px] font-medium font-sans",
          "cursor-pointer text-left transition-all duration-150",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/50 outline-offset-2",
          active
            ? "bg-primary/10 text-primary font-semibold"
            : "text-muted-foreground hover:bg-[rgba(255,255,255,0.04)] hover:text-foreground",
        )}
      >
        <span
          className={cn("shrink-0 flex items-center transition-all duration-150", active && "drop-shadow-[0_0_6px_rgba(14,165,233,0.5)]")}
        >
          <Icon size={18} strokeWidth={active ? 2.2 : 1.6} />
        </span>
        <span className="flex-1">{label}</span>
        {count > 0 && (
          <span
            className={cn(
              "rounded-full text-[10px] font-bold px-1.5 min-w-[18px] h-[18px]",
              "inline-flex items-center justify-center",
              active
                ? "bg-primary text-white"
                : "bg-primary/20 text-primary",
            )}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
    );
  }

  return (
    <>
      <aside
        className={cn(
          /* Base */
          "flex flex-col w-[260px] h-dvh sticky top-0 shrink-0 z-30",
          "bg-sidebar border-r border-sidebar-border",
          /* Mobile: fixed drawer */
          "max-[859px]:fixed max-[859px]:inset-y-0 max-[859px]:left-0 max-[859px]:z-[60]",
          "max-[859px]:translate-x-[-100%] max-[859px]:transition-transform max-[859px]:duration-200 max-[859px]:ease-out",
          "max-[859px]:shadow-[8px_0_30px_rgba(0,0,0,0.5)]",
          mobileOpen && "max-[859px]:translate-x-0",
          "min-[860px]:translate-x-0",
        )}
        aria-label="Primary navigation"
      >
        {/* ── Logo ── */}
        <div className="flex items-center gap-3 px-6 h-16 shrink-0 border-b border-sidebar-border">
          <button
            type="button"
            onClick={() => go("/")}
            className="flex items-center gap-3 border-0 bg-transparent cursor-pointer p-0 group"
            aria-label="KhoshGolpo home"
          >
            <span
              className="w-8 h-8 rounded-lg grid place-items-center shrink-0 transition-shadow duration-200 group-hover:shadow-[0_0_16px_rgba(14,165,233,0.4)]"
              style={{ background: "linear-gradient(135deg, #0EA5E9, #0284C7)" }}
            >
              <span className="font-serif font-bold text-white text-sm leading-none">K</span>
            </span>
            <span className="font-serif text-[16px] font-bold text-foreground tracking-tight">
              KhoshGolpo
            </span>
          </button>
        </div>

        {/* ── New Thread CTA ── */}
        <div className="px-5 pt-5 pb-2">
          <Link
            href="/threads/new"
            className={cn(
              "flex items-center justify-center gap-2 w-full h-[38px] rounded-lg",
              "bg-primary text-white text-[13px] font-semibold font-sans no-underline",
              "transition-all duration-150",
              "hover:bg-[#38BDF8] hover:shadow-[0_2px_16px_rgba(14,165,233,0.3)]",
              "active:scale-[0.98]",
            )}
          >
            <Plus size={15} strokeWidth={2.5} />
            New Thread
          </Link>
        </div>

        {/* ── Main nav ── */}
        <nav className="flex-1 overflow-y-auto px-5 pt-4 pb-3 flex flex-col gap-1 min-h-0" role="navigation">
          {TOP_NAV.map((item) => (
            <NavRow key={item.href} item={item} />
          ))}

          {/* Spacer */}
          <div className="my-2 h-px bg-sidebar-border" />

          {BOTTOM_NAV.map((item) => (
            <NavRow key={item.href} item={item} />
          ))}

          {/* Admin */}
          {isAdmin && (
            <>
              <div className="my-2 h-px bg-sidebar-border" />
              <NavRow
                item={{ label: "Dashboard", href: "/admin", Icon: BarChart3 }}
              />
            </>
          )}
        </nav>

        {/* ── User footer ── */}
        <div ref={menuRef} className="relative shrink-0 border-t border-sidebar-border px-5 py-3">
          {/* Pop-up menu */}
          {menuOpen && user && (
            <div
              className="absolute bottom-[calc(100%+6px)] left-5 right-5 rounded-xl p-1.5 z-50 border border-border bg-popover shadow-xl animate-[popUp_0.15s_ease]"
              role="menu"
              aria-label="User options"
            >
              {[
                { label: "Profile", icon: User, action: () => go(profileHref) },
                { label: "Settings", icon: Settings, action: () => go("/settings") },
              ].map(({ label, icon: Ic, action }) => (
                <button
                  key={label}
                  type="button"
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); action(); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg border-0 bg-transparent text-foreground/75 text-[13px] font-sans cursor-pointer text-left transition-colors duration-100 hover:bg-card-hover hover:text-foreground"
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
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg border-0 bg-transparent text-destructive text-[13px] font-sans cursor-pointer text-left transition-colors duration-100 hover:bg-destructive/10"
              >
                <LogOut size={14} strokeWidth={1.7} />
                Sign out
              </button>
            </div>
          )}

          {/* User row */}
          <button
            type="button"
            onClick={() => user && setMenuOpen((v) => !v)}
            aria-label={user ? `${name} — open user menu` : "Guest"}
            aria-expanded={menuOpen}
            className="flex items-center gap-2.5 w-full px-2 py-2 rounded-xl border-0 bg-transparent cursor-pointer text-left font-sans transition-colors duration-150 hover:bg-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/50 outline-offset-2"
          >
            <span
              className="relative w-8 h-8 rounded-lg grid place-items-center shrink-0"
              style={{ background: `linear-gradient(135deg,${c1},${c2})` }}
            >
              <span className="text-[11px] font-bold text-white">{initials(name)}</span>
              {user && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-success border-[1.5px] border-sidebar" />
              )}
            </span>
            <span className="flex flex-col min-w-0 flex-1">
              <span className="text-[13px] font-semibold text-foreground truncate leading-tight">
                {name}
              </span>
              {handle && (
                <span className="text-[11px] text-muted-foreground truncate leading-tight">
                  {handle}
                </span>
              )}
            </span>
            {user && (
              <ChevronUp
                size={14}
                className={cn(
                  "shrink-0 text-muted-foreground transition-transform duration-200",
                  !menuOpen && "rotate-180",
                )}
              />
            )}
          </button>
        </div>
      </aside>

      {/* ── Mobile scrim ── */}
      {mounted &&
        mobileOpen &&
        createPortal(
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            tabIndex={-1}
            className="fixed inset-0 z-50 border-0 cursor-pointer bg-black/60 backdrop-blur-sm animate-[scrimIn_0.2s_ease]"
          />,
          document.body,
        )}
    </>
  );
}
