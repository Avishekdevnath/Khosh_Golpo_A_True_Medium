"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Search, Bookmark, Briefcase, LayoutGrid, FileText, PenLine,
  Settings, LogOut,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useMyJobs, useSavedJobs, useMyApplications } from "@/hooks/useJobs";
import { avatarSeed, initials } from "@/lib/workspaceUtils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  badge?: number;
}

export default function JobsSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { total: savedTotal } = useSavedJobs(1);
  const { total: myJobsTotal } = useMyJobs(1);
  const { applications: myApps } = useMyApplications();

  const [menuOpen, setMenuOpen] = useState(false);
  const isPipeline = pathname.startsWith("/jobs/pipeline");

  const navItems: NavItem[] = [
    { label: "Browse", href: "/jobs", icon: Search },
    { label: "Saved", href: "/jobs/saved", icon: Bookmark, badge: savedTotal },
    { label: "My Posts", href: "/jobs/my", icon: Briefcase, badge: myJobsTotal },
    { label: "Pipeline", href: "/jobs/pipeline", icon: LayoutGrid },
    { label: "Applied", href: "/jobs/applications", icon: FileText, badge: myApps.length },
  ];

  const isActive = (href: string) => {
    if (href === "/jobs") return pathname === "/jobs" || pathname === "/jobs/";
    return pathname.startsWith(href);
  };

  const isPostActive = pathname.startsWith("/jobs/post");

  const name = user?.display_name ?? user?.username ?? "User";
  const [av1, av2] = avatarSeed(user?.id ?? "guest");

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={[
          "hidden min-[860px]:flex flex-col shrink-0 z-30",
          "bg-sidebar border-r border-border",
          "h-[calc(100dvh-3.5rem)] sticky top-14",
          "transition-[width] duration-200 ease-out",
          isPipeline ? "w-[56px]" : "min-[1280px]:w-[220px] w-[56px]",
        ].join(" ")}
      >
        <nav className="flex-1 overflow-y-auto px-2 min-[1280px]:px-3 pt-4 pb-3 flex flex-col gap-1 min-h-0">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                title={item.label}
                className={[
                  "flex items-center gap-3 w-full h-11 rounded-lg",
                  "border-0 text-[13.5px] font-medium font-sans",
                  "cursor-pointer text-left transition-all duration-150",
                  isPipeline
                    ? "px-0 justify-center"
                    : "min-[1280px]:px-4 px-0 min-[1280px]:justify-start justify-center",
                  active
                    ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                ].join(" ")}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.6} />
                <span className={`flex-1 ${isPipeline ? "hidden" : "hidden min-[1280px]:inline"}`}>
                  {item.label}
                </span>
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className={`rounded-full text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] inline-flex items-center justify-center bg-primary/15 text-primary ${isPipeline ? "hidden" : "hidden min-[1280px]:inline-flex"}`}>
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Divider */}
          <div className="my-2 h-px bg-border" />

          {/* Post a Job CTA */}
          <button
            type="button"
            onClick={() => router.push("/jobs/post")}
            title="Post a Job"
            className={[
              "flex items-center gap-3 w-full h-11 rounded-lg",
              "text-[13.5px] font-medium font-sans",
              "cursor-pointer text-left transition-all duration-150",
              isPipeline
                ? "px-0 justify-center"
                : "min-[1280px]:px-4 px-0 min-[1280px]:justify-start justify-center",
              isPostActive
                ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary border-t-0 border-r-0 border-b-0"
                : "border border-primary/20 text-primary hover:bg-primary/5",
            ].join(" ")}
          >
            <PenLine size={18} strokeWidth={1.6} />
            <span className={`flex-1 ${isPipeline ? "hidden" : "hidden min-[1280px]:inline"}`}>
              Post a Job
            </span>
          </button>
        </nav>

        {/* Footer */}
        <div className={`border-t border-border py-3 ${isPipeline ? "px-1" : "min-[1280px]:px-3 px-1"}`}>
          {/* User row */}
          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className={[
                  "flex items-center gap-2.5 w-full border-0 bg-transparent cursor-pointer rounded-lg p-1.5 hover:bg-foreground/5 transition-colors",
                  isPipeline ? "justify-center" : "min-[1280px]:justify-start justify-center",
                ].join(" ")}
              >
                <span
                  className="w-7 h-7 rounded-full grid place-items-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: `linear-gradient(135deg,${av1},${av2})` }}
                >
                  {initials(name)}
                </span>
                <span className={`text-[12px] text-foreground font-medium truncate ${isPipeline ? "hidden" : "hidden min-[1280px]:inline"}`}>
                  {name}
                </span>
              </button>

              {/* Dropdown */}
              {menuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-[160px] rounded-xl p-1.5 border border-border bg-card shadow-xl z-50">
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); router.push("/settings"); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg border-0 bg-transparent text-foreground/75 text-[13px] cursor-pointer text-left transition-colors hover:bg-foreground/5 hover:text-foreground"
                  >
                    <Settings size={14} strokeWidth={1.7} />
                    Settings
                  </button>
                  <div className="h-px bg-border mx-2 my-1" />
                  <button
                    type="button"
                    onClick={async () => { setMenuOpen(false); await logout(); router.push("/login"); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg border-0 bg-transparent text-destructive text-[13px] cursor-pointer text-left transition-colors hover:bg-destructive/10"
                  >
                    <LogOut size={14} strokeWidth={1.7} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Back to KhoshGolpo */}
          <button
            type="button"
            onClick={() => router.push("/threads")}
            className={[
              "flex items-center gap-2 w-full mt-2 border-0 bg-transparent cursor-pointer text-[12px] text-muted-foreground hover:text-foreground transition-colors",
              isPipeline ? "justify-center" : "min-[1280px]:justify-start justify-center",
            ].join(" ")}
          >
            <span className="text-[14px]">←</span>
            <span className={isPipeline ? "hidden" : "hidden min-[1280px]:inline"}>KhoshGolpo</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile tab bar ── */}
      <nav className="min-[860px]:hidden flex items-center gap-0 overflow-x-auto border-b border-border bg-background px-2 shrink-0 scrollbar-none">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className={[
                "shrink-0 px-3 h-10 text-[13px] font-medium border-0 bg-transparent cursor-pointer transition-colors whitespace-nowrap",
                active
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </>
  );
}
