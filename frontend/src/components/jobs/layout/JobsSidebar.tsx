"use client";

import { usePathname, useRouter } from "next/navigation";
import { Search, Bookmark, Briefcase, LayoutGrid, FileText } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useMyJobs, useSavedJobs, useMyApplications } from "@/hooks/useJobs";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  badge?: number;
}

export default function JobsSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { total: savedTotal } = useSavedJobs(1);
  const { total: myJobsTotal } = useMyJobs(1);
  const { applications: myApps } = useMyApplications();

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


  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={[
          "hidden min-[1024px]:flex flex-col shrink-0 z-30",
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

        </nav>

      </aside>

    </>
  );
}
