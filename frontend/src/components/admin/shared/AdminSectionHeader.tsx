type AdminSectionHeaderProps = {
  title: string;
  countLabel?: string;
};

export default function AdminSectionHeader({ title, countLabel }: AdminSectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2.5 border-b border-app-border pb-2.5">
      <h2 className="m-0 font-serif text-xl font-bold text-foreground">{title}</h2>
      {countLabel && (
        <span className="whitespace-nowrap rounded-full border border-app-border bg-app-input px-3 py-1 text-[11px] font-semibold text-muted-foreground">
          {countLabel}
        </span>
      )}
    </div>
  );
}
