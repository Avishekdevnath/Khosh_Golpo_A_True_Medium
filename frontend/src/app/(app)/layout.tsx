import type { ReactNode } from "react";

import AppShell from "@/components/app/AppShell";
import { ToastProvider } from "@/components/ui/toast";

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
    </ToastProvider>
  );
}
