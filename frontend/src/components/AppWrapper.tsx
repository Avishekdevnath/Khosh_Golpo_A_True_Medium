"use client";

import { ReactNode } from "react";
import { useBackendWarmup } from "@/hooks/useBackendWarmup";
import PageLoader from "@/components/shared/PageLoader";

/**
 * AppWrapper — Client component that handles backend warmup and loader display.
 *
 * This wraps the app content and:
 * - Pings backend on mount to warm it up
 * - Displays animated loader while backend responds
 * - Handles timeout gracefully
 */
export function AppWrapper({ children }: { children: ReactNode }) {
  useBackendWarmup();

  return (
    <>
      <PageLoader />
      {children}
    </>
  );
}
