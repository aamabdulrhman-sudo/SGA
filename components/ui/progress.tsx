import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  barClassName,
}: {
  value: number;
  className?: string;
  barClassName?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("w-full h-3 bg-slate-200 rounded-full overflow-hidden", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all duration-700",
          clamped >= 100 ? "bg-emerald-600" : "bg-amber-500",
          barClassName
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
