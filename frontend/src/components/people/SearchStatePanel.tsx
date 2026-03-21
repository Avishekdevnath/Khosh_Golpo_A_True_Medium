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
    <div className="grid gap-2.5 rounded-[22px] border border-dashed border-[#445178]/90 bg-[#0a0d16]/90 p-[22px] max-sm:rounded-[18px] max-sm:p-[18px]">
      <h2 className="m-0 text-2xl text-[#edf2ff]">{title}</h2>
      <p className="m-0 max-w-[680px] text-sm leading-relaxed text-[#91a0c6]">{text}</p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="text-sm font-bold text-[#ffc8a9] no-underline">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
