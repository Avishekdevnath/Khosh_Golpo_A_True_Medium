"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3, Bell, LogOut, Mail,
  MessageSquare, Settings, User, Users,
} from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import { useNotifications } from "@/hooks/useNotifications";
import { useMessageUnreadCount } from "@/hooks/useMessages";
import { profilePathFromUsername } from "@/lib/profileRouting";
import { avatarSeed, initials } from "@/lib/workspaceUtils";

// ─── Nav config ──────────────────────────────────────────────────────────────

const MAIN_NAV = [
  { label: "Threads",       href: "/threads",       Icon: MessageSquare },
  { label: "Messages",      href: "/messages",       Icon: Mail          },
  { label: "People",        href: "/people",         Icon: Users         },
] as const;

const YOU_NAV = [
  { label: "Notifications", href: "/notifications",  Icon: Bell          },
  { label: "Settings",      href: "/settings",       Icon: Settings      },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

export default function AppSidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, logout }                    = useAuthStore();
  const { unreadCount }                     = useNotifications();
  const { unreadCount: msgCount }           = useMessageUnreadCount();
  const [userMenuOpen, setUserMenuOpen]     = useState(false);
  const [mobileOpen, setMobileOpen]         = useState(false);
  const [mounted, setMounted]               = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Let portal render on client only
  useEffect(() => { setMounted(true); }, []);

  // Close user-menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  // Listen for hamburger event from AppNavbar
  useEffect(() => {
    const handler = () => setMobileOpen(v => !v);
    window.addEventListener("toggle-sidebar", handler);
    return () => window.removeEventListener("toggle-sidebar", handler);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // ── helpers ──
  const go = (href: string) => { setMobileOpen(false); router.push(href); };

  function active(href: string) {
    if (href === "/threads") return pathname.startsWith("/threads");
    if (href === "/messages") return pathname.startsWith("/messages");
    if (href === "/people") return pathname.startsWith("/people");
    if (href === "/notifications") return pathname.startsWith("/notifications");
    if (href === "/settings") return pathname.startsWith("/settings");
    if (href === "/admin") return pathname.startsWith("/admin");
    return pathname === href;
  }

  const name       = user?.display_name ?? user?.username ?? "Guest";
  const [c1, c2]  = avatarSeed(user?.id ?? "guest");
  const profileHref = user ? profilePathFromUsername(user.username) : "/login";
  const isAdmin    = user?.role === "admin";

  // ── badge map ──
  const badges: Record<string, number> = {
    "/messages":      msgCount,
    "/notifications": unreadCount,
  };

  return (
    <>
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className={`sidebar${mobileOpen ? " open" : ""}`}>

        {/* Logo */}
        <button className="logo-row" type="button" onClick={() => go("/")}>
          <span className="logo-mark">K</span>
          <span className="logo-text">KhoshGolpo</span>
        </button>

        {/* Scrollable nav */}
        <nav className="nav-body">

          {/* MAIN */}
          <p className="section-label">Main</p>
          {MAIN_NAV.map(({ label, href, Icon }) => (
            <NavItem
              key={href}
              label={label}
              href={href}
              Icon={Icon}
              isActive={active(href)}
              badge={badges[href] || null}
              onClick={() => go(href)}
            />
          ))}

          {/* YOU */}
          <p className="section-label">You</p>
          {YOU_NAV.map(({ label, href, Icon }) => (
            <NavItem
              key={href}
              label={label}
              href={href}
              Icon={Icon}
              isActive={active(href)}
              badge={badges[href] || null}
              onClick={() => go(href)}
            />
          ))}

          {/* ADMIN */}
          {isAdmin && (
            <>
              <p className="section-label">Admin</p>
              <NavItem
                label="Dashboard"
                href="/admin"
                Icon={BarChart3}
                isActive={active("/admin")}
                badge={null}
                onClick={() => go("/admin")}
              />
            </>
          )}

        </nav>

        {/* User footer */}
        <div className="user-footer" ref={menuRef}>

          {/* Pop-up menu */}
          {userMenuOpen && user && (
            <div className="user-menu" role="menu">
              <button className="menu-item" type="button"
                onClick={() => { setUserMenuOpen(false); go(profileHref); }}>
                <User size={14} /> Profile
              </button>
              <button className="menu-item" type="button"
                onClick={() => { setUserMenuOpen(false); go("/settings"); }}>
                <Settings size={14} /> Settings
              </button>
              <div className="menu-divider" />
              <button className="menu-item danger" type="button"
                onClick={async () => {
                  setUserMenuOpen(false);
                  await logout();
                  router.push("/login");
                }}>
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}

          <button
            className="user-btn"
            type="button"
            onClick={() => user && setUserMenuOpen(v => !v)}
            aria-label="User menu"
          >
            {/* Avatar */}
            <span
              className="avatar"
              style={{ background: `linear-gradient(135deg,${c1},${c2})` }}
            >
              {initials(name)}
              {user && <span className="online-dot" />}
            </span>

            {/* Name + status */}
            <span className="user-info">
              <span className="user-name">{name}</span>
              <span className="user-status">
                {user ? "● Online" : "Not signed in"}
              </span>
            </span>
          </button>
        </div>
      </aside>

      {/* ── Mobile scrim — rendered outside grid via portal ─────────── */}
      {mounted && mobileOpen &&
        createPortal(
          <button
            type="button"
            className="scrim"
            aria-label="Close sidebar"
            onClick={() => setMobileOpen(false)}
          />,
          document.body
        )
      }

      <style jsx>{`
        /* ── Sidebar shell ─────────────────────────────────── */
        .sidebar {
          display: flex;
          flex-direction: column;
          width: 240px;
          height: 100vh;
          position: sticky;
          top: 0;
          background: var(--app-sidebar, #0a0c14);
          border-right: 1px solid var(--app-border, #1c1f2e);
          z-index: 30;
          overflow: hidden;
          flex-shrink: 0;
        }

        /* ── Logo row ──────────────────────────────────────── */
        .logo-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 16px;
          height: 56px;
          flex-shrink: 0;
          border: none;
          background: transparent;
          cursor: pointer;
          text-align: left;
          border-bottom: 1px solid var(--app-border, #1c1f2e);
        }
        .logo-mark {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: #0EA5E9;
          color: #fff;
          font-family: var(--serif, sans-serif);
          font-weight: 700;
          font-size: 15px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .logo-text {
          font-family: var(--serif, sans-serif);
          font-size: 15px;
          font-weight: 700;
          color: var(--text, #e4e8f4);
          white-space: nowrap;
        }

        /* ── Scrollable nav body ───────────────────────────── */
        .nav-body {
          flex: 1;
          overflow-y: auto;
          padding: 8px 0;
          min-height: 0;
        }
        .nav-body::-webkit-scrollbar { width: 3px; }
        .nav-body::-webkit-scrollbar-thumb { background: var(--app-border, #1c1f2e); border-radius: 4px; }

        /* Section label */
        .section-label {
          margin: 0;
          padding: 16px 20px 6px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted, #9ba3be);
          opacity: 0.6;
        }

        /* ── User footer ───────────────────────────────────── */
        .user-footer {
          flex-shrink: 0;
          position: relative;
          padding: 8px 12px 12px;
          border-top: 1px solid var(--app-border, #1c1f2e);
        }
        .user-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 8px;
          border: none;
          border-radius: 10px;
          background: transparent;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
          font-family: var(--sans, sans-serif);
          color: inherit;
        }
        .user-btn:hover { background: var(--app-card-hover, #181b27); }

        .avatar {
          position: relative;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
        }
        .online-dot {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #3dd68c;
          border: 2px solid var(--app-sidebar, #0a0c14);
        }
        .user-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
          gap: 1px;
        }
        .user-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text, #e4e8f4);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-status {
          font-size: 11px;
          color: #3dd68c;
        }

        /* ── User pop-up menu ──────────────────────────────── */
        .user-menu {
          position: absolute;
          bottom: calc(100% - 4px);
          left: 12px;
          right: 12px;
          background: var(--app-card, #13151f);
          border: 1px solid var(--app-border, #1c1f2e);
          border-radius: 12px;
          padding: 4px;
          box-shadow: 0 -8px 24px rgba(0,0,0,0.5);
          z-index: 50;
          animation: popUp 0.12s ease;
        }
        @keyframes popUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .menu-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 9px 12px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--text, #e4e8f4);
          font-size: 13px;
          font-family: var(--sans, sans-serif);
          cursor: pointer;
          transition: background 0.12s;
          text-align: left;
        }
        .menu-item:hover { background: var(--app-card-hover, #181b27); }
        .menu-item.danger { color: #ef4444; }
        .menu-item.danger:hover { background: rgba(239,68,68,0.12); }
        .menu-divider { height: 1px; background: var(--app-border, #1c1f2e); margin: 3px 8px; }

        /* ── Mobile drawer ─────────────────────────────────── */
        @media (max-width: 859px) {
          .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            height: 100dvh;
            transform: translateX(-100%);
            transition: transform 200ms ease-in;
            z-index: 40;
            box-shadow: 4px 0 24px rgba(0,0,0,0.5);
          }
          .sidebar.open {
            transform: translateX(0);
            transition: transform 260ms ease-out;
          }
        }

        /* Mobile scrim (rendered via portal) */
        :global(.scrim) {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 39;
          border: none;
          cursor: pointer;
        }

        /* ── Reduced motion ────────────────────────────────── */
        @media (prefers-reduced-motion: reduce) {
          .sidebar { transition: none; }
        }
      `}</style>
    </>
  );
}

// ─── NavItem sub-component ────────────────────────────────────────────────────

interface NavItemProps {
  label: string;
  href: string;
  Icon: React.ComponentType<{ size?: number }>;
  isActive: boolean;
  badge: number | string | null;
  onClick: () => void;
}

function NavItem({ label, Icon, isActive, badge, onClick }: NavItemProps) {
  return (
    <button
      type="button"
      className={`nav-item${isActive ? " active" : ""}`}
      onClick={onClick}
    >
      <span className="nav-icon"><Icon size={17} /></span>
      <span className="nav-label">{label}</span>
      {badge != null && Number(badge) > 0 && (
        <span className="nav-badge">{Number(badge) > 99 ? "99+" : badge}</span>
      )}

      <style jsx>{`
        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: calc(100% - 16px);
          margin: 1px 8px;
          padding: 0 12px;
          height: 36px;
          border: none;
          border-left: 2px solid transparent;
          border-radius: 8px;
          background: transparent;
          color: var(--muted, #9ba3be);
          font-size: 13px;
          font-weight: 500;
          font-family: var(--sans, sans-serif);
          cursor: pointer;
          text-align: left;
          transition: background 0.15s, color 0.15s;
        }
        .nav-item:hover {
          background: var(--app-card-hover, #181b27);
          color: var(--text, #e4e8f4);
        }
        .nav-item.active {
          background: rgba(14, 165, 233, 0.10);
          color: #0EA5E9;
          border-left-color: #0EA5E9;
        }
        .nav-icon {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          opacity: 0.85;
        }
        .nav-item.active .nav-icon { opacity: 1; }
        .nav-label { flex: 1; }
        .nav-badge {
          margin-left: auto;
          background: #0EA5E9;
          color: #fff;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          padding: 0 6px;
          height: 18px;
          min-width: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </button>
  );
}
