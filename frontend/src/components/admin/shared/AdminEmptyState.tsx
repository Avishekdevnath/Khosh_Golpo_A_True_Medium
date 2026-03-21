import type { LucideIcon } from "lucide-react";

type AdminEmptyStateProps = {
  icon: LucideIcon;
  text: string;
  color?: string;
};

export default function AdminEmptyState({ icon: Icon, text, color = "#636f8d" }: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-app-border bg-app-bg/50 px-4 py-12 text-center">
      <Icon size={32} style={{ color }} />
      <p className="m-0 max-w-[460px] text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
