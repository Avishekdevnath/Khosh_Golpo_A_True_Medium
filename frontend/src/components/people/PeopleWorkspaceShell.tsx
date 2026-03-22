"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Search, UserCheck } from "lucide-react";

import WorkspaceShell from "@/components/app/WorkspaceShell";

const NAV_TABS = [
  { label: "Explore",  href: "/people/explore",  icon: Compass },
  { label: "Search",   href: "/people/search",   icon: Search },
  { label: "Requests", href: "/people/requests", icon: UserCheck },
] as const;

type PeopleWorkspaceShellProps = {
  title?: string;
  subtitle?: string;
  toolbar?: ReactNode;
  children: ReactNode;
  requestsBadge?: number;
  bodyScrollable?: boolean;
};

export default function PeopleWorkspaceShell({
  toolbar,
  children,
  requestsBadge,
  bodyScrollable = true,
}: PeopleWorkspaceShellProps) {
  const pathname = usePathname();

  return (
    <WorkspaceShell wrapPanel={false}>
      <section className="ws-panel flex flex-col overflow-hidden">

        {/* ── Sticky header ── */}
        <header className="shrink-0 bg-background sticky top-0 z-10">

          {/* Toolbar slot (search bar etc.) */}
          {toolbar && (
            <div className="px-6 pt-4 pb-0">
              <div className="w-full max-w-xl">{toolbar}</div>
            </div>
          )}

          {/* Tab row */}
          <div className="flex items-center px-6 border-b border-border">
            {NAV_TABS.map(tab => {
              const isActive =
                pathname === tab.href ||
                (tab.href === "/people/explore" && pathname === "/people");
              const badge = tab.label === "Requests" && requestsBadge ? requestsBadge : null;
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={[
                    "inline-flex items-center gap-1.5 py-[14px] mr-6 text-[14px] border-b-2 transition-colors duration-150 no-underline whitespace-nowrap",
                    isActive
                      ? "border-b-primary text-foreground font-semibold"
                      : "border-b-transparent text-foreground/50 font-normal hover:text-foreground",
                  ].join(" ")}
                >
                  <Icon size={14} className="shrink-0" />
                  {tab.label}
                  {badge ? (
                    <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </header>

        {/* ── Scrollable body ── */}
        <div
          className={[
            "flex-1 min-h-0 px-6 py-6",
            bodyScrollable ? "overflow-y-auto ws-scroll" : "overflow-hidden flex flex-col",
          ].join(" ")}
        >
          {children}
        </div>
      </section>
    </WorkspaceShell>
  );
}
