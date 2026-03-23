"use client";

import type { ReactNode } from "react";
import JobsTopBar from "./JobsTopBar";
import JobsSidebar from "./JobsSidebar";

export default function JobsShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-dvh bg-[#080a10] text-foreground font-sans overflow-hidden">
      <JobsTopBar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <JobsSidebar />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
