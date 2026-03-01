import {
  TrendingUp, TrendingDown, FlaskConical, Hammer, Activity, Globe2,
  ArrowRight, Clock, CheckCircle2, AlertCircle, Zap, FileText,
  Image as ImageIcon, Video, Music, Users, BarChart2
} from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";

const METRICS = [
  { label: "Trends monitored",   value: "12,841",  delta: "+18%",  up: true,  color: "#6366F1", desc: "vs last 7 days" },
  { label: "Content generated",  value: "1,204",   delta: "+31%",  up: true,  color: "#8B5CF6", desc: "this month" },
  { label: "Pieces published",   value: "347",     delta: "+12%",  up: true,  color: "#10B981", desc: "this month" },
  { label: "Avg. engagement",    value: "6.8%",    delta: "-0.4%", up: false, color: "#3B82F6", desc: "across platforms" },
];

const RECENT_ACTIVITY = [
  { icon: FileText,   color: "#8B5CF6", module: "Genesis", action: "Brief generated",     label: "The Rise of Quiet Luxury in 2026",    time: "2m ago",  status: "done" },
  { icon: Hammer,     color: "#F59E0B", module: "Forge",   action: "Video created",       label: "5 Productivity Hacks for Hybrid Teams", time: "8m ago",  status: "done" },
  { icon: Globe2,     color: "#3B82F6", module: "Orbit",   action: "Scheduled to Twitter",label: "How We Cut Costs by 40%",               time: "14m ago", status: "done" },
  { icon: Activity,   color: "#10B981", module: "Pulse",   action: "Report ready",        label: "Weekly Performance Digest",             time: "1h ago",  status: "done" },
  { icon: ImageIcon,  color: "#F59E0B", module: "Forge",   action: "Image set generated", label: "Spring Campaign Visuals",               time: "2h ago",  status: "done" },
  { icon: AlertCircle,color: "#F87171", module: "Orbit",   action: "Publish failed",      label: "LinkedIn post — auth expired",           time: "3h ago",  status: "error"},
];

const TOP_TRENDS = [
  { topic: "Quiet luxury fashion",    score: 94, delta: "+22", category: "Fashion",    color: "#8B5CF6" },
  { topic: "Local-first SaaS",        score: 89, delta: "+15", category: "Tech",       color: "#6366F1" },
  { topic: "AI fatigue discourse",    score: 82, delta: "+31", category: "Culture",    color: "#F59E0B" },
  { topic: "Regenerative agriculture",score: 77, delta: "+18", category: "Lifestyle",  color: "#10B981" },
  { topic: "Agentic AI workflows",    score: 91, delta: "+44", category: "Tech",       color: "#3B82F6" },
];

