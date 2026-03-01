"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Globe2, Calendar, Clock, CheckCircle2, AlertCircle, Pause,
  Plus, Filter, MoreHorizontal, Zap, ChevronLeft, ChevronRight,
  Twitter, Linkedin, Instagram, Youtube, ArrowRight, RefreshCw,
  TrendingUp, MessageSquare, ArrowUp, Search, ExternalLink
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { fetchRedditTrending, type RedditPost } from "@/lib/api";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DATES = Array.from({ length: 28 }, (_, i) => i + 1);

const CALENDAR_EVENTS: Record<number, { color: string; platform: string }[]> = {
  1:  [{ color: "#818CF8", platform: "Twitter" }],
  3:  [{ color: "#3B82F6", platform: "LinkedIn" }, { color: "#F59E0B", platform: "Instagram" }],
  5:  [{ color: "#10B981", platform: "TikTok" }],
  7:  [{ color: "#818CF8", platform: "Twitter" }, { color: "#3B82F6", platform: "LinkedIn" }],
  9:  [{ color: "#F59E0B", platform: "Instagram" }],
  10: [{ color: "#818CF8", platform: "Twitter" }],
  12: [{ color: "#3B82F6", platform: "LinkedIn" }, { color: "#10B981", platform: "TikTok" }],
  14: [{ color: "#818CF8", platform: "Twitter" }, { color: "#F59E0B", platform: "Instagram" }, { color: "#EF4444", platform: "YouTube" }],
  16: [{ color: "#3B82F6", platform: "LinkedIn" }],
  17: [{ color: "#818CF8", platform: "Twitter" }],
  19: [{ color: "#F59E0B", platform: "Instagram" }, { color: "#10B981", platform: "TikTok" }],
  21: [{ color: "#818CF8", platform: "Twitter" }, { color: "#3B82F6", platform: "LinkedIn" }],
  24: [{ color: "#F59E0B", platform: "Instagram" }],
  26: [{ color: "#818CF8", platform: "Twitter" }, { color: "#10B981", platform: "TikTok" }],
  27: [{ color: "#3B82F6", platform: "LinkedIn" }],
  28: [{ color: "#818CF8", platform: "Twitter" }, { color: "#F59E0B", platform: "Instagram" }],
};

const QUEUE = [
  { title: "Why Agentic AI Is Changing Work", platform: "LinkedIn",  scheduledAt: "Today, 9:00 AM",    status: "live",     type: "Article",  engagement: "est. 8–12%" },
  { title: "5 Habits of High-Output Teams",   platform: "Twitter",   scheduledAt: "Today, 12:30 PM",   status: "scheduled",type: "Thread",   engagement: "est. 4–6%" },
  { title: "Spring Campaign — Look 1",         platform: "Instagram", scheduledAt: "Today, 3:00 PM",    status: "scheduled",type: "Carousel", engagement: "est. 6–9%" },
  { title: "Local-First SaaS Breakdown",      platform: "LinkedIn",  scheduledAt: "Tomorrow, 8:00 AM", status: "scheduled",type: "Article",  engagement: "est. 7–10%" },
  { title: "Biohacking for Busy People",      platform: "TikTok",    scheduledAt: "Feb 28, 6:00 PM",   status: "paused",   type: "Video",    engagement: "est. 10–16%" },
  { title: "Quiet Luxury Roundup",             platform: "Newsletter",scheduledAt: "Mar 1, 10:00 AM",   status: "draft",    type: "Email",    engagement: "est. 45–60%" },
];

const CONNECTIONS = [
  { name: "Twitter / X",  handle: "@acme_corp",       status: "connected",    color: "#818CF8", posts: 84 },
  { name: "LinkedIn",     handle: "Acme Corporation", status: "connected",    color: "#3B82F6", posts: 52 },
  { name: "Instagram",    handle: "@acme.official",   status: "connected",    color: "#F59E0B", posts: 116 },
  { name: "TikTok",       handle: "@acme_team",       status: "connected",    color: "#10B981", posts: 38 },
  { name: "YouTube",      handle: "Acme Corp",        status: "auth_expired", color: "#EF4444", posts: 12 },
  { name: "Medium",       handle: "Acme Blog",        status: "not_connected",color: "#525968", posts: 0  },
];

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  live:       { label: "Published",  color: "#34D399", bg: "rgba(52,211,153,0.1)" },
  scheduled:  { label: "Scheduled",  color: "#60A5FA", bg: "rgba(96,165,250,0.1)" },
  paused:     { label: "Paused",     color: "#FBBF24", bg: "rgba(251,191,36,0.1)" },
  draft:      { label: "Draft",      color: "#525968", bg: "rgba(82,89,104,0.2)"  },
};

