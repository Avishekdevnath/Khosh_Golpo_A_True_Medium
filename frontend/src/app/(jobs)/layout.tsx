import type { ReactNode } from "react";
import JobsShell from "@/components/jobs/layout/JobsShell";
import { ToastProvider } from "@/components/ui/toast";

export default function JobsLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <JobsShell>{children}</JobsShell>
    </ToastProvider>
  );
}
