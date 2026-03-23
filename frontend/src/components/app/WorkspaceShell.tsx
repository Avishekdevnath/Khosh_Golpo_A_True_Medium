"use client";

import { type ReactNode } from "react";

interface WorkspaceShellProps {
  children: ReactNode;
  /** Grid column template for inner panels (e.g. "420px 6px 1fr" or "1fr") */
  contentColumns?: string;
  /** Unused legacy props — accepted to avoid TS errors from callers */
  wrapPanel?: boolean;
  sidebarProps?: Record<string, unknown>;
  sidebarResize?: Record<string, unknown>;
}

export default function WorkspaceShell({
  children,
  contentColumns = "1fr",
}: WorkspaceShellProps) {
  return (
    <div
      className="grid flex-1 min-h-0 overflow-hidden font-sans items-stretch"
      style={{ gridTemplateColumns: contentColumns }}
    >
      {children}
    </div>
  );
}
