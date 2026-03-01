import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  as?: "div" | "article" | "section";
}

const paddings = { none: "", sm: "p-4", md: "p-5", lg: "p-6" };

export default function Card({ children, className, hover = false, padding = "md", as: Tag = "div" }: CardProps) {
  return (
    <Tag
      className={cn(
        "bg-[var(--bg-card)] border border-[var(--border)] rounded-lg",
        hover && "transition-all duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] cursor-pointer",
        paddings[padding],
        className
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn("text-[13px] font-semibold text-[var(--text-primary)] tracking-tight", className)}>
      {children}
    </h3>
  );
}