const QUICK_ACTIONS = [
  { label: "New content brief",  href: "/dashboard/genesis", icon: FlaskConical, color: "#8B5CF6", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.2)" },
  { label: "Create content",     href: "/dashboard/forge",   icon: Hammer,       color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
  { label: "View analytics",     href: "/dashboard/pulse",   icon: Activity,     color: "#10B981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)" },
  { label: "Schedule content",   href: "/dashboard/orbit",   icon: Globe2,       color: "#3B82F6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)" },
];

const PLATFORM_STATS = [
  { name: "Twitter / X",  posts: 84,  engagement: "4.2%", icon: "𝕏" },
  { name: "LinkedIn",     posts: 52,  engagement: "8.7%", icon: "in" },
  { name: "Instagram",    posts: 116, engagement: "6.1%", icon: "IG" },
  { name: "TikTok",       posts: 38,  engagement: "11.4%",icon: "TT" },
];

const CHART_BARS = [32, 45, 42, 58, 51, 67, 61, 78, 72, 88, 81, 94, 86, 98];

export default function DashboardPage() {
  return (
    <div className="p-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-sm text-[var(--text-muted)] mb-1">Good morning, Mukul 👋</p>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Platform Overview</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Here&apos;s what&apos;s happening across Synapse today.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.2)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse-slow" />
            <span className="text-xs text-[#34D399] font-medium">All systems operational</span>
          </div>
          <Link
            href="/dashboard/genesis"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6366F1] text-white text-sm font-medium hover:bg-[#818CF8] transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.35)]"
          >
            <Zap size={13} /> New brief
          </Link>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {METRICS.map(({ label, value, delta, up, color, desc }) => (
          <Card key={label} padding="md">
            <p className="text-xs text-[var(--text-muted)] mb-3">{label}</p>
            <p className="text-2xl font-bold mb-1" style={{ color }}>{value}</p>
            <div className="flex items-center gap-1.5">
              {up ? <TrendingUp size={12} className="text-[#34D399]" /> : <TrendingDown size={12} className="text-[#F87171]" />}
              <span className={`text-xs font-medium ${up ? "text-[#34D399]" : "text-[#F87171]"}`}>{delta}</span>
              <span className="text-xs text-[var(--text-muted)]">{desc}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-4 mb-4">

        {/* Engagement chart */}
        <Card className="lg:col-span-2" padding="md">
          <CardHeader>
            <CardTitle>Engagement over time</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="success" dot>+18% this week</Badge>
              <select className="text-xs bg-transparent text-[var(--text-muted)] border-none outline-none cursor-pointer">
                <option>14 days</option>
                <option>30 days</option>
                <option>90 days</option>
              </select>
            </div>
          </CardHeader>

          {/* Simple bar chart */}
          <div className="flex items-end gap-1 h-36 mb-3">
            {CHART_BARS.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm transition-all duration-300 hover:opacity-100"
                  style={{
                    height: `${h}%`,
                    background: i === CHART_BARS.length - 1
                      ? "linear-gradient(to top, #6366F1, #818CF8)"
                      : `rgba(99,102,241,${0.15 + (i / CHART_BARS.length) * 0.3})`,
                    opacity: i === CHART_BARS.length - 1 ? 1 : 0.8,
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
            <span>Feb 14</span>
            <span>Feb 20</span>
            <span>Today</span>
          </div>
        </Card>

        {/* Top trends */}
        <Card padding="md">
          <CardHeader>
            <CardTitle>Top trends today</CardTitle>
            <Link href="/dashboard/genesis" className="text-xs text-[#818CF8] hover:underline flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </CardHeader>
          <ul className="flex flex-col gap-3">
            {TOP_TRENDS.map(({ topic, score, delta, category, color }) => (
              <li key={topic} className="flex items-center gap-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">{topic}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-[var(--text-muted)]">{category}</span>
                    <span className="text-[10px] text-[#34D399]">↑{delta}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-[11px] font-bold"
                  style={{ borderColor: color, color, background: `${color}15` }}>
                  {score}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Bottom grid */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Recent activity */}
        <Card className="lg:col-span-2" padding="md">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <Badge variant="default">{RECENT_ACTIVITY.length} events</Badge>
          </CardHeader>
          <ul className="flex flex-col divide-y divide-[var(--border)]">
            {RECENT_ACTIVITY.map(({ icon: Icon, color, module, action, label, time, status }) => (
              <li key={label} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                  <Icon size={13} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-medium" style={{ color }}>{module}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">·</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{action}</span>
                  </div>
                  <p className="text-xs text-[var(--text-primary)] truncate">{label}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {status === "done" ? (
                    <CheckCircle2 size={12} className="text-[#34D399]" />
                  ) : (
                    <AlertCircle size={12} className="text-[#F87171]" />
                  )}
                  <span className="text-[10px] text-[var(--text-muted)]">{time}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Quick actions */}
          <Card padding="md">
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map(({ label, href, icon: Icon, color, bg, border }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-[1.03]"
                  style={{ background: bg, border: `1px solid ${border}` }}
                >
                  <Icon size={16} style={{ color }} />
                  <span className="text-[10px] font-medium text-[var(--text-secondary)] text-center leading-tight">{label}</span>
                </Link>
              ))}
            </div>
          </Card>

          {/* Platform breakdown */}
          <Card padding="md">
            <CardHeader>
              <CardTitle>By platform</CardTitle>
              <Link href="/dashboard/pulse" className="text-xs text-[#818CF8] hover:underline flex items-center gap-1">
                Details <ArrowRight size={11} />
              </Link>
            </CardHeader>
            <ul className="flex flex-col gap-2.5">
              {PLATFORM_STATS.map(({ name, posts, engagement, icon }) => (
                <li key={name} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[var(--bg-muted)] border border-[var(--border)] flex items-center justify-center text-[10px] font-bold text-[var(--text-secondary)]">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-[var(--text-primary)]">{name}</span>
                      <span className="text-[10px] text-[#34D399]">{engagement}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${(posts / 116) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">{posts}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
