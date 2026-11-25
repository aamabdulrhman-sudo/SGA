import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "muted";

const styles: Record<BadgeVariant, string> = {
  default: "bg-navy-800 text-white",
  success: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-100 text-amber-700 border border-amber-200",
  danger: "bg-red-100 text-red-700 border border-red-200",
  info: "bg-blue-100 text-blue-700 border border-blue-200",
  muted: "bg-slate-100 text-slate-600 border border-slate-200",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
