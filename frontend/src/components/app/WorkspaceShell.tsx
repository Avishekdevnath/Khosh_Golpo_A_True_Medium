"use client";

import { type ReactNode } from "react";

interface WorkspaceShellProps {
  children: ReactNode;
}

export default function WorkspaceShell({ children }: WorkspaceShellProps) {
  return (
    <div className="ws-root">
      {children}
      <style jsx>{`
        .ws-root {
          display: flex;
          flex: 1;
          min-height: 0;
          overflow: hidden;
          font-family: var(--sans);
        }
      `}</style>
    </div>
  );
}
