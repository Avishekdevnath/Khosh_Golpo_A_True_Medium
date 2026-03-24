interface Props {
  score: number | null | undefined;
  size?: "sm" | "md";
}

export default function MatchBadge({ score, size = "sm" }: Props) {
  if (score === null || score === undefined) return null;

  const colorClass =
    score >= 70
      ? "bg-[#3dd68c]/15 text-[#3dd68c]"
      : score >= 40
      ? "bg-[#f0834a]/15 text-[#f0834a]"
      : "bg-secondary text-muted-foreground";

  const sizeClass =
    size === "md"
      ? "text-[12px] px-2.5 py-1 rounded-full font-medium"
      : "text-[10.5px] px-2 py-0.5 rounded-full font-medium";

  return (
    <span className={`inline-flex items-center ${colorClass} ${sizeClass}`}>
      {score}% match
    </span>
  );
}