const CONN_STATUS: Record<string, { label: string; color: string }> = {
  connected:    { label: "Connected",   color: "#34D399" },
  auth_expired: { label: "Reconnect",   color: "#F87171" },
  not_connected:{ label: "Connect",     color: "#525968" },
};

type QueueTab = "queue" | "connections";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtScore(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

const SUBREDDITS = ["all", "python", "javascript", "technology", "programming", "webdev", "artificial", "MachineLearning"];

export default function OrbitPage() {
  const [queueTab, setQueueTab] = useState<QueueTab>("queue");
  const [month] = useState("February 2026");

  // Reddit state
  const [redditPosts, setRedditPosts]   = useState<RedditPost[]>([]);
  const [redditLoading, setRedditLoading] = useState(true);
  const [redditError, setRedditError]   = useState<string | null>(null);
  const [subreddit, setSubreddit]       = useState("all");
  const [searchQuery, setSearchQuery]   = useState("");
  const [inputValue, setInputValue]     = useState("");

  const loadReddit = useCallback(async (sub: string, q: string) => {
    setRedditLoading(true);
    setRedditError(null);
    try {
      const data = await fetchRedditTrending({ subreddit: sub, q, sort: "hot", limit: 12, timeframe: "month" });
      setRedditPosts(data.posts);
    } catch {
      setRedditError("Could not reach backend. Make sure the ORBIT server is running on :8000.");
    } finally {
      setRedditLoading(false);
    }
  }, []);

  useEffect(() => { loadReddit(subreddit, searchQuery); }, [subreddit, searchQuery, loadReddit]);

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.25)] flex items-center justify-center">
            <Globe2 size={18} className="text-[#60A5FA]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Orbit</h1>
            <p className="text-sm text-[var(--text-secondary)]">Intelligent Distribution & Scheduling</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.2)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#60A5FA] animate-pulse-slow" />
            <span className="text-xs text-[#60A5FA] font-medium">5 platforms active</span>
          </div>
          <Button variant="primary" size="md" icon={<Plus size={13} />} className="bg-[#3B82F6] hover:bg-[#60A5FA] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]">
            Schedule post
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Published this month", value: "163", color: "#34D399" },
          { label: "Scheduled",            value: "48",  color: "#60A5FA" },
          { label: "Platforms connected",  value: "5/6", color: "#3B82F6" },
          { label: "Avg. best time score", value: "92%", color: "#FBBF24" },
        ].map(({ label, value, color }) => (
          <Card key={label} padding="md">
            <p className="text-xs text-[var(--text-muted)] mb-2">{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Calendar */}
        <Card className="lg:col-span-3" padding="md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-[var(--text-muted)]" />
              <CardTitle>{month}</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded-md hover:bg-white/5 text-[var(--text-muted)] transition-colors"><ChevronLeft size={14} /></button>
              <button className="p-1.5 rounded-md hover:bg-white/5 text-[var(--text-muted)] transition-colors"><ChevronRight size={14} /></button>
            </div>
          </CardHeader>

          <div className="grid grid-cols-7 gap-0 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-[var(--text-muted)] uppercase py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0">
            {/* Month starts on Sunday for Feb 2026 */}
            {DATES.map((date) => {
              const events = CALENDAR_EVENTS[date] || [];
              const isToday = date === 27;
              return (
                <div
                  key={date}
                  className={`min-h-[52px] p-1 rounded-lg cursor-pointer transition-all hover:bg-white/5 border ${
                    isToday
                      ? "border-[rgba(99,102,241,0.4)] bg-[rgba(99,102,241,0.06)]"
                      : "border-transparent"
                  }`}
                >
                  <p className={`text-[11px] font-medium mb-1 ${isToday ? "text-[#818CF8]" : "text-[var(--text-secondary)]"}`}>{date}</p>
                  <div className="flex flex-wrap gap-0.5">
                    {events.slice(0, 3).map((ev, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: ev.color }} title={ev.platform} />
                    ))}
                    {events.length > 3 && (
                      <span className="text-[8px] text-[var(--text-muted)]">+{events.length - 3}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)]">
            {[
              { label: "Twitter", color: "#818CF8" },
              { label: "LinkedIn",color: "#3B82F6" },
              { label: "Instagram",color: "#F59E0B" },
              { label: "TikTok",  color: "#10B981" },
              { label: "YouTube", color: "#EF4444" },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Right panel */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-[var(--border)]">
            {(["queue", "connections"] as QueueTab[]).map(t => (
              <button
                key={t}
                onClick={() => setQueueTab(t)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-all border-b-2 -mb-px ${
                  queueTab === t
                    ? "border-[#3B82F6] text-[#60A5FA]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {queueTab === "queue" && (
            <div className="flex flex-col gap-2.5">
              {QUEUE.map(({ title, platform, scheduledAt, status, type, engagement }) => {
                const s = STATUS_STYLE[status];
                return (
                  <div
                    key={title}
                    className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3.5 hover:border-[var(--border-strong)] transition-all"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-[var(--text-muted)]">{platform}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">·</span>
                          <span className="text-[10px] text-[var(--text-muted)]">{type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ color: s.color, background: s.bg }}
                        >
                          {s.label}
                        </span>
                        <button className="p-1 hover:bg-white/5 rounded-md text-[var(--text-muted)] transition-colors">
                          <MoreHorizontal size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                        <Clock size={9} />{scheduledAt}
                      </div>
                      <span className="text-[10px] text-[#34D399]">{engagement}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {queueTab === "connections" && (
            <div className="flex flex-col gap-2.5">
              {CONNECTIONS.map(({ name, handle, status, color, posts }) => {
                const cs = CONN_STATUS[status];
                return (
                  <div
                    key={name}
                    className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3.5 flex items-center gap-3"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}
                    >
                      {name.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text-primary)]">{name}</p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">{handle}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-medium" style={{ color: cs.color }}>{cs.label}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">{posts} posts</span>
                    </div>
                  </div>
                );
              })}
              <Button variant="secondary" size="sm" icon={<Plus size={12} />} className="w-full">
                Add platform
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Reddit Insights ───────────────────────────────────────────── */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-[#F97316]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Reddit Insights</h2>
            <span className="text-[10px] text-[var(--text-muted)] bg-white/5 px-2 py-0.5 rounded-full">
              r/{subreddit} · live
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Search bar */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-2.5 py-1.5">
              <Search size={11} className="text-[var(--text-muted)]" />
              <input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") setSearchQuery(inputValue); }}
                placeholder="Search Reddit…"
                className="bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none w-36"
              />
            </div>
            {/* Subreddit pills */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {SUBREDDITS.map(s => (
                <button
                  key={s}
                  onClick={() => { setSubreddit(s); setSearchQuery(""); setInputValue(""); }}
                  className={`text-[10px] px-2 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
                    subreddit === s && !searchQuery
                      ? "bg-[#F97316] text-white"
                      : "bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  r/{s}
                </button>
              ))}
            </div>
            <button
              onClick={() => loadReddit(subreddit, searchQuery)}
              className="p-1.5 rounded-md hover:bg-white/5 text-[var(--text-muted)] transition-colors"
              title="Refresh"
            >
              <RefreshCw size={13} className={redditLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {redditError && (
          <div className="flex items-center gap-2 text-xs text-[#F87171] bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] rounded-lg px-4 py-3 mb-4">
            <AlertCircle size={13} /> {redditError}
          </div>
        )}

        {redditLoading && !redditError && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[110px] rounded-xl bg-white/[0.03] border border-[var(--border)] animate-pulse" />
            ))}
          </div>
        )}

        {!redditLoading && !redditError && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {redditPosts.map(post => (
              <a
                key={post.id}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3.5 hover:border-[#F97316]/40 hover:bg-[rgba(249,115,22,0.03)] transition-all flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-medium text-[var(--text-primary)] leading-snug line-clamp-3 flex-1">
                    {post.title}
                  </p>
                  <ExternalLink size={10} className="text-[var(--text-muted)] flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {post.flair && (
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[rgba(249,115,22,0.12)] text-[#FB923C] self-start truncate max-w-full">
                    {post.flair}
                  </span>
                )}
                <div className="flex items-center gap-3 mt-auto pt-1 border-t border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-muted)] truncate">r/{post.subreddit}</span>
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="flex items-center gap-0.5 text-[10px] text-[#34D399]">
                      <ArrowUp size={9} />{fmtScore(post.score)}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-muted)]">
                      <MessageSquare size={9} />{fmtScore(post.num_comments)}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
