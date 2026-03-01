"use client";
import { useState } from "react";
import {
  Activity, TrendingUp, TrendingDown, Eye, Heart, MessageCircle,
  Share2, ArrowRight, BarChart3, Calendar, Download, Filter
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const DAILY_DATA = [
  { day: "Feb 14", views: 12400, engagement: 4.1, shares: 210, saves: 88 },
  { day: "Feb 15", views: 15200, engagement: 4.8, shares: 290, saves: 112 },
  { day: "Feb 16", views: 11800, engagement: 3.9, shares: 188, saves: 76 },
  { day: "Feb 17", views: 18600, engagement: 5.6, shares: 340, saves: 152 },
  { day: "Feb 18", views: 21400, engagement: 6.2, shares: 420, saves: 188 },
  { day: "Feb 19", views: 24100, engagement: 6.8, shares: 490, saves: 210 },
  { day: "Feb 20", views: 19800, engagement: 5.9, shares: 370, saves: 162 },
  { day: "Feb 21", views: 28400, engagement: 7.4, shares: 560, saves: 241 },
  { day: "Feb 22", views: 26200, engagement: 7.1, shares: 510, saves: 224 },
  { day: "Feb 23", views: 31600, engagement: 8.2, shares: 640, saves: 288 },
  { day: "Feb 24", views: 29400, engagement: 7.8, shares: 600, saves: 268 },
  { day: "Feb 25", views: 34200, engagement: 8.9, shares: 710, saves: 320 },
  { day: "Feb 26", views: 32100, engagement: 8.4, shares: 672, saves: 300 },
  { day: "Feb 27", views: 38400, engagement: 9.2, shares: 810, saves: 360 },
];

const PLATFORM_DATA = [
  { platform: "Twitter",   engagement: 4.2, reach: 82000,  posts: 84,  color: "#818CF8" },
  { platform: "LinkedIn",  engagement: 8.7, reach: 44000,  posts: 52,  color: "#3B82F6" },
  { platform: "Instagram", engagement: 6.1, reach: 118000, posts: 116, color: "#F59E0B" },
  { platform: "TikTok",    engagement: 11.4,reach: 62000,  posts: 38,  color: "#10B981" },
];

const PLATFORM_CHART_DATA = PLATFORM_DATA.map(p => ({
  name: p.platform,
  engagement: p.engagement,
  reach: Math.round(p.reach / 1000),
}));

const TOP_CONTENT = [
  { title: "Why Agentic AI Is Changing Work",   platform: "LinkedIn",  views: "24.1K", eng: "9.4%",  trend: "up",   delta: "+3.2%" },
  { title: "5 Productivity Hacks for 2026",      platform: "Twitter",   views: "18.8K", eng: "7.2%",  trend: "up",   delta: "+1.8%" },
  { title: "Quiet Luxury for Every Budget",      platform: "Instagram", views: "41.2K", eng: "8.6%",  trend: "up",   delta: "+4.1%" },
  { title: "The Future of Remote Work",          platform: "LinkedIn",  views: "12.3K", eng: "5.1%",  trend: "down", delta: "-0.6%" },
  { title: "Carbon Credits Explained",           platform: "Newsletter",views: "8.4K",  eng: "64.2%", trend: "up",   delta: "+12%" },
];

const METRICS = [
  { label: "Total views",       value: "362K",  delta: "+22%", up: true,  icon: Eye,             color: "#6366F1" },
  { label: "Avg. engagement",   value: "6.8%",  delta: "+1.2%",up: true,  icon: Heart,           color: "#8B5CF6" },
  { label: "Total shares",      value: "5,820", delta: "+18%", up: true,  icon: Share2,          color: "#10B981" },
  { label: "Saves",             value: "2,410", delta: "-3.1%",up: false, icon: MessageCircle,   color: "#3B82F6" },
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 shadow-xl">
      <p className="text-[11px] text-[var(--text-muted)] mb-2">{label}</p>
      {payload.map(({ value, name, color }) => (
        <div key={name} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-[var(--text-secondary)] capitalize">{name}:</span>
          <span className="font-medium text-[var(--text-primary)]">{value}</span>
        </div>
      ))}
    </div>
  );
};

