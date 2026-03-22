import Link from "next/link";

type SearchStatePanelProps = {
  title: string;
  text: string;
  actionLabel?: string;
  actionHref?: string;
};

export default function SearchStatePanel({
  title,
  text,
  actionLabel,
  actionHref,
}: SearchStatePanelProps) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card-hover p-6">
      <h2 className="m-0 mb-1.5 text-[18px] font-semibold text-foreground">{title}</h2>
      <p className="m-0 max-w-[600px] text-[13.5px] leading-relaxed text-text-secondary">{text}</p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="mt-3 block text-[13px] font-medium text-primary no-underline hover:underline">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
