"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import AppNavbar from "@/components/app/AppNavbar";
import AppSidebar from "@/components/app/AppSidebar";
import WorkspaceSidebar from "@/components/app/WorkspaceSidebar";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  // These routes use the workspace grid layout
  if (
    pathname.startsWith("/threads") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/people") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/settings")
  ) {
    return (
      <div className="app-shell">
        <WorkspaceSidebar />
        <div className="app-main">
          <AppNavbar />
          <main className="app-content">{children}</main>
        </div>
        <style jsx>{`
          .app-shell {
            display: grid;
            grid-template-columns: 240px 1fr;
            min-height: 100vh;
            background: var(--app-bg);
            color: var(--text, #e4e8f4);
            font-family: var(--sans);
          }
          .app-main {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            overflow: hidden;
          }
          .app-content {
            flex: 1;
            overflow: hidden;
          }
          @media (max-width: 859px) {
            .app-shell {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppNavbar />
      <div className="mx-auto flex w-full max-w-[1400px]">
        <AppSidebar />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
