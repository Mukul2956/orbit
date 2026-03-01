"use client";
import { useState } from "react";
import {
  FlaskConical, TrendingUp, Search, Filter, ArrowRight,
  Sparkles, Target, BarChart3, Zap, ExternalLink, Clock,
  ChevronRight, BookOpen, Users, Globe
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const TRENDS = [
  { topic: "Agentic AI workflows",     score: 94, velocity: "+44%", lifecycle: "growing",  volume: "82K", category: "Technology",    sources: ["Twitter", "Reddit", "HN"], gap: "high"  },
  { topic: "Quiet luxury fashion",     score: 91, velocity: "+22%", lifecycle: "peak",      volume: "67K", category: "Fashion",       sources: ["Instagram", "TikTok"],      gap: "med"   },
  { topic: "Local-first SaaS",         score: 88, velocity: "+15%", lifecycle: "growing",  volume: "41K", category: "Technology",    sources: ["Reddit", "HN"],             gap: "high"  },
  { topic: "Regenerative agriculture", score: 85, velocity: "+18%", lifecycle: "emerging", volume: "38K", category: "Lifestyle",     sources: ["Twitter", "Reddit"],        gap: "high"  },
  { topic: "AI fatigue discourse",     score: 82, velocity: "+31%", lifecycle: "growing",  volume: "74K", category: "Culture",       sources: ["Twitter", "LinkedIn"],      gap: "low"   },
  { topic: "Carbon credit markets",    score: 79, velocity: "+12%", lifecycle: "emerging", volume: "22K", category: "Finance",       sources: ["LinkedIn", "Reuters"],      gap: "high"  },
  { topic: "Hybrid work productivity", score: 77, velocity: "+6%",  lifecycle: "peak",     volume: "55K", category: "Work",          sources: ["LinkedIn", "Twitter"],      gap: "low"   },
  { topic: "Longevity biohacking",     score: 74, velocity: "+28%", lifecycle: "growing",  volume: "31K", category: "Health",        sources: ["Reddit", "Instagram"],      gap: "med"   },
];

const LIFECYCLE_COLOR: Record<string, { text: string; bg: string }> = {
  emerging: { text: "#34D399", bg: "rgba(52,211,153,0.1)" },
  growing:  { text: "#60A5FA", bg: "rgba(96,165,250,0.1)" },
  peak:     { text: "#FBBF24", bg: "rgba(251,191,36,0.1)" },
  declining:{ text: "#F87171", bg: "rgba(248,113,113,0.1)" },
};

const GAP_COLOR: Record<string, string> = {
  high: "#34D399",
  med:  "#FBBF24",
  low:  "#F87171",
};

const KEYWORDS = [
  { kw: "agentic AI",           vol: "22,400", diff: 48, cpc: "$8.40", intent: "informational" },
  { kw: "AI workflow automation",vol: "18,100", diff: 52, cpc: "$12.20",intent: "transactional" },
  { kw: "local-first software",  vol: "6,600",  diff: 31, cpc: "$4.80", intent: "informational" },
  { kw: "quiet luxury brands",   vol: "33,100", diff: 62, cpc: "$3.20", intent: "navigational"  },
  { kw: "longevity supplements", vol: "40,500", diff: 58, cpc: "$7.60", intent: "transactional" },
  { kw: "regenerative farming",  vol: "14,800", diff: 39, cpc: "$2.10", intent: "informational" },
];

const SOURCES = [
  { name: "Twitter / X",  posts: "48,200",  status: "live",    latency: "<30s" },
  { name: "Reddit",       posts: "22,800",  status: "live",    latency: "<1m"  },
  { name: "LinkedIn",     posts: "8,400",   status: "live",    latency: "<2m"  },
  { name: "Instagram",    posts: "31,600",  status: "live",    latency: "<1m"  },
  { name: "TikTok",       posts: "14,100",  status: "live",    latency: "<3m"  },
  { name: "Google Trends",posts: "—",       status: "synced",  latency: "15m"  },
  { name: "NewsAPI",      posts: "2,640",   status: "live",    latency: "<5m"  },
  { name: "SEMrush",      posts: "—",       status: "synced",  latency: "1h"   },
];

type Tab = "trends" | "keywords" | "sources";

export default function GenesisPage() {
  const [tab, setTab] = useState<Tab>("trends");
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const filtered = TRENDS.filter(t =>
    t.topic.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 2000);
  };

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.25)] flex items-center justify-center">
            <FlaskConical size={18} className="text-[#A78BFA]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Genesis</h1>
            <p className="text-sm text-[var(--text-secondary)]">Ideation & Research Laboratory</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(139,92,246,0.08)] border border-[rgba(139,92,246,0.2)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse-slow" />
            <span className="text-xs text-[#A78BFA] font-medium">127,400 posts/hr</span>
          </div>
          <Button
            variant="primary"
            size="md"
            icon={<Sparkles size={13} />}
            onClick={handleGenerate}
            loading={generating}
          >
            Generate brief
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Trends tracked",   value: "2,841",  icon: TrendingUp, color: "#8B5CF6" },
          { label: "Opportunities",    value: "194",    icon: Target,     color: "#6366F1" },
          { label: "Briefs generated", value: "47",     icon: BookOpen,   color: "#A78BFA" },
          { label: "Data sources",     value: "8",      icon: Globe,      color: "#818CF8" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} padding="md">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[var(--text-muted)]">{label}</p>
              <Icon size={14} style={{ color }} />
            </div>
            <p className="text-xl font-bold" style={{ color }}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Brief generator (shown when generated) */}
      {generated && (
        <Card className="mb-6 border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.05)]" padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles size={16} className="text-[#A78BFA]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Generated Content Brief</h2>
            <Badge variant="genesis">Draft</Badge>
            <button
              onClick={() => setGenerated(false)}
              className="ml-auto text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              Dismiss
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] text-[#A78BFA] uppercase tracking-wider font-semibold mb-2">Topic</p>
              <p className="text-base font-semibold text-[var(--text-primary)] mb-3">Why Agentic AI Is Changing How Teams Work in 2026</p>
              <p className="text-[11px] text-[#A78BFA] uppercase tracking-wider font-semibold mb-2">Target audience</p>
              <p className="text-sm text-[var(--text-secondary)] mb-3">Operations managers and team leads at mid-sized tech companies (50–500 employees) exploring workflow automation.</p>
              <p className="text-[11px] text-[#A78BFA] uppercase tracking-wider font-semibold mb-2">Key angles</p>
              <ul className="text-sm text-[var(--text-secondary)] space-y-1 list-none">
                {["The shift from copilots to autonomous agents", "Real cost savings from early adopters", "Risks and how to mitigate them", "Which tools are actually production-ready", "How to evaluate vendors without hype"].map(a => (
                  <li key={a} className="flex items-start gap-1.5"><ChevronRight size={11} className="text-[#A78BFA] mt-0.5 flex-shrink-0" />{a}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] text-[#A78BFA] uppercase tracking-wider font-semibold mb-2">SEO keywords</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {["agentic AI", "AI workflow automation", "autonomous agents", "LLM orchestration", "AI for teams"].map(k => (
                  <span key={k} className="px-2 py-0.5 rounded-md bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.2)] text-[11px] text-[#A78BFA]">{k}</span>
                ))}
              </div>
              <p className="text-[11px] text-[#A78BFA] uppercase tracking-wider font-semibold mb-2">Recommended formats</p>
              <div className="flex flex-col gap-1.5 mb-4">
                {["Long-form article (2,000–2,500 words)", "LinkedIn carousel (8 slides)", "Short-form video (90 sec)", "Twitter thread (12 tweets)"].map(f => (
                  <div key={f} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <div className="w-1 h-1 rounded-full bg-[#8B5CF6]" />{f}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" icon={<Zap size={12} />}>
                  Send to Forge
                </Button>
                <Button variant="secondary" size="sm">
                  Export brief
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--border)] mb-5">
        {(["trends", "keywords", "sources"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-all border-b-2 -mb-px ${
              tab === t
                ? "border-[#8B5CF6] text-[#A78BFA]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pb-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search trends…"
              className="input-base pl-8 w-52 text-xs"
            />
          </div>
          <Button variant="secondary" size="sm" icon={<Filter size={12} />}>Filter</Button>
        </div>
      </div>

      {/* Tab content */}
      {tab === "trends" && (
        <div className="grid gap-3">
          {filtered.map(({ topic, score, velocity, lifecycle, volume, category, sources, gap }) => {
            const lc = LIFECYCLE_COLOR[lifecycle];
            return (
              <Card key={topic} hover className="flex items-center gap-4">
                <div className="flex-1 min-w-0 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ borderColor: "#8B5CF6", color: "#A78BFA", background: "rgba(139,92,246,0.1)" }}>
                    {score}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{topic}</p>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium capitalize flex-shrink-0"
                        style={{ background: lc.bg, color: lc.text }}
                      >
                        {lifecycle}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[var(--text-muted)]">{category}</span>
                      <span className="text-xs text-[var(--text-muted)]">·</span>
                      <span className="text-xs text-[var(--text-muted)]">{volume} mentions</span>
                      <span className="text-xs text-[var(--text-muted)]">·</span>
                      <div className="flex items-center gap-1">
                        {sources.map(s => (
                          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-muted)]">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-[#34D399] font-medium">{velocity}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">velocity</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: GAP_COLOR[gap] }} />
                      <p className="text-xs font-medium capitalize" style={{ color: GAP_COLOR[gap] }}>{gap} gap</p>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)]">opportunity</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconRight={<ArrowRight size={12} />}
                    onClick={handleGenerate}
                  >
                    Brief
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "keywords" && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Keyword", "Search volume", "Difficulty", "CPC", "Intent", "Action"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {KEYWORDS.map(({ kw, vol, diff, cpc, intent }) => (
                  <tr key={kw} className="border-b border-[var(--border)] hover:bg-white/[0.02] transition-colors last:border-none">
                    <td className="px-5 py-3 text-sm font-medium text-[var(--text-primary)]">{kw}</td>
                    <td className="px-5 py-3 text-sm text-[var(--text-secondary)]">{vol}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 progress-bar">
                          <div className="progress-fill" style={{ width: `${diff}%`, background: diff > 60 ? "#F87171" : diff > 40 ? "#FBBF24" : "#34D399" }} />
                        </div>
                        <span className="text-xs text-[var(--text-secondary)]">{diff}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-[var(--text-secondary)]">{cpc}</td>
                    <td className="px-5 py-3">
                      <span className="capitalize text-xs px-2 py-0.5 rounded-full bg-[var(--bg-muted)] text-[var(--text-muted)]">{intent}</span>
                    </td>
                    <td className="px-5 py-3">
                      <Button variant="ghost" size="sm" iconRight={<ExternalLink size={11} />}>Add to brief</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "sources" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SOURCES.map(({ name, posts, status, latency }) => (
            <Card key={name} padding="md">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-[var(--text-primary)]">{name}</p>
                <span className={`flex items-center gap-1 text-[10px] font-medium ${status === "live" ? "text-[#34D399]" : "text-[#60A5FA]"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${status === "live" ? "bg-[#34D399]" : "bg-[#60A5FA]"} animate-pulse-slow`} />
                  {status}
                </span>
              </div>
              <p className="text-xl font-bold text-[var(--text-primary)] mb-1">{posts}</p>
              <p className="text-[10px] text-[var(--text-muted)]">posts this hour</p>
              <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                <Clock size={10} />{latency} latency
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
