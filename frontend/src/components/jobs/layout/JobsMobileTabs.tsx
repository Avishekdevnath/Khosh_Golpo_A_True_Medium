"use client";

import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { label: "Browse",    href: "/jobs" },
  { label: "Saved",     href: "/jobs/saved" },
  { label: "My Posts",  href: "/jobs/my" },
  { label: "Pipeline",  href: "/jobs/pipeline" },
  { label: "Applied",   href: "/jobs/applications" },
];

export default function JobsMobileTabs() {
  const router = useRouter();
  const pathname = usePathname();

  // Hide tabs on job detail pages (/jobs/[id])
  const knownSections = ["/jobs/saved", "/jobs/my", "/jobs/pipeline", "/jobs/applications", "/jobs/post"];
  const isDetailPage =
    pathname !== "/jobs" &&
    pathname !== "/jobs/" &&
    pathname.startsWith("/jobs/") &&
    !knownSections.some((s) => pathname.startsWith(s));

  const isActive = (href: string) => {
    if (href === "/jobs") return pathname === "/jobs" || pathname === "/jobs/";
    return pathname.startsWith(href);
  };

  if (isDetailPage) return null;

  return (
    /* Only visible below 860px; zero height above that breakpoint */
    <nav className="min-[860px]:hidden flex items-center overflow-x-auto border-b border-border bg-background px-2 shrink-0 scrollbar-none">
      {NAV_ITEMS.map((item) => {
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
  );
}
