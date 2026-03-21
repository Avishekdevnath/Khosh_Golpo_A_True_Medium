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
  title: string;
  subtitle: string;
  toolbar?: ReactNode;
  children: ReactNode;
  requestsBadge?: number;
  bodyScrollable?: boolean;
};

export default function PeopleWorkspaceShell({
  title,
  subtitle,
  toolbar,
  children,
  requestsBadge,
  bodyScrollable = true,
}: PeopleWorkspaceShellProps) {
  const pathname = usePathname();

  return (
    <WorkspaceShell wrapPanel={false}>
      {/* Main panel — flex column so header is fixed-height and body scrolls */}
      <section className="ws-panel flex flex-col overflow-hidden bg-app-panel">

        {/* ── Static header ────────────────────────────── */}
        <header className="flex-shrink-0 border-b border-app-border">

          {/* Hero */}
          <div className="relative overflow-hidden px-8 pb-7 pt-9 max-sm:px-5 max-sm:pb-5 max-sm:pt-7">
            {/* Ambient mesh */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 max-sm:hidden"
              style={{
                background:
                  "radial-gradient(ellipse 65% 90% at 75% 15%, rgba(249,115,22,0.09) 0%, transparent 70%)," +
                  "radial-gradient(ellipse 45% 65% at 88% 85%, rgba(124,58,237,0.07) 0%, transparent 60%)",
              }}
            />

            {/* Eyebrow */}
            <div className="relative mb-3.5 inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[11px] font-medium tracking-wide text-orange-400">
              <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500" />
              Discover &amp; Connect
            </div>

            {/* Title */}
            <h1
              className="relative mb-2 font-serif text-[clamp(22px,3vw,36px)] font-extrabold leading-[1.1] tracking-tight max-sm:text-[22px]"
              style={{
                background: "linear-gradient(100deg, #ffffff 25%, #c9bfff 58%, #f0a36f 88%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {title}
            </h1>

            {/* Subtitle */}
            <p className="relative m-0 text-[13px] font-light leading-relaxed text-muted-foreground max-sm:text-xs">
              {subtitle}
            </p>
          </div>

          {/* Search / toolbar slot */}
          {toolbar ? (
            <div className="px-8 pb-5 max-sm:px-5 max-sm:pb-4">
              <div className="w-full max-w-[980px]">{toolbar}</div>
            </div>
          ) : null}
        </header>

        {/* ── Scrollable / static body ──────────────────────────── */}
        <div
          className={[
            "flex-1 min-h-0 px-8 pb-12 pt-[22px] max-sm:px-5 max-sm:pb-10",
            bodyScrollable
              ? "overflow-y-auto overflow-x-hidden grid gap-5 content-start scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20"
              : "overflow-hidden flex flex-col gap-5",
          ].join(" ")}
        >
          {/* Tab nav */}
          <nav
            className="flex flex-shrink-0 flex-wrap items-center gap-x-2 gap-y-2.5 border-b border-white/5 pb-4"
            role="navigation"
            aria-label="People sections"
          >
            {NAV_TABS.map(tab => {
              const isActive =
                pathname === tab.href ||
                (tab.href === "/people/explore" && pathname === "/people");
              const badge =
                tab.label === "Requests" && requestsBadge ? requestsBadge : null;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={[
                    "inline-flex shrink-0 items-center gap-1.5 rounded-[9px] border px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-all duration-150",
                    isActive
                      ? "border-orange-500/20 bg-orange-500/10 text-orange-500"
                      : "border-white/[0.03] bg-white/[0.01] text-[#9aa8c8] hover:border-white/[0.08] hover:bg-white/5 hover:text-[#d6def3]",
                  ].join(" ")}
                >
                  <Icon size={13} className="shrink-0 opacity-80" />
                  {tab.label}
                  {badge ? (
                    <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white">
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {children}
        </div>
      </section>
    </WorkspaceShell>
  );
}
