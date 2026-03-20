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
        className={`sidebar${mobileOpen ? " open" : ""}`}
        aria-label="Primary navigation"
      >
        {/* Logo ───────────────────────────────────────────────────── */}
        <button className="logo" type="button" onClick={() => go("/")} aria-label="KhoshGolpo home">
          <span className="logo-icon" aria-hidden="true">K</span>
          <span className="logo-name">KhoshGolpo</span>
          {totalBadge > 0 && (
            <span className="logo-badge" aria-label={`${totalBadge} unread`}>
              {totalBadge > 99 ? "99+" : totalBadge}
            </span>
          )}
        </button>

        {/* Nav body ──────────────────────────────────────────────── */}
        <nav className="nav" role="navigation">
          {NAV_SECTIONS.map(section => (
            <div key={section.label} className="nav-section">
              <span className="section-label" aria-hidden="true">{section.label}</span>
              {section.items.map(({ label, href, Icon, badgeKey }) => {
                const count = badgeKey ? badges[badgeKey] : 0;
                const active = isActive(href);
                return (
                  <button
                    key={href}
                    type="button"
                    className={`nav-item${active ? " active" : ""}`}
                    onClick={() => go(href)}
                    aria-label={count > 0 ? `${label}, ${count} unread` : label}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="item-icon" aria-hidden="true">
                      <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                    </span>
                    <span className="item-label">{label}</span>
                    {count > 0 && (
                      <span className="item-badge" aria-hidden="true">
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
            <div className="nav-section">
              <span className="section-label" aria-hidden="true">Admin</span>
              <button
                type="button"
                className={`nav-item${isActive("/admin") ? " active" : ""}`}
                onClick={() => go("/admin")}
                aria-current={isActive("/admin") ? "page" : undefined}
              >
                <span className="item-icon" aria-hidden="true">
                  <BarChart3 size={16} strokeWidth={isActive("/admin") ? 2.2 : 1.8} />
                </span>
                <span className="item-label">Dashboard</span>
              </button>
            </div>
          )}
        </nav>

        {/* User footer ───────────────────────────────────────────── */}
        <div className="footer" ref={menuRef}>
          {/* Pop-up menu */}
          {menuOpen && user && (
            <div className="user-menu" role="menu" aria-label="User options">
              <button
                className="menu-item"
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); go(profileHref); }}
              >
                <User size={14} strokeWidth={1.8} />
                <span>View profile</span>
              </button>
              <button
                className="menu-item"
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); go("/settings"); }}
              >
                <Settings size={14} strokeWidth={1.8} />
                <span>Settings</span>
              </button>
              <div className="menu-sep" role="separator" />
              <button
                className="menu-item danger"
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
            className="user-row"
            type="button"
            onClick={() => user && setMenuOpen(v => !v)}
            aria-label={user ? `${name} — open user menu` : "User options"}
            aria-expanded={menuOpen}
          >
            {/* Avatar */}
            <span
              className="avatar"
              style={{ background: `linear-gradient(135deg,${c1},${c2})` }}
              aria-hidden="true"
            >
              <span className="avatar-initials">{initials(name)}</span>
              {user && <span className="status-dot" aria-hidden="true" />}
            </span>

            {/* Text */}
            <span className="user-text">
              <span className="user-name">{name}</span>
              {handle && <span className="user-handle">{handle}</span>}
            </span>

            {/* Chevron */}
            {user && (
              <span
                className={`chevron${menuOpen ? " flipped" : ""}`}
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
            className="mobile-scrim"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            tabIndex={-1}
          />,
          document.body
        )
      }

      <style jsx>{`
        /* ═══════════════════════════════════════════════════════════
           SIDEBAR SHELL
        ═══════════════════════════════════════════════════════════ */
        .sidebar {
          /* Layout */
          display: flex;
          flex-direction: column;
          width: 240px;
          height: 100vh;
          position: sticky;
          top: 0;
          flex-shrink: 0;
          overflow: hidden;

          /* Visuals */
          background: var(--app-sidebar, #0a0c14);
          border-right: 1px solid var(--app-border, #1c1f2e);
          z-index: 30;
        }

        /* ═══════════════════════════════════════════════════════════
           LOGO ROW
        ═══════════════════════════════════════════════════════════ */
        .logo {
          /* Layout */
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 16px;
          height: 56px;
          flex-shrink: 0;

          /* Visuals */
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--app-border, #1c1f2e);
          cursor: pointer;
          text-align: left;
          width: 100%;
          transition: background 0.15s ease;
        }
        .logo:hover { background: rgba(14,165,233,0.04); }

        .logo-icon {
          /* 30px square, sky-blue, Sora font */
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: linear-gradient(135deg, #0EA5E9, #0284C7);
          color: #fff;
          font-family: var(--serif, sans-serif);
          font-weight: 700;
          font-size: 15px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(14,165,233,0.35);
        }
        .logo-name {
          flex: 1;
          font-family: var(--serif, sans-serif);
          font-size: 15px;
          font-weight: 700;
          color: var(--text, #e4e8f4);
          letter-spacing: -0.01em;
        }
        .logo-badge {
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

        /* ═══════════════════════════════════════════════════════════
           NAV BODY
        ═══════════════════════════════════════════════════════════ */
        .nav {
          flex: 1;
          overflow-y: auto;
          padding: 12px 0 8px;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .nav::-webkit-scrollbar { width: 3px; }
        .nav::-webkit-scrollbar-thumb {
          background: var(--app-border, #1c1f2e);
          border-radius: 4px;
        }

        /* Section block */
        .nav-section {
          display: flex;
          flex-direction: column;
          padding: 0 8px;
          gap: 1px;
        }
        .nav-section + .nav-section { margin-top: 8px; }

        /* Section label */
        .section-label {
          display: block;
          padding: 8px 10px 4px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted, #9ba3be);
          opacity: 0.5;
          font-family: var(--sans, sans-serif);
          pointer-events: none;
          user-select: none;
        }

        /* Nav item — 40px tall to meet 44pt touch target guidance */
        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          height: 40px;
          padding: 0 10px;
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
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
          outline-offset: 2px;
        }
        .nav-item:hover {
          background: var(--app-card-hover, #181b27);
          color: var(--text, #e4e8f4);
        }
        .nav-item:focus-visible {
          outline: 2px solid rgba(14,165,233,0.5);
        }
        .nav-item.active {
          background: rgba(14,165,233,0.10);
          color: #0EA5E9;
          border-left-color: #0EA5E9;
          font-weight: 600;
        }

        .item-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          flex-shrink: 0;
        }
        .nav-item.active .item-icon {
          filter: drop-shadow(0 0 6px rgba(14,165,233,0.4));
        }

        .item-label { flex: 1; }

        .item-badge {
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
          animation: badgePop 0.2s ease;
        }
        @keyframes badgePop {
          from { transform: scale(0.7); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }

        /* ═══════════════════════════════════════════════════════════
           USER FOOTER
        ═══════════════════════════════════════════════════════════ */
        .footer {
          flex-shrink: 0;
          position: relative;
          padding: 10px 10px 12px;
          border-top: 1px solid var(--app-border, #1c1f2e);
        }

        /* User row button */
        .user-row {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 10px;
          border: none;
          border-radius: 10px;
          background: transparent;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s ease;
          font-family: var(--sans, sans-serif);
          color: inherit;
          outline-offset: 2px;
        }
        .user-row:hover { background: var(--app-card-hover, #181b27); }
        .user-row:focus-visible { outline: 2px solid rgba(14,165,233,0.5); }

        /* Avatar */
        .avatar {
          position: relative;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .avatar-initials {
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          font-family: var(--sans, sans-serif);
        }
        .status-dot {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #3dd68c;
          border: 2px solid var(--app-sidebar, #0a0c14);
          box-shadow: 0 0 6px rgba(61,214,140,0.5);
        }

        /* User text */
        .user-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
          gap: 1px;
        }
        .user-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text, #e4e8f4);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
        }
        .user-handle {
          font-size: 11px;
          color: var(--muted, #9ba3be);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
        }

        /* Chevron */
        .chevron {
          display: flex;
          align-items: center;
          color: var(--muted, #9ba3be);
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }
        .chevron.flipped { transform: rotate(180deg); }

        /* User pop-up menu */
        .user-menu {
          position: absolute;
          bottom: calc(100% + 4px);
          left: 10px;
          right: 10px;
          background: var(--app-card, #13151f);
          border: 1px solid var(--app-border, #1c1f2e);
          border-radius: 12px;
          padding: 4px;
          box-shadow:
            0 -4px 6px rgba(0,0,0,0.15),
            0 -12px 32px rgba(0,0,0,0.4);
          z-index: 50;
          animation: popUp 0.15s ease;
        }
        @keyframes popUp {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1);      }
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 9px;
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
          outline-offset: 2px;
        }
        .menu-item:hover { background: var(--app-card-hover, #181b27); }
        .menu-item:focus-visible { outline: 2px solid rgba(14,165,233,0.5); }
        .menu-item.danger { color: #ef4444; }
        .menu-item.danger:hover { background: rgba(239,68,68,0.10); }
        .menu-sep {
          height: 1px;
          background: var(--app-border, #1c1f2e);
          margin: 3px 10px;
        }

        /* ═══════════════════════════════════════════════════════════
           MOBILE DRAWER
        ═══════════════════════════════════════════════════════════ */
        @media (max-width: 859px) {
          .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            height: 100dvh;
            z-index: 40;
            transform: translateX(-100%);
            transition: transform 220ms ease-in;
            box-shadow: 4px 0 32px rgba(0,0,0,0.6);
          }
          .sidebar.open {
            transform: translateX(0);
            transition: transform 260ms ease-out;
          }
        }

        @media (min-width: 860px) {
          .sidebar { transform: none !important; }
        }

        /* Mobile scrim — injected via portal */
        :global(.mobile-scrim) {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
          z-index: 39;
          border: none;
          cursor: pointer;
          animation: scrimIn 0.2s ease;
        }
        @keyframes scrimIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* ═══════════════════════════════════════════════════════════
           REDUCED MOTION
        ═══════════════════════════════════════════════════════════ */
        @media (prefers-reduced-motion: reduce) {
          .sidebar,
          .nav-item,
          .user-row,
          .menu-item,
          .chevron { transition: none; }
          .user-menu,
          .item-badge,
          :global(.mobile-scrim) { animation: none; }
        }
      `}</style>
    </>
  );
}
