import type { LucideIcon } from "lucide-react";

type AdminStatCardProps = {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
};

export default function AdminStatCard({ icon: Icon, label, value, color }: AdminStatCardProps) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-app-border bg-app-panel p-4 transition-transform hover:-translate-y-px hover:border-border-hover">
      <div
        className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-white/[0.08]"
        style={{ background: `${color}15`, color }}
      >
        <Icon size={18} />
      </div>
      <div>
        <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <div className="font-serif text-[26px] font-bold leading-none text-foreground">
          {value}
        </div>
      </div>
    </div>
  );
}
