"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Search } from "lucide-react";
import Link from "next/link";
import ThemeToggle from "@/components/shared/ThemeToggle";

/** Route config: maps pathname to top bar content */
function useTopBarConfig() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEdit = searchParams.get("edit");

  if (pathname === "/jobs" || pathname === "/jobs/") {
    return { mode: "browse" as const };
  }
  if (pathname.startsWith("/jobs/saved")) {
    return { mode: "sub" as const, title: "Saved Jobs", showPost: false };
  }
  if (pathname.startsWith("/jobs/my")) {
    return { mode: "sub" as const, title: "My Posts", showPost: true };
  }
  if (pathname.startsWith("/jobs/post")) {
    return { mode: "sub" as const, title: isEdit ? "Edit Job" : "Post a Job", showPost: false };
  }
  if (pathname.startsWith("/jobs/pipeline")) {
    return { mode: "sub" as const, title: "My Pipeline", showPost: false };
  }
  if (pathname.startsWith("/jobs/applications")) {
    return { mode: "sub" as const, title: "My Applications", showPost: false };
  }
  // /jobs/[slug] detail page
  return { mode: "detail" as const };
}

export default function JobsTopBar() {
  const router = useRouter();
  const config = useTopBarConfig();

  return (
    <header className="flex items-center gap-3 px-4 h-14 shrink-0 sticky top-0 z-40 bg-background border-b border-border">
      {/* Left */}
      {config.mode === "browse" ? (
        <Link
          href="/jobs"
          className="flex items-center gap-2 no-underline shrink-0 group"
        >
          <span
            className="w-7 h-7 rounded-lg grid place-items-center shrink-0 transition-shadow duration-200 group-hover:shadow-[0_0_14px_rgba(14,165,233,0.4)]"
            style={{ background: "linear-gradient(135deg, #0EA5E9, #0284C7)" }}
          >
            <span className="font-bold text-white text-[10px] leading-none">◆</span>
          </span>
          <span className="font-serif text-[18px] font-bold text-foreground tracking-tight hidden min-[1024px]:block">
            Khosh Jobs
          </span>
        </Link>
      ) : config.mode === "detail" ? (
        /* Detail page — back button goes to browse */
        <button
          type="button"
          onClick={() => router.push("/jobs")}
          className="flex items-center gap-1.5 border-0 bg-transparent text-muted-foreground hover:text-foreground cursor-pointer transition-colors text-[13px] font-medium shrink-0"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          <span>Browse</span>
        </button>
      ) : (
        /* Sub-pages — back to jobs */
        <button
          type="button"
          onClick={() => router.push("/jobs")}
          className="flex items-center gap-1.5 border-0 bg-transparent text-muted-foreground hover:text-foreground cursor-pointer transition-colors text-[13px] font-medium shrink-0"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          <span className="hidden min-[1024px]:inline">Back</span>
        </button>
      )}

      {/* Center */}
      <div className="flex-1 flex justify-center">
        {config.mode === "browse" ? (
          <button
            type="button"
            className="hidden min-[1024px]:flex items-center gap-2 h-9 px-4 rounded-full border border-border bg-card text-[13px] text-muted-foreground w-[240px] hover:border-border/80 transition-colors cursor-text"
          >
            <Search size={13} strokeWidth={2} className="shrink-0" />
            Search jobs...
          </button>
        ) : config.mode === "detail" ? null : (
          <h1 className="text-[14px] font-semibold text-foreground tracking-tight">
            {config.title}
          </h1>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        <ThemeToggle />
        {(config.mode === "browse" || (config.mode === "sub" && (config as { showPost?: boolean }).showPost)) && (
          <Link
            href="/jobs/post"
            className="hidden min-[1024px]:flex items-center gap-1.5 h-8 px-3.5 rounded-full border-0 bg-primary text-primary-foreground text-[12.5px] font-semibold no-underline transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
          >
            <Plus size={13} strokeWidth={2.5} />
            Post a Job
          </Link>
        )}
      </div>
    </header>
  );
}
