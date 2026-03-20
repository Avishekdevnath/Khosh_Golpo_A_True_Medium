"use client";

import { type ReactNode } from "react";

interface WorkspaceShellProps {
  children: ReactNode;
  /** Grid column template for inner panels (e.g. "420px 6px 1fr" or "1fr") */
  contentColumns?: string;
  /** Unused legacy props — accepted to avoid TS errors from callers */
  wrapPanel?: boolean;
  sidebarProps?: Record<string, unknown>;
}

export default function WorkspaceShell({
  children,
  contentColumns = "1fr",
}: WorkspaceShellProps) {
  return (
    <div className="ws-root" style={{ gridTemplateColumns: contentColumns }}>
      {children}
      <style jsx>{`
        .ws-root {
          display: grid;
          flex: 1;
          min-height: 0;
          overflow: hidden;
          font-family: var(--sans);
          align-items: stretch;
        }
      `}</style>
    </div>
  );
}
