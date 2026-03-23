"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Search } from "lucide-react";
import Link from "next/link";

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
  // /jobs/[id] — same as browse
  return { mode: "browse" as const };
}

export default function JobsTopBar() {
  const router = useRouter();
  const config = useTopBarConfig();

  return (
    <header className="flex items-center gap-3 px-4 h-14 shrink-0 sticky top-0 z-40 bg-[#080a10] border-b border-[#1e2235]">
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
          <span className="font-serif text-[18px] font-bold text-[#e8eaf2] tracking-tight hidden min-[860px]:block">
            Khosh Jobs
          </span>
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => router.push("/jobs")}
          className="flex items-center gap-1.5 border-0 bg-transparent text-[#636f8d] hover:text-[#e8eaf2] cursor-pointer transition-colors text-[13px] font-medium shrink-0"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          <span className="hidden min-[860px]:inline">Back</span>
        </button>
      )}

      {/* Center */}
      <div className="flex-1 flex justify-center">
        {config.mode === "browse" ? (
          <button
            type="button"
            onClick={() => {
              /* TODO: focus search in list panel */
            }}
            className="hidden min-[860px]:flex items-center gap-2 h-9 px-4 rounded-full border border-[#1e2235] bg-[#10131d] text-[13px] text-[#636f8d] w-[240px] hover:border-[#1e2235]/80 transition-colors cursor-text"
          >
            <Search size={13} strokeWidth={2} className="shrink-0" />
            Search jobs...
          </button>
        ) : (
          <h1 className="text-[14px] font-semibold text-[#e8eaf2] tracking-tight">
            {config.title}
          </h1>
        )}
      </div>

      {/* Right */}
      {(config.mode === "browse" || (config.mode === "sub" && (config as { showPost?: boolean }).showPost)) && (
        <Link
          href="/jobs/post"
          className="hidden min-[860px]:flex items-center gap-1.5 h-8 px-3.5 rounded-full border-0 bg-[#0EA5E9] text-white text-[12.5px] font-semibold no-underline transition-all duration-150 hover:brightness-110 active:scale-[0.97] shrink-0"
        >
          <Plus size={13} strokeWidth={2.5} />
          Post a Job
        </Link>
      )}
    </header>
  );
}
