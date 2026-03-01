import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "genesis" | "forge" | "pulse" | "orbit" | "success" | "warning" | "danger";
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<string, string> = {
  default:  "bg-white/8 text-[var(--text-secondary)] border border-white/10",
  genesis:  "bg-[rgba(139,92,246,0.1)] text-[#A78BFA] border border-[rgba(139,92,246,0.25)]",
  forge:    "bg-[rgba(245,158,11,0.1)] text-[#FCD34D] border border-[rgba(245,158,11,0.25)]",
  pulse:    "bg-[rgba(16,185,129,0.1)] text-[#34D399] border border-[rgba(16,185,129,0.25)]",
  orbit:    "bg-[rgba(59,130,246,0.1)] text-[#60A5FA] border border-[rgba(59,130,246,0.25)]",
  success:  "bg-[rgba(52,211,153,0.1)] text-[#34D399] border border-[rgba(52,211,153,0.25)]",
  warning:  "bg-[rgba(251,191,36,0.1)] text-[#FBBF24] border border-[rgba(251,191,36,0.25)]",
  danger:   "bg-[rgba(248,113,113,0.1)] text-[#F87171] border border-[rgba(248,113,113,0.25)]",
};

const dotColors: Record<string, string> = {
  default:  "bg-[var(--text-muted)]",
  genesis:  "bg-[#8B5CF6]",
  forge:    "bg-[#F59E0B]",
  pulse:    "bg-[#10B981]",
  orbit:    "bg-[#3B82F6]",
  success:  "bg-[#34D399]",
  warning:  "bg-[#FBBF24]",
  danger:   "bg-[#F87171]",
};

export default function Badge({ children, variant = "default", className, dot }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium", variantStyles[variant], className)}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
}