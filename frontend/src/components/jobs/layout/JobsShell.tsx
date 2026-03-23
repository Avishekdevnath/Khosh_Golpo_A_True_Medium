"use client";

import type { ReactNode } from "react";
import JobsTopBar from "./JobsTopBar";
import JobsSidebar from "./JobsSidebar";
import JobsMobileTabs from "./JobsMobileTabs";

export default function JobsShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-dvh bg-background text-foreground font-sans overflow-hidden">
      <JobsTopBar />
      {/* Mobile tab bar sits in the column, ABOVE the content row */}
      <JobsMobileTabs />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <JobsSidebar />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
