"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Bell, ChevronUp, LogOut, Mail, MessageSquare, Settings, UserRound, Users, X } from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import { useChannels, type Channel } from "@/hooks/useChannels";
import { useNotifications } from "@/hooks/useNotifications";
import { useMessageUnreadCount } from "@/hooks/useMessages";
import { profilePathFromUsername } from "@/lib/profileRouting";
import { avatarSeed, initials } from "@/lib/workspaceUtils";
import { cn } from "@/lib/utils";

type WorkspaceSidebarProps = {
  channels?: Channel[];
  activeChannelSlug?: string;
  onChannelSelect?: (slug: string) => void;
  showAllChannelsOption?: boolean;
  hideChannels?: boolean;
  hideAdminNav?: boolean;
  extraSectionTitle?: string;
  extraSection?: ReactNode;
};

export default function WorkspaceSidebar({
  channels,
  activeChannelSlug,
  onChannelSelect,
  showAllChannelsOption = false,
  hideChannels = true,
  hideAdminNav = false,
  extraSectionTitle,
  extraSection,
}: WorkspaceSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { channels: allChannels } = useChannels();
  const { unreadCount } = useNotifications();
  const { unreadCount: messageUnreadCount } = useMessageUnreadCount();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleToggleSidebar() {
      setMobileOpen((v) => !v);
    }
    window.addEventListener("toggle-sidebar", handleToggleSidebar);
    return () => window.removeEventListener("toggle-sidebar", handleToggleSidebar);
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [userMenuOpen]);

  const channelItems = channels ?? allChannels;
  const sidebarName = user?.display_name ?? user?.username ?? "Guest";
  const [av1, av2] = avatarSeed(user?.id ?? "guest");
  const profilePath = user ? profilePathFromUsername(user.username) : "/login";

  const mainItems = [
    { label: "Threads", href: "/threads", icon: MessageSquare, badge: null as string | null },
    { label: "Messages", href: "/messages", icon: Mail, badge: messageUnreadCount > 0 ? String(messageUnreadCount) : null },
    { label: "People", href: "/people", icon: Users, badge: null as string | null },
  ];

  const youItems = [
    { label: "Notifications", href: "/notifications", icon: Bell, badge: unreadCount > 0 ? String(unreadCount) : null },
    { label: "Settings", href: "/settings", icon: Settings, badge: null as string | null },
  ];

  const adminItems = user?.role === "admin" && !hideAdminNav
    ? [{ label: "Dashboard", href: "/admin", icon: BarChart3, badge: null as string | null }]
    : [];

  function isActive(href: string) {
    if (href === "/people") return pathname.startsWith("/people");
    if (href === "/threads") return pathname.startsWith("/threads");
    if (href === "/messages") return pathname.startsWith("/messages");
    if (href === "/notifications") return pathname.startsWith("/notifications");
    if (href === "/settings") return pathname.startsWith("/settings");
    if (href === "/admin") return pathname.startsWith("/admin");
    if (user && href === profilePath) return pathname === href;
    return pathname === href;
  }

  function navigate(href: string) {
    setMobileOpen(false);
    router.push(href);
  }

  function handleChannelClick(slug: string) {
    setMobileOpen(false);
    if (onChannelSelect) {
      onChannelSelect(slug);
      return;
    }
    router.push("/threads");
  }

  const allChannelActive = activeChannelSlug === "all";

  // Shared nav-item class builder
  const navItemCls = (active: boolean) =>
    cn(
      "border-0 border-l-2 border-l-transparent bg-transparent rounded-lg",
      "h-9 mx-2 px-3 flex items-center gap-2.5",
      "text-[13px] font-medium font-sans cursor-pointer transition-all duration-150",
      "text-muted-foreground",
      "hover:text-foreground hover:bg-card-hover",
      active && "text-primary bg-[rgba(14,165,233,0.10)] border-l-primary",
    );

  const badgeCls = "ml-auto bg-primary text-white rounded-full text-[10px] font-semibold px-1.5 h-[18px] min-w-[18px] inline-flex items-center justify-center text-center";

  function renderNavItems(items: typeof mainItems) {
    return items.map(item => {
      const Icon = item.icon;
      return (
        <button
          key={item.label}
          type="button"
          className={navItemCls(isActive(item.href))}
          onClick={() => navigate(item.href)}
        >
          <Icon size={18} />
          <span>{item.label}</span>
          {item.badge && <span className={badgeCls}>{item.badge}</span>}
        </button>
      );
    });
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          className="hidden max-[859px]:block fixed inset-0 border-0 bg-black/40 z-[39]"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          // Base layout
          "sticky top-0 h-screen w-[240px] bg-card border-r border-border z-30 p-0 flex flex-col overflow-hidden",
          // Mobile drawer
          "max-[859px]:fixed max-[859px]:left-0 max-[859px]:top-0 max-[859px]:bottom-0 max-[859px]:w-[240px] max-[859px]:z-40",
          "max-[859px]:-translate-x-full max-[859px]:transition-transform max-[859px]:duration-[180ms] max-[859px]:ease-in",
          mobileOpen && "max-[859px]:translate-x-0 max-[859px]:duration-[250ms] max-[859px]:ease-out",
          // Desktop: sticky
          "min-[860px]:sticky min-[860px]:translate-x-0",
        )}
      >
        {/* Brand */}
        <button
          className="border-0 bg-transparent text-foreground flex items-center gap-2.5 px-4 h-[52px] cursor-pointer text-left shrink-0"
          type="button"
          onClick={() => navigate("/")}
        >
          <span className="w-7 h-7 rounded-lg bg-primary grid place-items-center text-white font-serif font-bold text-[15px] shrink-0">
            K
          </span>
          <span className="font-serif text-base font-bold">KhoshGolpo</span>
        </button>

        {/* MAIN */}
        <div className="text-[11px] tracking-[0.06em] uppercase text-muted-foreground px-4 pt-6 pb-2 font-bold shrink-0">
          MAIN
        </div>
        <div className="grid gap-0.5 mb-1 shrink-0">
          {renderNavItems(mainItems)}
        </div>

        {/* YOU */}
        <div className="text-[11px] tracking-[0.06em] uppercase text-muted-foreground px-4 pt-6 pb-2 font-bold shrink-0">
          YOU
        </div>
        <div className="grid gap-0.5 mb-1 shrink-0">
          {renderNavItems(youItems)}
        </div>

        {/* ADMIN */}
        {adminItems.length > 0 && (
          <>
            <div className="text-[11px] tracking-[0.06em] uppercase text-muted-foreground px-4 pt-6 pb-2 font-bold shrink-0">
              ADMIN
            </div>
            <div className="grid gap-0.5 mb-1 shrink-0">
              {renderNavItems(adminItems)}
            </div>
          </>
        )}

        {/* Extra section */}
        {extraSection && (
          <>
            <div className="text-[11px] tracking-[0.06em] uppercase text-muted-foreground px-4 pt-6 pb-2 font-bold shrink-0" style={{ marginTop: 4 }}>
              {extraSectionTitle ?? "Sections"}
            </div>
            <div
              className={cn(
                "grid gap-0.5 mb-3 max-h-[42vh] overflow-y-auto min-h-0",
                hideChannels && "flex-1 max-h-none mb-0 content-start",
              )}
            >
              {extraSection}
            </div>
          </>
        )}

        {/* Channels */}
        {!hideChannels && (
          <>
            <div className="text-[11px] tracking-[0.06em] uppercase text-muted-foreground px-4 pt-6 pb-2 font-bold shrink-0" style={{ marginTop: 4 }}>
              Channels
            </div>
            <div className="flex-1 overflow-y-auto grid gap-0.5 pr-0.5 min-h-0 content-start">
              {showAllChannelsOption && onChannelSelect && (
                <button
                  type="button"
                  className={cn(
                    "border-0 border-l-2 border-l-transparent bg-transparent rounded-[7px]",
                    "py-[7px] px-2.5 flex items-center gap-2 text-[12px] text-left cursor-pointer",
                    "font-sans transition-all duration-150 text-muted-foreground",
                    "hover:text-foreground hover:bg-secondary",
                    allChannelActive && "text-[#818CF8] border-l-[#818CF8] bg-[rgba(129,140,248,0.12)]",
                  )}
                  onClick={() => handleChannelClick("all")}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#818CF8" }} />
                  <span>#all channels</span>
                </button>
              )}
              {channelItems.map(ch => (
                <button
                  key={ch.slug}
                  type="button"
                  className={cn(
                    "border-0 border-l-2 border-l-transparent bg-transparent rounded-[7px]",
                    "py-[7px] px-2.5 flex items-center gap-2 text-[12px] text-left cursor-pointer",
                    "font-sans transition-all duration-150 text-muted-foreground",
                    "hover:text-foreground hover:bg-secondary",
                    activeChannelSlug === ch.slug && "text-[#818CF8] border-l-[#818CF8] bg-[rgba(129,140,248,0.12)]",
                  )}
                  onClick={() => handleChannelClick(ch.slug)}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ch.color }} />
                  <span>#{ch.name.toLowerCase()}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* User footer */}
        <div className="relative mt-auto pt-3 px-4 pb-3 border-t border-border shrink-0" ref={userMenuRef}>
          {/* User menu popup */}
          {userMenuOpen && user && (
            <div className="absolute bottom-full left-0 right-0 mb-1.5 bg-secondary border border-border rounded-[10px] p-1 shadow-[0_8px_24px_rgba(0,0,0,0.45)] z-10 animate-[menuSlide_0.12s_ease]">
              <button
                type="button"
                className="w-full border-0 bg-transparent text-foreground flex items-center gap-2 px-2.5 py-2 rounded-[7px] text-[13px] cursor-pointer transition-all duration-[120ms] font-sans hover:bg-border"
                onClick={() => { setUserMenuOpen(false); navigate(profilePath); }}
              >
                <UserRound size={14} /> Profile
              </button>
              <button
                type="button"
                className="w-full border-0 bg-transparent text-foreground flex items-center gap-2 px-2.5 py-2 rounded-[7px] text-[13px] cursor-pointer transition-all duration-[120ms] font-sans hover:bg-border"
                onClick={() => { setUserMenuOpen(false); navigate("/settings"); }}
              >
                <Settings size={14} /> Settings
              </button>
              <div className="h-px bg-border my-0.5 mx-1.5" />
              <button
                type="button"
                className="w-full border-0 bg-transparent text-red-500 flex items-center gap-2 px-2.5 py-2 rounded-[7px] text-[13px] cursor-pointer transition-all duration-[120ms] font-sans hover:bg-[rgba(239,68,68,0.12)] hover:text-red-500"
                onClick={async () => { setUserMenuOpen(false); await logout(); router.push("/login"); }}
              >
                <LogOut size={14} /> Log out
              </button>
            </div>
          )}

          {/* User row */}
          <button
            type="button"
            className="flex items-center gap-2.5 w-full border-0 bg-transparent px-1 py-1 rounded-lg cursor-pointer transition-colors duration-150 font-sans text-inherit text-left hover:bg-card-hover"
            onClick={() => user && setUserMenuOpen(v => !v)}
          >
            <div
              className="w-8 h-8 rounded-full grid place-items-center text-[11px] font-bold text-white shrink-0 relative"
              style={{ background: `linear-gradient(135deg,${av1},${av2})` }}
            >
              {initials(sidebarName)}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="text-[13px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                {sidebarName}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center">
                {user
                  ? <><span className="w-2 h-2 rounded-full bg-success border-2 border-white mr-[5px] shrink-0" />Online</>
                  : <Link href="/login" style={{ color: "#0EA5E9", textDecoration: "none", fontWeight: 600 }}>Sign in</Link>}
              </div>
            </div>
            {user && (
              <ChevronUp
                size={14}
                style={{
                  color: "var(--muted, #9ba3be)",
                  transform: userMenuOpen ? "rotate(0)" : "rotate(180deg)",
                  transition: "transform 0.15s",
                }}
              />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
