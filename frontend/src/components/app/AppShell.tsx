"use client";

import type { ReactNode } from "react";

import AppNavbar from "@/components/app/AppNavbar";
import AppSidebar from "@/components/app/AppSidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-dvh bg-background text-foreground font-sans overflow-hidden">
      {/* Full-width sticky top navbar */}
      <AppNavbar />

      {/* Sidebar + page content row */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <AppSidebar />

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
