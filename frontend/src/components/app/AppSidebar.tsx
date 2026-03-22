"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  Briefcase,
  Mail,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import { useNotifications } from "@/hooks/useNotifications";
import { useMessageUnreadCount } from "@/hooks/useMessages";
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
  { label: "Jobs",          href: "/jobs",          Icon: Briefcase },
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
  const { user } = useAuthStore();
  const { unreadCount } = useNotifications();
  const { unreadCount: msgCount } = useMessageUnreadCount();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const badges: Record<string, number> = {
    messages: msgCount,
    notifications: unreadCount,
  };

  useEffect(() => setMounted(true), []);

  /* Listen for hamburger toggle from AppNavbar */
  useEffect(() => {
    const h = () => setMobileOpen(v => !v);
    window.addEventListener("toggle-sidebar", h);
    return () => window.removeEventListener("toggle-sidebar", h);
  }, []);

  /* Close drawer on route change */
  useEffect(() => setMobileOpen(false), [pathname]);

  const go = (href: string) => router.push(href);
  const isAdmin = user?.role === "admin";

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  /* ── Nav row ── */
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
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
        )}
      >
        <span className={cn("shrink-0 flex items-center transition-all duration-150", active && "drop-shadow-[0_0_6px_rgba(14,165,233,0.5)]")}>
          <Icon size={18} strokeWidth={active ? 2.2 : 1.6} />
        </span>
        <span className="flex-1">{label}</span>
        {count > 0 && (
          <span className={cn(
            "rounded-full text-[10px] font-bold px-1.5 min-w-[18px] h-[18px]",
            "inline-flex items-center justify-center",
            active ? "bg-primary text-white" : "bg-primary/20 text-primary",
          )}>
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
          "flex flex-col w-[260px] shrink-0 z-30",
          "bg-sidebar border-r border-sidebar-border",
          /* Desktop: sticky column below navbar */
          "min-[860px]:sticky min-[860px]:top-14 min-[860px]:h-[calc(100dvh-3.5rem)]",
          /* Mobile: fixed full-height drawer */
          "max-[859px]:fixed max-[859px]:inset-y-0 max-[859px]:left-0 max-[859px]:h-dvh max-[859px]:z-[60]",
          "max-[859px]:translate-x-[-100%] max-[859px]:transition-transform max-[859px]:duration-200 max-[859px]:ease-out",
          mobileOpen && "max-[859px]:translate-x-0 max-[859px]:shadow-[8px_0_30px_rgba(0,0,0,0.5)]",
        )}
        aria-label="Primary navigation"
      >
        {/* ── Main nav ── */}
        <nav className="flex-1 overflow-y-auto px-5 pt-4 pb-3 flex flex-col gap-1 min-h-0" role="navigation">
          {TOP_NAV.map(item => <NavRow key={item.href} item={item} />)}

          <div className="my-2 h-px bg-sidebar-border" />

          {BOTTOM_NAV.map(item => <NavRow key={item.href} item={item} />)}

          {/* Admin */}
          {isAdmin && (
            <>
              <div className="my-2 h-px bg-sidebar-border" />
              <NavRow item={{ label: "Dashboard", href: "/admin", Icon: BarChart3 }} />
            </>
          )}
        </nav>
      </aside>

      {/* ── Mobile scrim ── */}
      {mounted && mobileOpen && createPortal(
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
