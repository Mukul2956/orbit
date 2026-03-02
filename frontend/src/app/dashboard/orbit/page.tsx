"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Globe2, Calendar, Clock, AlertCircle, Zap,
  Plus, MoreHorizontal, ChevronLeft, ChevronRight, RefreshCw,
  TrendingUp, MessageSquare, ArrowUp, Search, ExternalLink,
  Eye, ThumbsUp, Youtube, Download, CheckCircle2, Database,
} from "lucide-react";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  fetchRedditTrending, fetchPlatformStatus, getOAuthUrl, disconnectPlatform,
  fetchYouTubeTrending, searchYouTube, fetchOptimalTime,
  triggerIngest, fetchIngestStatus,
  type RedditPost, type PlatformStatus, type YouTubeVideo, type OptimalTimeResponse,
  type IngestStatus, type IngestResult, type IngestAllResult,
} from "@/lib/api";

// ─── Demo user (replace with real auth session later) ─────────────────────────
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

const DEMO_DOTS: Record<number, { color: string; platform: string }[]> = {
  1:  [{ color: "#818CF8", platform: "Twitter" }],
  3:  [{ color: "#3B82F6", platform: "LinkedIn" }, { color: "#F59E0B", platform: "Instagram" }],
  5:  [{ color: "#10B981", platform: "TikTok" }],
  7:  [{ color: "#818CF8", platform: "Twitter" }, { color: "#3B82F6", platform: "LinkedIn" }],
  10: [{ color: "#818CF8", platform: "Twitter" }],
  12: [{ color: "#3B82F6", platform: "LinkedIn" }, { color: "#10B981", platform: "TikTok" }],
  14: [{ color: "#818CF8", platform: "Twitter" }, { color: "#F59E0B", platform: "Instagram" }, { color: "#EF4444", platform: "YouTube" }],
  17: [{ color: "#818CF8", platform: "Twitter" }],
  19: [{ color: "#F59E0B", platform: "Instagram" }, { color: "#10B981", platform: "TikTok" }],
  21: [{ color: "#818CF8", platform: "Twitter" }, { color: "#3B82F6", platform: "LinkedIn" }],
  24: [{ color: "#F59E0B", platform: "Instagram" }],
  26: [{ color: "#818CF8", platform: "Twitter" }, { color: "#10B981", platform: "TikTok" }],
  28: [{ color: "#3B82F6", platform: "LinkedIn" }],
  31: [{ color: "#818CF8", platform: "Twitter" }, { color: "#F59E0B", platform: "Instagram" }],
};

const DEMO_QUEUE = [
  { title: "Why Agentic AI Is Changing Work", platform: "LinkedIn",   scheduledAt: "Today, 9:00 AM",    status: "live",      type: "Article"  },
  { title: "5 Habits of High-Output Teams",   platform: "Twitter",    scheduledAt: "Today, 12:30 PM",   status: "scheduled", type: "Thread"   },
  { title: "Spring Campaign — Look 1",         platform: "Instagram",  scheduledAt: "Today, 3:00 PM",    status: "scheduled", type: "Carousel" },
  { title: "Local-First SaaS Breakdown",      platform: "LinkedIn",   scheduledAt: "Tomorrow, 8:00 AM", status: "scheduled", type: "Article"  },
  { title: "Biohacking for Busy People",      platform: "TikTok",     scheduledAt: "Mar 3, 6:00 PM",    status: "paused",    type: "Video"    },
  { title: "Quiet Luxury Roundup",             platform: "Newsletter", scheduledAt: "Mar 4, 10:00 AM",   status: "draft",     type: "Email"    },
];

