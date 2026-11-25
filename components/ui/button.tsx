import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost" | "emerald";
  size?: "default" | "sm" | "lg" | "icon";
}

const variants: Record<string, string> = {
  default: "bg-navy-800 text-white hover:bg-navy-700",
  emerald: "bg-emerald-600 text-white hover:bg-emerald-700",
  secondary: "bg-slate-200 text-navy-800 hover:bg-slate-300",
  outline: "border border-slate-300 bg-white text-navy-800 hover:bg-slate-50",
  destructive: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-navy-800 hover:bg-slate-100",
};

const sizes: Record<string, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-8 px-3 text-xs",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
        "disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button };
