"use client";
import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, icon, iconRight, children, className, disabled, ...props }, ref) => {
    const base = "inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-all duration-150 select-none disabled:opacity-40 disabled:cursor-not-allowed tracking-tight";
    const variants = {
      primary:   "bg-[#6366F1] text-white hover:bg-[#818CF8] hover:shadow-[0_0_20px_rgba(99,102,241,0.35)] active:scale-[0.98]",
      secondary: "bg-transparent text-[var(--text-primary)] border border-[var(--border-strong)] hover:bg-white/[0.04] hover:border-white/[0.22]",
      ghost:     "bg-transparent text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-[var(--text-primary)]",
      danger:    "bg-[rgba(248,113,113,0.1)] text-[#F87171] border border-[rgba(248,113,113,0.2)] hover:bg-[rgba(248,113,113,0.18)]",
    };
    const sizes = {
      sm: "text-[12px] px-2.5 py-1.5",
      md: "text-[13px] px-3.5 py-2",
      lg: "text-[13.5px] px-5 py-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
        {children}
        {iconRight}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
