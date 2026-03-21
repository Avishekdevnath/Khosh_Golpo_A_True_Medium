"use client";

import type { ReactNode } from "react";

import AppNavbar from "@/components/app/AppNavbar";
import AppSidebar from "@/components/app/AppSidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background text-foreground font-sans">
      <AppSidebar />

      {/* Content column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-dvh">
        {/* Mobile-only top bar */}
        <AppNavbar />

        {/* Page content */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
