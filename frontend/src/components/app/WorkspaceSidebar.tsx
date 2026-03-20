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

  function renderNavItems(items: typeof mainItems) {
    return items.map(item => {
      const Icon = item.icon;
      return (
        <button
          key={item.label}
          type="button"
          className={`nav-item ${isActive(item.href) ? "active" : ""}`}
          onClick={() => navigate(item.href)}
        >
          <Icon size={18} />
          <span>{item.label}</span>
          {item.badge && <span className="badge">{item.badge}</span>}
        </button>
      );
    });
  }

  return (
    <>
      {mobileOpen && <button type="button" className="mob-backdrop" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <button className="brand" type="button" onClick={() => navigate("/")}>
          <span className="brand-icon">K</span>
          <span className="brand-name">KhoshGolpo</span>
        </button>

        <div className="sec-label">MAIN</div>
        <div className="main-nav">
          {renderNavItems(mainItems)}
        </div>

        <div className="sec-label">YOU</div>
        <div className="main-nav">
          {renderNavItems(youItems)}
        </div>

        {adminItems.length > 0 && (
          <>
            <div className="sec-label">ADMIN</div>
            <div className="main-nav">
              {renderNavItems(adminItems)}
            </div>
          </>
        )}

        {extraSection && (
          <>
            <div className="sec-label" style={{ marginTop: 4 }}>{extraSectionTitle ?? "Sections"}</div>
            <div className={`extra-section kg-scroll kg-scroll--sm kg-scroll--subtle ${hideChannels ? "fill" : ""}`}>{extraSection}</div>
          </>
        )}

        {!hideChannels && (
          <>
            <div className="sec-label" style={{ marginTop: 4 }}>Channels</div>
            <div className="channels kg-scroll kg-scroll--sm kg-scroll--subtle">
              {showAllChannelsOption && onChannelSelect && (
                <button
                  type="button"
                  className={`channel ${allChannelActive ? "active" : ""}`}
                  onClick={() => handleChannelClick("all")}
                >
                  <span className="dot" style={{ background: "#818CF8" }} />
                  <span>#all channels</span>
                </button>
              )}
              {channelItems.map(ch => (
                <button
                  key={ch.slug}
                  type="button"
                  className={`channel ${activeChannelSlug === ch.slug ? "active" : ""}`}
                  onClick={() => handleChannelClick(ch.slug)}
                >
                  <span className="dot" style={{ background: ch.color }} />
                  <span>#{ch.name.toLowerCase()}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="sb-user-wrap" ref={userMenuRef}>
          {userMenuOpen && user && (
            <div className="user-menu">
              <button type="button" className="menu-item" onClick={() => { setUserMenuOpen(false); navigate(profilePath); }}>
                <UserRound size={14} /> Profile
              </button>
              <button type="button" className="menu-item" onClick={() => { setUserMenuOpen(false); navigate("/settings"); }}>
                <Settings size={14} /> Settings
              </button>
              <div className="menu-sep" />
              <button type="button" className="menu-item logout" onClick={async () => { setUserMenuOpen(false); await logout(); router.push("/login"); }}>
                <LogOut size={14} /> Log out
              </button>
            </div>
          )}
          <button type="button" className="sb-user" onClick={() => user && setUserMenuOpen(v => !v)}>
            <div className="sb-avatar" style={{ background: `linear-gradient(135deg,${av1},${av2})` }}>
              {initials(sidebarName)}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="sb-name">{sidebarName}</div>
              <div className="sb-status">
                {user
                  ? <><span className="online-dot" />Online</>
                  : <Link href="/login" style={{ color: "#0EA5E9", textDecoration: "none", fontWeight: 600 }}>Sign in</Link>}
              </div>
            </div>
            {user && <ChevronUp size={14} className="sb-chevron" style={{ color: "var(--muted, #9ba3be)", transform: userMenuOpen ? "rotate(0)" : "rotate(180deg)", transition: "transform 0.15s" }} />}
          </button>
        </div>
      </aside>

      <style jsx>{`
        .mob-backdrop {
          display: none;
        }

        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 240px;
          background: var(--app-sidebar, #0a0c14);
          border-right: 1px solid var(--app-border, #1c1f2e);
          z-index: 30;
          padding: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .brand {
          border: none;
          background: transparent;
          color: var(--text, #e4e8f4);
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px;
          height: 52px;
          cursor: pointer;
          text-align: left;
          flex-shrink: 0;
        }
        .brand-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: #0EA5E9;
          display: grid;
          place-items: center;
          color: #fff;
          font-family: var(--serif), serif;
          font-weight: 700;
          font-size: 15px;
          flex-shrink: 0;
        }
        .brand-name { font-family: var(--serif), serif; font-size: 16px; font-weight: 700; }
        .sec-label {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--muted, #9ba3be);
          padding: 24px 16px 8px 16px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .main-nav { display: grid; gap: 2px; margin-bottom: 4px; flex-shrink: 0; }
        .nav-item {
          border: none;
          border-left: 2px solid transparent;
          background: transparent;
          color: var(--muted, #9ba3be);
          border-radius: 8px;
          height: 36px;
          margin: 0 8px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          font-family: var(--sans), sans-serif;
        }
        .nav-item:hover { color: var(--text, #e4e8f4); background: var(--app-card-hover, #181b27); }
        .nav-item.active { color: #0EA5E9; background: rgba(14,165,233,0.10); border-left-color: #0EA5E9; }
        .badge {
          margin-left: auto;
          background: #0EA5E9;
          color: #fff;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 600;
          padding: 1px 6px;
          min-width: 18px;
          height: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .channels {
          flex: 1;
          overflow-y: auto;
          display: grid;
          gap: 2px;
          padding-right: 2px;
          min-height: 0;
          align-content: start;
        }
        .extra-section {
          display: grid;
          gap: 2px;
          margin-bottom: 12px;
          max-height: 42vh;
          overflow-y: auto;
          min-height: 0;
        }
        .extra-section.fill {
          flex: 1;
          max-height: none;
          margin-bottom: 0;
          align-content: start;
        }
        .extra-section :global(.extra-item) {
          border: none;
          border-left: 2px solid transparent;
          background: transparent;
          color: var(--muted, #9ba3be);
          border-radius: 8px;
          height: 36px;
          margin: 0 8px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          width: calc(100% - 16px);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          font-family: var(--sans), sans-serif;
          text-align: left;
        }
        .extra-section :global(.extra-item:hover) {
          color: var(--text, #e4e8f4);
          background: var(--app-card-hover, #181b27);
        }
        .extra-section :global(.extra-item.active) {
          color: #0EA5E9;
          border-left-color: #0EA5E9;
          background: rgba(14,165,233,0.10);
        }
        .extra-section :global(.extra-badge) {
          margin-left: auto;
          background: #1d2334;
          color: var(--muted, #9ba3be);
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          min-width: 18px;
          text-align: center;
        }
        .extra-section :global(.extra-badge.warn) {
          color: #fca5a5;
          background: rgba(239,68,68,0.15);
        }
        .channel {
          border: none;
          border-left: 2px solid transparent;
          background: transparent;
          color: var(--muted, #9ba3be);
          border-radius: 7px;
          padding: 7px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          text-align: left;
          cursor: pointer;
          transition: all 0.15s;
          font-family: var(--sans), sans-serif;
        }
        .channel:hover { color: var(--text, #e4e8f4); background: var(--app-input, #151821); }
        .channel.active { color: #818CF8; border-left-color: #818CF8; background: rgba(129,140,248,0.12); }
        .dot { width: 6px; height: 6px; border-radius: 999px; flex-shrink: 0; }
        .sb-user-wrap {
          position: relative;
          margin-top: auto;
          padding: 12px 16px;
          border-top: 1px solid var(--app-border, #1c1f2e);
          flex-shrink: 0;
        }
        .sb-user {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          border: none;
          background: transparent;
          padding: 4px 4px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
          font-family: var(--sans), sans-serif;
          color: inherit;
          text-align: left;
        }
        .sb-user:hover { background: var(--app-card-hover, #181b27); }
        .user-menu {
          position: absolute;
          bottom: 100%;
          left: 0;
          right: 0;
          margin-bottom: 6px;
          background: var(--app-input, #151821);
          border: 1px solid var(--app-border, #1c1f2e);
          border-radius: 10px;
          padding: 4px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.45);
          z-index: 10;
          animation: menuSlide 0.12s ease;
        }
        @keyframes menuSlide {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .menu-item {
          width: 100%;
          border: none;
          background: transparent;
          color: var(--text, #e4e8f4);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 7px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.12s;
          font-family: var(--sans), sans-serif;
        }
        .menu-item:hover { background: var(--app-border, #1c1f2e); color: var(--text, #e4e8f4); }
        .menu-item.logout { color: #ef4444; }
        .menu-item.logout:hover { background: rgba(239,68,68,0.12); color: #ef4444; }
        .menu-sep { height: 1px; background: var(--app-border, #1c1f2e); margin: 2px 6px; }
        .sb-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
          position: relative;
        }
        .sb-name {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sb-status { font-size: 11px; color: var(--muted, #9ba3be); display: flex; align-items: center; }
        .online-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #3dd68c;
          border: 2px solid #fff;
          margin-right: 5px;
          flex-shrink: 0;
        }

        @media (max-width: 859px) {
          .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            width: 240px;
            transform: translateX(-100%);
            transition: transform 180ms ease-in;
            z-index: 40;
          }
          .sidebar.open {
            transform: translateX(0);
            transition: transform 250ms ease-out;
          }
          .mob-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            border: none;
            background: rgba(0,0,0,0.4);
            z-index: 39;
          }
        }

        @media (min-width: 860px) {
          .sidebar {
            position: fixed;
          }
        }
      `}</style>
    </>
  );
}