export default function PulsePage() {
  const [range, setRange] = useState("14d");

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.25)] flex items-center justify-center">
            <Activity size={18} className="text-[#34D399]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Pulse</h1>
            <p className="text-sm text-[var(--text-secondary)]">Real-Time Analytics & Content Evolution</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-muted)] border border-[var(--border)]">
            {["7d", "14d", "30d", "90d"].map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  range === r
                    ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm" icon={<Filter size={12} />}>Filters</Button>
          <Button variant="secondary" size="sm" icon={<Download size={12} />}>Export</Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {METRICS.map(({ label, value, delta, up, icon: Icon, color }) => (
          <Card key={label} padding="md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-[var(--text-muted)]">{label}</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                <Icon size={13} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-bold mb-1" style={{ color }}>{value}</p>
            <div className="flex items-center gap-1.5">
              {up ? <TrendingUp size={11} className="text-[#34D399]" /> : <TrendingDown size={11} className="text-[#F87171]" />}
              <span className={`text-xs font-medium ${up ? "text-[#34D399]" : "text-[#F87171]"}`}>{delta}</span>
              <span className="text-xs text-[var(--text-muted)]">vs prev period</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Main chart */}
      <Card className="mb-4" padding="md">
        <CardHeader>
          <CardTitle>Views & engagement over time</CardTitle>
          <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#6366F1]" /> Views (K)</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#34D399]" /> Engagement %</span>
          </div>
        </CardHeader>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={DAILY_DATA} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#34D399" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#34D399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="views" stroke="#6366F1" strokeWidth={2} fill="url(#viewsGrad)" dot={false} name="Views" />
            <Area type="monotone" dataKey="engagement" stroke="#34D399" strokeWidth={2} fill="url(#engGrad)" dot={false} name="Engagement" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Bottom grid */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Platform breakdown */}
        <Card className="lg:col-span-2" padding="md">
          <CardHeader>
            <CardTitle>Performance by platform</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={PLATFORM_CHART_DATA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="engagement" fill="#6366F1" radius={[3,3,0,0]} name="Engagement %" />
            </BarChart>
          </ResponsiveContainer>
          <ul className="flex flex-col gap-2 mt-3 pt-3 border-t border-[var(--border)]">
            {PLATFORM_DATA.map(({ platform, engagement, reach, posts, color }) => (
              <li key={platform} className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-xs text-[var(--text-secondary)] flex-1">{platform}</span>
                <span className="text-xs text-[var(--text-muted)]">{posts} posts</span>
                <span className="text-xs font-medium" style={{ color }}>{engagement}%</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Top performing content */}
        <Card className="lg:col-span-3" padding="md">
          <CardHeader>
            <CardTitle>Top performing content</CardTitle>
            <Button variant="ghost" size="sm" iconRight={<ArrowRight size={11} />}>All content</Button>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Content", "Platform", "Views", "Engagement", "Trend"].map(h => (
                    <th key={h} className="text-left pb-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide pr-4 last:pr-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TOP_CONTENT.map(({ title, platform, views, eng, trend, delta }) => (
                  <tr key={title} className="border-b border-[var(--border)] last:border-none hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 pr-4">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[200px]">{title}</p>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="text-xs text-[var(--text-muted)]">{platform}</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">{views}</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge variant={parseFloat(eng) > 7 ? "success" : "default"} className="text-[10px]">{eng}</Badge>
                    </td>
                    <td className="py-2.5">
                      <div className={`flex items-center gap-1 text-xs font-medium ${trend === "up" ? "text-[#34D399]" : "text-[#F87171]"}`}>
                        {trend === "up" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {delta}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
