"use client";

import type { ReactNode } from "react";

import AppNavbar from "@/components/app/AppNavbar";
import AppSidebar from "@/components/app/AppSidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh bg-background text-foreground font-sans overflow-hidden">
      <AppSidebar />

      {/* Content column */}
      <div className="flex-1 flex flex-col min-w-0 h-dvh overflow-hidden">
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
