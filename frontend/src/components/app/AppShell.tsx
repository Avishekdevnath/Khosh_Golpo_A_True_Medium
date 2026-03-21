"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import AppNavbar from "@/components/app/AppNavbar";
import AppSidebar from "@/components/app/AppSidebar";

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
      <div className="grid grid-cols-[240px_1fr] max-[859px]:grid-cols-1 min-h-screen bg-background text-foreground font-sans">
        <AppSidebar />
        <div className="flex flex-col min-h-screen overflow-hidden">
          <AppNavbar />
          <main className="flex-1 overflow-hidden flex flex-col min-h-0">{children}</main>
        </div>
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
