import { useEffect, useRef } from "react";
import { useLoadingStore } from "@/store/loadingStore";
import { API_BASE_URL } from "@/lib/api";

const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds timeout
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second between retries

/**
 * useBackendWarmup — Pings backend on app load to warm it up.
 *
 * Handles Render's auto-sleep mode by proactively checking backend health
 * and updating the loader with status. Shows until backend responds.
 *
 * Usage:
 * ```tsx
 * export default function RootLayout({ children }) {
 *   useBackendWarmup();
 *   return <>{children}</>;
 * }
 * ```
 */
export function useBackendWarmup() {
  const { show, setStatus, hide } = useLoadingStore();
  const attemptRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    let isMounted = true;
    attemptRef.current = 0;

    const warmupBackend = async () => {
      // Show loader
      show();
      setStatus("warming-up", "Warming up backend...");

      while (attemptRef.current < MAX_RETRIES && isMounted) {
        try {
          setStatus("connecting", "Establishing connection...");

          const controller = new AbortController();
          timeoutRef.current = setTimeout(
            () => controller.abort(),
            HEALTH_CHECK_TIMEOUT
          );

          const response = await fetch(`${API_BASE_URL}/health`, {
            method: "GET",
            signal: controller.signal,
            credentials: "include",
          });

          if (timeoutRef.current) clearTimeout(timeoutRef.current);

          if (response.ok && isMounted) {
            // Backend is ready!
            setStatus("ready", "Ready to go!");

            // Keep loader visible for a brief moment to show success
            setTimeout(() => {
              if (isMounted) hide();
            }, 500);

            return; // Success!
          }
        } catch (error) {
          // Network error or timeout
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          attemptRef.current++;

          if (attemptRef.current < MAX_RETRIES && isMounted) {
            // Retry after delay
            await new Promise((resolve) =>
              setTimeout(resolve, RETRY_DELAY)
            );
          }
        }
      }

      // All retries failed or unmounted
      if (isMounted) {
        // Hide loader but keep app functional
        hide();
      }
    };

    warmupBackend();

    // Cleanup
    return () => {
      isMounted = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [show, setStatus, hide]);
}