const PLATFORM_COLORS: Record<string, string> = {
  youtube: "#EF4444", linkedin: "#3B82F6", reddit: "#F97316",
  twitter: "#818CF8", instagram: "#F59E0B", tiktok: "#10B981",
};

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  live:       { label: "Published",  color: "#34D399", bg: "rgba(52,211,153,0.1)" },
  scheduled:  { label: "Scheduled",  color: "#60A5FA", bg: "rgba(96,165,250,0.1)" },
  paused:     { label: "Paused",     color: "#FBBF24", bg: "rgba(251,191,36,0.1)" },
  draft:      { label: "Draft",      color: "#525968", bg: "rgba(82,89,104,0.2)"  },
};

type Tab = "queue" | "connections";

function fmtNum(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
       : n >= 1_000     ? `${(n / 1_000).toFixed(1)}k`
       : String(n);
}

const REDDIT_SUBS = ["all", "python", "javascript", "technology", "programming", "webdev", "artificial", "MachineLearning"];
const YT_REGIONS  = [{ label: "Global", code: "US" }, { label: "IN", code: "IN" }, { label: "UK", code: "GB" }];
const YT_CATS     = [{ label: "All", id: "0" }, { label: "Tech", id: "28" }, { label: "Entertainment", id: "24" }];

export default function OrbitPage() {
  // ── Calendar ───────────────────────────────────────────────────────────────
  const today          = new Date();
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-indexed

  const daysInMonth    = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth();
  const todayDate      = today.getDate();

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  }

  const [activeTab, setActiveTab] = useState<Tab>("queue");

  // ── Reddit ─────────────────────────────────────────────────────────────────
  const [redditPosts, setRedditPosts]       = useState<RedditPost[]>([]);
  const [redditLoading, setRedditLoading]   = useState(true);
  const [redditError, setRedditError]       = useState<string | null>(null);
  const [subreddit, setSubreddit]           = useState("all");
  const [searchQuery, setSearchQuery]       = useState("");
  const [inputValue, setInputValue]         = useState("");

  // ── Platforms ──────────────────────────────────────────────────────────────
  const [platformStatuses, setPlatformStatuses] = useState<PlatformStatus[]>([]);
  const [platformsLoading, setPlatformsLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  const connectedCount = platformStatuses.filter(p => p.status === "connected").length;
  const totalPlatforms = platformStatuses.length || 6;

  // ── YouTube ────────────────────────────────────────────────────────────────
  const [ytVideos, setYtVideos]   = useState<YouTubeVideo[]>([]);
  const [ytLoading, setYtLoading] = useState(true);
  const [ytError, setYtError]     = useState<string | null>(null);
  const [ytRegion, setYtRegion]   = useState("US");
  const [ytCat, setYtCat]         = useState("0");
  const [ytInput, setYtInput]     = useState("");
  const [ytQuery, setYtQuery]     = useState("");
  const [ytMode, setYtMode]       = useState<"trending" | "search">("trending");

  // ── Callbacks ──────────────────────────────────────────────────────────────
  const loadReddit = useCallback(async (sub: string, q: string) => {
    setRedditLoading(true); setRedditError(null);
    try {
      const data = await fetchRedditTrending({ subreddit: sub, q, sort: "hot", limit: 12, timeframe: "month" });
      setRedditPosts(data.posts);
    } catch { setRedditError("Could not reach backend. Make sure the ORBIT server is running on :8000."); }
    finally { setRedditLoading(false); }
  }, []);

  const loadYouTube = useCallback(async (mode: "trending" | "search", q: string, region: string, cat: string) => {
    setYtLoading(true); setYtError(null);
    try {
      if (mode === "search" && q.trim()) {
        const data = await searchYouTube({ q, maxResults: 12, order: "relevance" });
        setYtVideos(data.results);
      } else {
        const data = await fetchYouTubeTrending({ regionCode: region, categoryId: cat, maxResults: 12 });
        setYtVideos(data.results);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setYtError(msg.includes("503") ? "YouTube API key not configured." : "YouTube API error. Check backend.");
    } finally { setYtLoading(false); }
  }, []);

  const loadPlatformStatus = useCallback(async () => {
    setPlatformsLoading(true);
    try {
      const data = await fetchPlatformStatus(DEMO_USER_ID);
      setPlatformStatuses(data.platforms);
    } catch { /* silent */ }
    finally { setPlatformsLoading(false); }
  }, []);

  const handleConnect = useCallback(async (platform: string) => {
    if (platform !== "youtube" && platform !== "linkedin") return;
    setConnectingPlatform(platform);
    try { const url = await getOAuthUrl(platform, DEMO_USER_ID); window.location.href = url; }
    catch { setConnectingPlatform(null); }
  }, []);

  const handleDisconnect = useCallback(async (platform: string) => {
    try {
      await disconnectPlatform(DEMO_USER_ID, platform);
    } catch {
      // ignore – mark disconnected in UI anyway
    } finally {
      await loadPlatformStatus();
    }
  }, [loadPlatformStatus]);

  // ── Optimal Timing ──────────────────────────────────────────────
  const [timingData, setTimingData] = useState<Record<string, OptimalTimeResponse>>({});
  const [timingLoading, setTimingLoading] = useState(true);
  // ── Ingest / data sync state ─────────────────────────────────────────────
  const [ingestStatus, setIngestStatus] = useState<IngestStatus | null>(null);
  const [ingestingPlatform, setIngestingPlatform] = useState<string | null>(null);
  const [ingestResults, setIngestResults] = useState<Record<string, {rows: number; errors: string[]; ts: string}>>({});
  const loadTiming = useCallback(async () => {
    setTimingLoading(true);
    const results: Record<string, OptimalTimeResponse> = {};
    await Promise.all(
      ["linkedin", "youtube", "reddit"].map(async (p) => {
        try {
          results[p] = await fetchOptimalTime(DEMO_USER_ID, p);
        } catch { /* silent */ }
      })
    );
    setTimingData(results);
    setTimingLoading(false);
  }, []);

  useEffect(() => { loadTiming(); }, [loadTiming]);

  // ── Ingest helpers ───────────────────────────────────────────────────────
  const loadIngestStatus = useCallback(async () => {
    try {
      const s = await fetchIngestStatus(DEMO_USER_ID);
      setIngestStatus(s);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadIngestStatus(); }, [loadIngestStatus]);

  const handleIngest = useCallback(async (platform: "reddit" | "youtube" | "linkedin" | "all") => {
    setIngestingPlatform(platform);
    try {
      const result = await triggerIngest(DEMO_USER_ID, platform);
      const now = new Date().toLocaleTimeString();
      if (platform === "all") {
        const r = result as IngestAllResult;
        setIngestResults(prev => ({
          ...prev,
          reddit:   { rows: r.reddit.rows_inserted,   errors: r.reddit.errors,   ts: now },
          youtube:  { rows: r.youtube.rows_inserted,  errors: r.youtube.errors,  ts: now },
          linkedin: { rows: r.linkedin.rows_inserted, errors: r.linkedin.errors, ts: now },
        }));
      } else {
        const r = result as IngestResult;
        setIngestResults(prev => ({ ...prev, [platform]: { rows: r.rows_inserted, errors: r.errors, ts: now } }));
      }
      await loadIngestStatus();
      // Refresh timing predictions with new data
      loadTiming();
    } catch (e: any) {
      const now = new Date().toLocaleTimeString();
      const key = platform === "all" ? "all" : platform;
      setIngestResults(prev => ({ ...prev, [key]: { rows: 0, errors: [e.message], ts: now } }));
    } finally {
      setIngestingPlatform(null);
    }
  }, [loadIngestStatus, loadTiming]);
  useEffect(() => { loadYouTube(ytMode, ytQuery, ytRegion, ytCat); }, [ytMode, ytQuery, ytRegion, ytCat, loadYouTube]);
  useEffect(() => { loadPlatformStatus(); }, [loadPlatformStatus]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("status")) { loadPlatformStatus(); window.history.replaceState({}, "", window.location.pathname); }
  }, [loadPlatformStatus]);

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
            <div className="w-1.5 h-1.5 rounded-full bg-[#60A5FA] animate-pulse" />
            <span className="text-xs text-[#60A5FA] font-medium">
              {platformsLoading ? "…" : `${connectedCount} platform${connectedCount !== 1 ? "s" : ""} connected`}
            </span>
          </div>
          <Button variant="primary" size="md" icon={<Plus size={13} />} className="bg-[#3B82F6] hover:bg-[#60A5FA] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]">
            Schedule post
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Published this month", value: "163",  color: "#34D399" },
          { label: "Scheduled",            value: "48",   color: "#60A5FA" },
          { label: "Platforms connected",  value: platformsLoading ? "…" : `${connectedCount}/${totalPlatforms}`, color: "#3B82F6" },
          { label: "Avg. best time score", value: "92%",  color: "#FBBF24" },
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
              <CardTitle>{MONTHS[calMonth]} {calYear}</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-white/5 text-[var(--text-muted)] transition-colors"><ChevronLeft size={14} /></button>
              <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-white/5 text-[var(--text-muted)] transition-colors"><ChevronRight size={14} /></button>
            </div>
          </CardHeader>

          <div className="grid grid-cols-7 gap-0 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-[var(--text-muted)] uppercase py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`e-${i}`} className="min-h-[52px]" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((date) => {
              const events = DEMO_DOTS[date] || [];
              const isToday = isCurrentMonth && date === todayDate;
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
            {(["queue", "connections"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-all border-b-2 -mb-px ${
                  activeTab === t
                    ? "border-[#3B82F6] text-[#60A5FA]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {activeTab === "queue" && (
            <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[420px] pr-0.5">
              {DEMO_QUEUE.map(({ title, platform, scheduledAt, status, type }) => {
                const s = STATUS_STYLE[status] ?? STATUS_STYLE.draft;
                const pColor = PLATFORM_COLORS[platform.toLowerCase()] ?? "#525968";
                return (
                  <div
                    key={title}
                    className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3.5 hover:border-[var(--border-strong)] transition-all"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-medium" style={{ color: pColor }}>{platform}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">·</span>
                          <span className="text-[10px] text-[var(--text-muted)]">{type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
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
                    <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                      <Clock size={9} />{scheduledAt}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "connections" && (
            <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[420px] pr-0.5">
              {platformsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[64px] rounded-xl bg-white/[0.03] border border-[var(--border)] animate-pulse" />
                ))
              ) : platformStatuses.map((item) => {
                const isOAuthPlatform = item.platform === "youtube" || item.platform === "linkedin";
                const displayName =
                  item.platform === "youtube" ? "YouTube" :
                  item.platform === "linkedin" ? "LinkedIn" :
                  item.platform === "reddit" ? "Reddit" :
                  item.platform === "twitter" ? "Twitter / X" :
                  item.platform === "instagram" ? "Instagram" :
                  item.platform.charAt(0).toUpperCase() + item.platform.slice(1);

                const color = PLATFORM_COLORS[item.platform] ?? "#525968";

                const statusStyle: Record<string, { label: string; color: string }> = {
                  connected:     { label: "Connected",    color: "#34D399" },
                  auth_expired:  { label: "Reconnect",    color: "#F87171" },
                  not_connected: { label: isOAuthPlatform ? "Connect" : "N/A", color: "#525968" },
                };
                const ss = statusStyle[item.status] ?? statusStyle.not_connected;

                return (
                  <div
                    key={item.platform}
                    className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3.5 flex items-center gap-3"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}
                    >
                      {displayName.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text-primary)]">{displayName}</p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">
                        {item.account_name ?? (item.status === "connected" ? "Connected" : "Not connected")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isOAuthPlatform && item.status !== "connected" ? (
                        <button
                          onClick={() => handleConnect(item.platform as "youtube" | "linkedin")}
                          disabled={connectingPlatform === item.platform}
                          className="text-[10px] font-medium px-2.5 py-1 rounded-lg transition-all"
                          style={{
                            background: `${color}20`,
                            color,
                            border: `1px solid ${color}30`,
                            opacity: connectingPlatform === item.platform ? 0.5 : 1,
                          }}
                        >
                          {connectingPlatform === item.platform ? "Redirecting…" : item.status === "auth_expired" ? "Reconnect" : "Connect"}
                        </button>
                      ) : isOAuthPlatform && item.status === "connected" ? (
                        <button
                          onClick={() => handleDisconnect(item.platform)}
                          className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-white/5 text-[var(--text-muted)] hover:text-[#F87171] transition-colors"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <span className="text-[10px] font-medium" style={{ color: ss.color }}>{ss.label}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {!platformsLoading && (
                <Button variant="secondary" size="sm" icon={<Plus size={12} />} className="w-full">
                  Add platform
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      {/* ── Optimal Posting Times ──────────────────────────────────────── */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap size={15} className="text-[#FBBF24]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Optimal Posting Times</h2>
            <span className="text-[10px] text-[var(--text-muted)] bg-white/5 px-2 py-0.5 rounded-full">
              Prophet ML forecast · 7-day window
            </span>
          </div>
          <button onClick={loadTiming}
            className="p-1.5 rounded-md hover:bg-white/5 text-[var(--text-muted)] transition-colors" title="Refresh">
            <RefreshCw size={13} className={timingLoading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["linkedin", "youtube", "reddit"].map(platform => {
            const t = timingData[platform];
            const color = PLATFORM_COLORS[platform] ?? "#525968";
            const displayName = { linkedin: "LinkedIn", youtube: "YouTube", reddit: "Reddit" }[platform];
            const isML = t && !t.is_default_time;

            return (
              <Card key={platform} padding="md" className="flex flex-col gap-3">
                {/* Platform header */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
                    {displayName!.slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{displayName}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {isML ? "ML forecast" : "Industry default"}
                    </p>
                  </div>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                    isML ? "bg-[rgba(52,211,153,0.12)] text-[#34D399]" : "bg-white/5 text-[var(--text-muted)]"
                  }`}>
                    {isML ? "ML" : "Default"}
                  </span>
                </div>

                {/* Time block */}
                {timingLoading ? (
                  <div className="h-9 rounded-lg bg-white/[0.04] animate-pulse" />
                ) : t ? (
                  <div className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]">
                    <p className="text-base font-bold" style={{ color }}>
                      {new Date(t.optimal_time).toLocaleString("en-US", {
                        weekday: "short", month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                ) : (
                  <div className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]">
                    <p className="text-xs text-[var(--text-muted)]">Unavailable</p>
                  </div>
                )}

                {/* Confidence bar */}
                {t && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[var(--text-muted)]">Confidence</span>
                      <span className="text-[10px] font-medium" style={{ color }}>
                        {Math.round((t.confidence_score ?? 0) * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.round((t.confidence_score ?? 0) * 100)}%`, background: color }} />
                    </div>
                  </div>
                )}

                {/* Reasoning */}
                {t?.reasoning && (
                  <p className="text-[9px] text-[var(--text-muted)] leading-relaxed line-clamp-2">
                    {t.reasoning}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </section>
      {/* ── Reddit Insights ───────────────────────────────────────────── */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
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
              {REDDIT_SUBS.map(s => (
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
                      <ArrowUp size={9} />{fmtNum(post.score)}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-muted)]">
                      <MessageSquare size={9} />{fmtNum(post.num_comments)}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* ── YouTube Insights ─────────────────────────────────────────────── */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Youtube size={15} className="text-[#EF4444]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">YouTube Insights</h2>
            <span className="text-[10px] text-[var(--text-muted)] bg-white/5 px-2 py-0.5 rounded-full">
              {ytMode === "search" && ytQuery ? `“${ytQuery}”` : `Trending · ${ytRegion}`} · live
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-2.5 py-1.5">
              <Search size={11} className="text-[var(--text-muted)]" />
              <input
                value={ytInput}
                onChange={e => setYtInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { setYtQuery(ytInput); setYtMode("search"); } }}
                placeholder="Search YouTube…"
                className="bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none w-32"
              />
            </div>
            <div className="flex items-center gap-1">
              {YT_REGIONS.map(r => (
                <button key={r.code}
                  onClick={() => { setYtRegion(r.code); setYtMode("trending"); setYtQuery(""); setYtInput(""); }}
                  className={`text-[10px] px-2 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
                    ytRegion === r.code && ytMode === "trending" ? "bg-[#EF4444] text-white" : "bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}>{r.label}</button>
              ))}
              {YT_CATS.map(c => (
                <button key={c.id}
                  onClick={() => { setYtCat(c.id); setYtMode("trending"); setYtQuery(""); setYtInput(""); }}
                  className={`text-[10px] px-2 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
                    ytCat === c.id && ytMode === "trending" ? "bg-[rgba(239,68,68,0.2)] text-[#EF4444] border border-[rgba(239,68,68,0.3)]" : "bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}>{c.label}</button>
              ))}
            </div>
            <button
              onClick={() => loadYouTube(ytMode, ytQuery, ytRegion, ytCat)}
              className="p-1.5 rounded-md hover:bg-white/5 text-[var(--text-muted)] transition-colors" title="Refresh"
            >
              <RefreshCw size={13} className={ytLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {ytError && (
          <div className="flex items-center gap-2 text-xs text-[#F87171] bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] rounded-lg px-4 py-3 mb-4">
            <AlertCircle size={13} /> {ytError}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {ytLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[160px] rounded-xl bg-white/[0.03] border border-[var(--border)] animate-pulse" />
              ))
            : ytVideos.map(video => (
                <a key={video.id} href={video.url ?? "#"} target="_blank" rel="noopener noreferrer"
                  className="group bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[#EF4444]/40 hover:bg-[rgba(239,68,68,0.02)] transition-all flex flex-col">
                  {video.thumbnail ? (
                    <div className="relative w-full aspect-video bg-black overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={video.thumbnail}
                        alt={video.title ?? ""}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Youtube size={24} className="text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-[rgba(239,68,68,0.06)] flex items-center justify-center">
                      <Youtube size={20} className="text-[#EF4444]/40" />
                    </div>
                  )}
                  <div className="p-3 flex flex-col gap-1.5 flex-1">
                    <p className="text-[11px] font-medium text-[var(--text-primary)] line-clamp-2 leading-snug">{video.title}</p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{video.channel}</p>
                    <div className="flex items-center gap-3 mt-auto pt-1.5 border-t border-[var(--border)]">
                      <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-muted)]">
                        <Eye size={9} />{fmtNum(video.view_count)}
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] text-[#34D399]">
                        <ThumbsUp size={9} />{fmtNum(video.like_count)}
                      </span>
                    </div>
                  </div>
                </a>
              ))
          }
        </div>
      </section>

      {/* ── Data Sync ─────────────────────────────────────────────────────── */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database size={15} className="text-[#818CF8]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Data Sync</h2>
            <span className="text-[10px] text-[var(--text-muted)] bg-white/5 px-2 py-0.5 rounded-full">
              Pull real engagement data to train ML models
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadIngestStatus}
              className="p-1.5 rounded-md hover:bg-white/5 text-[var(--text-muted)] transition-colors" title="Refresh status">
              <RefreshCw size={13} />
            </button>
            <button
              onClick={() => handleIngest("all")}
              disabled={ingestingPlatform !== null}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[rgba(129,140,248,0.12)] text-[#818CF8] border border-[rgba(129,140,248,0.2)] hover:bg-[rgba(129,140,248,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              <Download size={11} className={ingestingPlatform === "all" ? "animate-bounce" : ""} />
              {ingestingPlatform === "all" ? "Syncing…" : "Sync All"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["reddit", "youtube", "linkedin"] as const).map(platform => {
            const color = PLATFORM_COLORS[platform] ?? "#525968";
            const label = { reddit: "Reddit", youtube: "YouTube", linkedin: "LinkedIn" }[platform];
            const patterns = ingestStatus?.audience_patterns[platform] ?? 0;
            const perf = ingestStatus?.platform_performance[platform] ?? 0;
            const mlReady = ingestStatus?.ml_ready[platform] ?? false;
            const threshold = ingestStatus?.ml_threshold ?? 50;
            const result = ingestResults[platform];
            const isIngesting = ingestingPlatform === platform || ingestingPlatform === "all";
            const pct = Math.min(100, Math.round((patterns / threshold) * 100));

            return (
              <Card key={platform} padding="md" className="flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold"
                      style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
                      {label.slice(0, 2)}
                    </div>
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {mlReady ? (
                      <span className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(52,211,153,0.12)] text-[#34D399]">
                        <CheckCircle2 size={9} /> ML Ready
                      </span>
                    ) : (
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-[var(--text-muted)]">
                        {patterns}/{threshold} rows
                      </span>
                    )}
                  </div>
                </div>

                {/* Row counts */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[var(--bg-surface)] rounded-lg p-2 text-center">
                    <p className="text-base font-bold" style={{ color }}>{patterns.toLocaleString()}</p>
                    <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Timing rows</p>
                  </div>
                  <div className="bg-[var(--bg-surface)] rounded-lg p-2 text-center">
                    <p className="text-base font-bold text-[var(--text-primary)]">{perf.toLocaleString()}</p>
                    <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Post analytics</p>
                  </div>
                </div>

                {/* ML threshold progress bar */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[9px] text-[var(--text-muted)]">ML threshold</span>
                    <span className="text-[9px]" style={{ color }}>{pct}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>

                {/* Last sync result */}
                {result && (
                  <div className={`px-2.5 py-1.5 rounded-lg text-[9px] leading-relaxed ${
                    result.errors.length > 0
                      ? "bg-[rgba(248,113,113,0.08)] text-[#F87171] border border-[rgba(248,113,113,0.15)]"
                      : "bg-[rgba(52,211,153,0.08)] text-[#34D399] border border-[rgba(52,211,153,0.15)]"
                  }`}>
                    {result.errors.length > 0
                      ? result.errors[0].slice(0, 100)
                      : `+${result.rows} rows synced at ${result.ts}`}
                  </div>
                )}

                {/* Sync button */}
                <button
                  onClick={() => handleIngest(platform)}
                  disabled={ingestingPlatform !== null}
                  className="flex items-center justify-center gap-1.5 text-[11px] py-1.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80"
                  style={{ background: `${color}18`, color, border: `1px solid ${color}28` }}
                >
                  <Download size={10} className={isIngesting ? "animate-bounce" : ""} />
                  {isIngesting ? "Pulling data…" : `Pull ${label} data`}
                </button>
              </Card>
            );
          })}
        </div>

        {/* How it works note */}
        <div className="mt-4 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[10px] text-[var(--text-muted)] leading-relaxed">
          <span className="font-semibold text-[var(--text-secondary)]">How data sync works: </span>
          <span className="text-[#F97316]">Reddit</span> — pulls top posts from your niche subreddits using the public API (no login needed). Engagement = (upvotes + comments) / estimated reach.{" "}
          <span className="text-[#EF4444]">YouTube</span> — pulls trending videos via YouTube Data API. Requires <code className="font-mono text-[10px] bg-white/5 px-1 py-0.5 rounded">YOUTUBE_API_KEY</code> in .env. Engagement = (likes + comments) / views.{" "}
          <span className="text-[#3B82F6]">LinkedIn</span> — pulls your own posts via LinkedIn API. Requires connecting LinkedIn first (OAuth token).{" "}
          After syncing, re-run <code className="font-mono text-[10px] bg-white/5 px-1 py-0.5 rounded">python scripts/train_models.py</code> to retrain LightGBM on the real data.
        </div>
      </section>

    </div>
  );
}
