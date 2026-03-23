import { useEffect } from "react";
import { useLoadingStore } from "@/store/loadingStore";

interface UseSlowLoadingOptions {
  /**
   * Delay in ms before showing loader for slow requests.
   * Default: 1000 (1 second)
   */
  delay?: number;

  /**
   * Custom message to display while waiting
   */
  message?: string;

  /**
   * Whether to show the loader (default: true)
   */
  enabled?: boolean;
}

/**
 * useSlowLoading — Shows loader after a delay during slow API operations.
 *
 * Useful for showing warmup status on specific routes like login/register
 * that require backend data but response is slow.
 *
 * Automatically hides loader when component unmounts.
 *
 * Usage:
 * ```tsx
 * function LoginPage() {
 *   useSlowLoading({
 *     delay: 800,
 *     message: "Connecting to backend..."
 *   });
 *   return <LoginForm />;
 * }
 * ```
 */
export function useSlowLoading(options: UseSlowLoadingOptions = {}) {
  const { delay = 1000, message, enabled = true } = options;
  const { show, setStatus, hide } = useLoadingStore();

  useEffect(() => {
    if (!enabled) return;

    const timeout = setTimeout(() => {
      show();
      setStatus("connecting", message || "Loading...");
    }, delay);

    // Hide loader when component unmounts or loader is no longer needed
    return () => {
      clearTimeout(timeout);
      hide();
    };
  }, [delay, message, enabled, show, setStatus, hide]);
}
