export default function AdminSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-1.5 py-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-app-border bg-app-panel px-3.5 py-2.5"
        >
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-app-input opacity-50" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-2.5 w-1/2 animate-pulse rounded-md bg-app-input opacity-50" />
            <div className="h-2.5 w-[30%] animate-pulse rounded-md bg-app-input opacity-35" />
          </div>
          <div className="h-2.5 w-[20%] animate-pulse rounded-md bg-app-input opacity-35" />
        </div>
      ))}
    </div>
  );
}
