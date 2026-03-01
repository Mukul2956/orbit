"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FlaskConical,
  Hammer,
  Activity,
  Globe2,
  Settings,
  Bell,
  ChevronDown,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard",         label: "Overview",  icon: LayoutDashboard, color: "text-[var(--text-secondary)]" },
  { href: "/dashboard/genesis", label: "Genesis",   icon: FlaskConical,    color: "text-[#A78BFA]" },
  { href: "/dashboard/forge",   label: "Forge",     icon: Hammer,          color: "text-[#FCD34D]" },
  { href: "/dashboard/pulse",   label: "Pulse",     icon: Activity,        color: "text-[#34D399]" },
  { href: "/dashboard/orbit",   label: "Orbit",     icon: Globe2,          color: "text-[#60A5FA]" },
];

const BOTTOM_ITEMS = [
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <aside className="w-[220px] min-h-screen bg-[var(--bg-surface)] border-r border-[var(--border)] flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-[var(--border)]">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[rgba(99,102,241,0.15)] border border-[rgba(99,102,241,0.3)] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="#6366F1" strokeWidth="1.5" strokeLinejoin="round"/>
              <circle cx="8" cy="8" r="2" fill="#6366F1"/>
            </svg>
          </div>
          <span className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight">Synapse</span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <button className="p-1.5 rounded-md hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors relative">
            <Bell size={14} />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
          </button>
        </div>
      </div>

      {/* Workspace selector */}
      <div className="px-3 pt-3">
        <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-[10px] font-bold">
            A
          </div>
          <span className="text-sm text-[var(--text-primary)] font-medium flex-1 text-left">Acme Corp</span>
          <ChevronDown size={13} className="text-[var(--text-muted)]" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-4 flex flex-col gap-0.5">
        <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest px-2.5 mb-1.5">
          Platform
        </p>
        {NAV_ITEMS.map(({ href, label, icon: Icon, color }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-all duration-150 tracking-tight",
                active
                  ? "bg-[rgba(99,102,241,0.1)] text-[var(--text-primary)] border border-[rgba(99,102,241,0.18)]"
                  : "text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon
                size={15}
                className={cn(active ? "text-[#818CF8]" : color)}
              />
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
              )}
            </Link>
          );
        })}


      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-[var(--border)] pt-3">
        {BOTTOM_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium tracking-tight transition-all",
              "text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-[var(--text-primary)]"
            )}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}

        {/* User */}
        <button className="w-full mt-1 flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-semibold">
            MS
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs font-medium text-[var(--text-primary)] truncate">Mukul Singh</p>
            <p className="text-[10px] text-[var(--text-muted)] truncate">mukul@synapse.io</p>
          </div>
          <ChevronDown size={12} className="text-[var(--text-muted)]" />
        </button>
      </div>
    </aside>
  );
}
