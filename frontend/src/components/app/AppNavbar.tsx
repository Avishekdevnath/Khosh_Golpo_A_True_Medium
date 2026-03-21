"use client";

/**
 * MobileTopBar — only visible below 860px.
 * On desktop, the sidebar handles all navigation;
 * there is no top navbar.
 */

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { avatarSeed, initials } from "@/lib/workspaceUtils";

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
  const { user } = useAuthStore();

  const sectionName = getSectionName(pathname);
  const displayName = user?.display_name ?? user?.username ?? "G";
  const [av1, av2] = avatarSeed(user?.id ?? "guest");

  function handleHamburger() {
    window.dispatchEvent(new CustomEvent("toggle-sidebar"));
  }

  return (
    <header className="hidden max-[859px]:flex items-center gap-3 px-3 h-[52px] sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border">
      {/* Hamburger */}
      <button
        type="button"
        onClick={handleHamburger}
        aria-label="Open menu"
        className="w-9 h-9 grid place-items-center border-0 bg-transparent text-muted-foreground cursor-pointer rounded-lg hover:text-foreground hover:bg-card-hover transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <span className="font-serif text-[15px] font-bold text-foreground flex-1">
        {sectionName}
      </span>

      {/* Avatar */}
      <span
        className="w-8 h-8 rounded-lg grid place-items-center text-[11px] font-bold text-white shrink-0"
        style={{ background: `linear-gradient(135deg,${av1},${av2})` }}
      >
        {initials(displayName)}
      </span>
    </header>
  );
}
