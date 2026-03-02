"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Globe2, Calendar, Clock, AlertCircle, Zap,
  Plus, MoreHorizontal, ChevronLeft, ChevronRight, RefreshCw,
  TrendingUp, MessageSquare, ArrowUp, Search, ExternalLink,
  Eye, ThumbsUp, Youtube, Download, CheckCircle2, Database,
  X, Send, Loader2, Flame,
} from "lucide-react";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  fetchRedditTrending, fetchPlatformStatus, getOAuthUrl, disconnectPlatform,
  fetchYouTubeTrending, searchYouTube, fetchOptimalTime,
  triggerIngest, fetchIngestStatus,
  fetchUserQueue, fetchDashboardStats, fetchHeatmap,
  createDraft, queueDraft, fetchUserDrafts,
  type RedditPost, type PlatformStatus, type YouTubeVideo, type OptimalTimeResponse,
  type IngestStatus, type IngestResult, type IngestAllResult,
  type QueueEntry, type DashboardStats, type HeatmapPoint,
  type DraftResponse, type ContentType,
} from "@/lib/api";

// ─── Demo user (replace with real auth session later) ─────────────────────────
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

const DEMO_DOTS: Record<number, { color: string; platform: string }[]> = {
  1:  [{ color: "#818CF8", platform: "Twitter" }],
  3:  [{ color: "#3B82F6", platform: "LinkedIn" }, { color: "#F59E0B", platform: "Instagram" }],
  5:  [{ color: "#F97316", platform: "Reddit" }],
  7:  [{ color: "#818CF8", platform: "Twitter" }, { color: "#3B82F6", platform: "LinkedIn" }],
  10: [{ color: "#818CF8", platform: "Twitter" }, { color: "#F97316", platform: "Reddit" }],
  12: [{ color: "#3B82F6", platform: "LinkedIn" }],
  14: [{ color: "#818CF8", platform: "Twitter" }, { color: "#F59E0B", platform: "Instagram" }, { color: "#EF4444", platform: "YouTube" }],
  17: [{ color: "#818CF8", platform: "Twitter" }, { color: "#F97316", platform: "Reddit" }],
  19: [{ color: "#F59E0B", platform: "Instagram" }],
  21: [{ color: "#818CF8", platform: "Twitter" }, { color: "#3B82F6", platform: "LinkedIn" }],
  24: [{ color: "#F59E0B", platform: "Instagram" }, { color: "#F97316", platform: "Reddit" }],
  26: [{ color: "#818CF8", platform: "Twitter" }],
  28: [{ color: "#3B82F6", platform: "LinkedIn" }, { color: "#F97316", platform: "Reddit" }],
  31: [{ color: "#818CF8", platform: "Twitter" }, { color: "#F59E0B", platform: "Instagram" }],
};

const PLATFORM_COLORS: Record<string, string> = {
  youtube: "#EF4444", linkedin: "#3B82F6", reddit: "#F97316",
  twitter: "#818CF8", instagram: "#F59E0B",
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

  // ── Live Queue ─────────────────────────────────────────────────────────────
  const [liveQueue, setLiveQueue]         = useState<DraftResponse[]>([]);
  const [queueLoading, setQueueLoading]   = useState(true);

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const drafts = await fetchUserDrafts(DEMO_USER_ID);
      setLiveQueue(drafts);
    } catch { /* silent — show empty */ }
    finally { setQueueLoading(false); }
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  // ── Dashboard Stats ────────────────────────────────────────────────────────
  const [dashStats, setDashStats]         = useState<DashboardStats | null>(null);

  const loadDashStats = useCallback(async () => {
    try {
      const s = await fetchDashboardStats(DEMO_USER_ID);
      setDashStats(s);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadDashStats(); }, [loadDashStats]);

  // ── Heatmap ────────────────────────────────────────────────────────────────
  const [heatmapData, setHeatmapData]     = useState<HeatmapPoint[]>([]);
  const [heatmapPlatform, setHeatmapPlatform] = useState("linkedin");

  const loadHeatmap = useCallback(async (platform: string) => {
    try {
      const data = await fetchHeatmap(DEMO_USER_ID, platform);
      setHeatmapData(Array.isArray(data) ? data : []);
    } catch { setHeatmapData([]); }
  }, []);

  useEffect(() => { loadHeatmap(heatmapPlatform); }, [heatmapPlatform, loadHeatmap]);

  // ── Schedule Post modal ────────────────────────────────────────────────────
  const [showModal, setShowModal]         = useState(false);
  const [modalTitle, setModalTitle]       = useState("");
  const [modalBody, setModalBody]         = useState("");
  const [modalType, setModalType]         = useState<ContentType>("text");
  const [modalPlatforms, setModalPlatforms] = useState<string[]>(["linkedin"]);
  const [modalEvergreen, setModalEvergreen] = useState(false);
  const [modalTimeSensitive, setModalTimeSensitive] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError]       = useState<string | null>(null);
  const [modalSuccess, setModalSuccess]   = useState<string | null>(null);

  const handleScheduleSubmit = useCallback(async () => {
    if (!modalTitle.trim()) { setModalError("Title is required"); return; }
    if (modalPlatforms.length === 0) { setModalError("Select at least one platform"); return; }
    setModalSubmitting(true); setModalError(null); setModalSuccess(null);
    try {
      const draft = await createDraft({
        user_id: DEMO_USER_ID,
        title: modalTitle,
        body: modalBody || undefined,
        content_type: modalType,
        is_evergreen: modalEvergreen,
        is_time_sensitive: modalTimeSensitive,
      });
      const result = await queueDraft(draft.id, {
        platforms: modalPlatforms,
        is_time_sensitive: modalTimeSensitive,
      });
      const timeStr = result.optimal_publish_time
        ? new Date(result.optimal_publish_time).toLocaleString("en-US", {
            weekday: "short", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit",
          })
        : "to be determined";
      setModalSuccess(`Queued! Optimal publish time: ${timeStr} on ${result.platforms.join(", ")}`);
      await loadQueue();
      await loadDashStats();
      // Reset form after 3s
      setTimeout(() => {
        setShowModal(false);
        setModalTitle(""); setModalBody(""); setModalType("text");
        setModalPlatforms(["linkedin"]); setModalEvergreen(false);
        setModalTimeSensitive(false); setModalSuccess(null);
      }, 3000);
    } catch (e: unknown) {
      setModalError(e instanceof Error ? e.message : "Failed to schedule post");
    } finally {
      setModalSubmitting(false);
    }
  }, [modalTitle, modalBody, modalType, modalPlatforms, modalEvergreen, modalTimeSensitive, loadQueue, loadDashStats]);

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
  const [ingestResults, setIngestResults] = useState<Record<string, {rows: number; errors: string[]; info?: string; ts: string}>>({});
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
          linkedin: { rows: r.linkedin.rows_inserted, errors: r.linkedin.errors, info: (r.linkedin as any).info, ts: now },
        }));
      } else {
        const r = result as IngestResult & { info?: string };
        setIngestResults(prev => ({ ...prev, [platform]: { rows: r.rows_inserted, errors: r.errors, info: r.info, ts: now } }));
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
  useEffect(() => { loadReddit(subreddit, searchQuery); }, [subreddit, searchQuery, loadReddit]);
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
          <Button variant="primary" size="md" icon={<Plus size={13} />}
            onClick={() => setShowModal(true)}
            className="bg-[#3B82F6] hover:bg-[#60A5FA] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]">
            Schedule post
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Published this month",  value: dashStats ? String(dashStats.total_published)  : "…", color: "#34D399" },
          { label: "Scheduled",             value: dashStats ? String(dashStats.total_scheduled)  : "…", color: "#60A5FA" },
          { label: "Platforms connected",   value: platformsLoading ? "…" : `${connectedCount}/${totalPlatforms}`, color: "#3B82F6" },
          { label: "Avg. engagement score", value: dashStats ? `${Math.round(dashStats.avg_engagement_score * 100)}%` : "…", color: "#FBBF24" },
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
              { label: "Twitter",   color: "#818CF8" },
              { label: "LinkedIn",  color: "#3B82F6" },
              { label: "Instagram", color: "#F59E0B" },
              { label: "YouTube",   color: "#EF4444" },
              { label: "Reddit",    color: "#F97316" },
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
              {queueLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[72px] rounded-xl bg-white/[0.03] border border-[var(--border)] animate-pulse" />
                ))
              ) : liveQueue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-[var(--border)] flex items-center justify-center">
                    <Calendar size={16} className="text-[var(--text-muted)]" />
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">No posts yet — schedule your first one!</p>
                  <button onClick={() => setShowModal(true)}
                    className="text-xs font-medium text-[#60A5FA] hover:underline">
                    + Schedule post
                  </button>
                </div>
              ) : liveQueue.map((draft) => {
                const s = STATUS_STYLE[draft.status] ?? STATUS_STYLE.draft;
                return (
                  <div key={draft.id}
                    className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3.5 hover:border-[var(--border-strong)] transition-all">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{draft.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-medium text-[var(--text-muted)] capitalize">{draft.content_type}</span>
                          {draft.is_evergreen && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[rgba(52,211,153,0.1)] text-[#34D399]">Evergreen</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ color: s.color, background: s.bg }}>{s.label}</span>
                        <button className="p-1 hover:bg-white/5 rounded-md text-[var(--text-muted)] transition-colors">
                          <MoreHorizontal size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                      <Clock size={9} />
                      {new Date(draft.created_at).toLocaleString("en-US", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
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
              {Object.values(timingData).some(t => t && !t.is_default_time)
                ? "Pattern ML · trained on your data"
                : "Industry defaults · sync data to enable ML"}
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
            const isProphet = isML && t?.reasoning?.includes("Prophet");
            const subLabel = !t ? "Loading…" : isML ? (isProphet ? "Prophet ML" : "Pattern ML") : "Industry default";

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
                      {subLabel}
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

      {/* ── Engagement Heatmap ────────────────────────────────────────────── */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame size={15} className="text-[#F97316]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Audience Heatmap</h2>
            <span className="text-[10px] text-[var(--text-muted)] bg-white/5 px-2 py-0.5 rounded-full">
              Best hours to post · last 90 days
            </span>
          </div>
          <div className="flex items-center gap-1">
            {["linkedin", "youtube", "reddit"].map(p => (
              <button key={p}
                onClick={() => setHeatmapPlatform(p)}
                className={`text-[10px] px-2 py-1 rounded-md font-medium capitalize transition-all ${
                  heatmapPlatform === p
                    ? "text-white"
                    : "bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
                style={heatmapPlatform === p ? { background: PLATFORM_COLORS[p] } : {}}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {heatmapData.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-6 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-xs text-[var(--text-muted)]">
            <AlertCircle size={13} />
            No heatmap data yet — sync data from the Data Sync panel below, then check back.
          </div>
        ) : (() => {
          // Build a day×hour matrix
          const maxVal = Math.max(...heatmapData.map(p => p.engagement_rate), 0.001);
          const matrix: Record<number, Record<number, number>> = {};
          heatmapData.forEach(p => {
            if (!matrix[p.day_of_week]) matrix[p.day_of_week] = {};
            matrix[p.day_of_week][p.hour] = p.engagement_rate;
          });
          const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
          const color = PLATFORM_COLORS[heatmapPlatform] ?? "#60A5FA";

          return (
            <div className="overflow-x-auto">
              <div className="min-w-[520px]">
                {/* Hour axis */}
                <div className="flex mb-1 ml-8">
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="flex-1 text-center text-[8px] text-[var(--text-muted)]">
                      {h % 3 === 0 ? `${h}h` : ""}
                    </div>
                  ))}
                </div>
                {dayLabels.map((day, di) => (
                  <div key={day} className="flex items-center gap-1 mb-0.5">
                    <span className="w-7 text-[9px] text-[var(--text-muted)] flex-shrink-0 text-right pr-1">{day}</span>
                    {Array.from({ length: 24 }, (_, h) => {
                      const val = matrix[di]?.[h] ?? 0;
                      const intensity = val / maxVal;
                      return (
                        <div key={h} className="flex-1 aspect-square rounded-sm transition-all"
                          style={{ background: `${color}${Math.round(intensity * 220 + 12).toString(16).padStart(2, "0")}` }}
                          title={`${day} ${h}:00 — engagement ${(val * 100).toFixed(1)}%`}
                        />
                      );
                    })}
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[9px] text-[var(--text-muted)]">Low</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 8 }, (_, i) => (
                      <div key={i} className="w-4 h-2.5 rounded-sm"
                        style={{ background: `${color}${Math.round((i / 7) * 220 + 12).toString(16).padStart(2, "0")}` }} />
                    ))}
                  </div>
                  <span className="text-[9px] text-[var(--text-muted)]">High</span>
                </div>
              </div>
            </div>
          );
        })()}
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
                      : result.info
                      ? "bg-[rgba(59,130,246,0.08)] text-[#60A5FA] border border-[rgba(59,130,246,0.15)]"
                      : "bg-[rgba(52,211,153,0.08)] text-[#34D399] border border-[rgba(52,211,153,0.15)]"
                  }`}>
                    {result.errors.length > 0
                      ? result.errors[0].slice(0, 120)
                      : result.info
                      ? result.info.slice(0, 140)
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
          <span className="text-[#3B82F6]">LinkedIn</span> — verifies your OAuth token is live. Post history read-access requires LinkedIn&apos;s Marketing Developer Platform tier; timing predictions use industry-standard engagement curves already in the DB (1 000+ data points).{" "}
          After syncing Reddit + YouTube, re-run <code className="font-mono text-[10px] bg-white/5 px-1 py-0.5 rounded">python scripts/train_models.py</code> to retrain LightGBM on the real data.
        </div>
      </section>

      {/* ── Schedule Post Modal ───────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
          <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl p-6">
            {/* Modal header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.25)] flex items-center justify-center">
                  <Send size={14} className="text-[#60A5FA]" />
                </div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Schedule Post</h2>
              </div>
              <button onClick={() => { setShowModal(false); setModalError(null); setModalSuccess(null); }}
                className="p-1.5 hover:bg-white/5 rounded-lg text-[var(--text-muted)] transition-colors">
                <X size={16} />
              </button>
            </div>

            {modalSuccess ? (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-12 h-12 rounded-full bg-[rgba(52,211,153,0.12)] border border-[rgba(52,211,153,0.3)] flex items-center justify-center">
                  <CheckCircle2 size={22} className="text-[#34D399]" />
                </div>
                <p className="text-sm text-[#34D399] text-center font-medium">{modalSuccess}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Title */}
                <div>
                  <label className="text-[11px] font-medium text-[var(--text-muted)] mb-1.5 block">Title <span className="text-[#F87171]">*</span></label>
                  <input value={modalTitle} onChange={e => setModalTitle(e.target.value)}
                    placeholder="Post title or headline…"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[#3B82F6] transition-colors" />
                </div>

                {/* Body */}
                <div>
                  <label className="text-[11px] font-medium text-[var(--text-muted)] mb-1.5 block">Body <span className="text-[var(--text-muted)]">(optional)</span></label>
                  <textarea value={modalBody} onChange={e => setModalBody(e.target.value)}
                    rows={3} placeholder="Post content…"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[#3B82F6] transition-colors resize-none" />
                </div>

                {/* Content type + options row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-[var(--text-muted)] mb-1.5 block">Content type</label>
                    <select value={modalType} onChange={e => setModalType(e.target.value as ContentType)}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[#3B82F6] transition-colors">
                      {(["text","thread","article","image","carousel","video","email"] as ContentType[]).map(t => (
                        <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2 justify-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div onClick={() => setModalEvergreen(v => !v)}
                        className={`w-8 h-4 rounded-full transition-colors flex items-center ${modalEvergreen ? "bg-[#34D399]" : "bg-white/10"}`}>
                        <div className={`w-3 h-3 rounded-full bg-white transition-transform mx-0.5 ${modalEvergreen ? "translate-x-4" : "translate-x-0"}`} />
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)]">Evergreen</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div onClick={() => setModalTimeSensitive(v => !v)}
                        className={`w-8 h-4 rounded-full transition-colors flex items-center ${modalTimeSensitive ? "bg-[#FBBF24]" : "bg-white/10"}`}>
                        <div className={`w-3 h-3 rounded-full bg-white transition-transform mx-0.5 ${modalTimeSensitive ? "translate-x-4" : "translate-x-0"}`} />
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)]">Time sensitive</span>
                    </label>
                  </div>
                </div>

                {/* Platforms */}
                <div>
                  <label className="text-[11px] font-medium text-[var(--text-muted)] mb-2 block">Platforms <span className="text-[#F87171]">*</span></label>
                  <div className="flex flex-wrap gap-2">
                    {(["linkedin","youtube","reddit","twitter","instagram"] as const).map(p => {
                      const color = PLATFORM_COLORS[p] ?? "#525968";
                      const selected = modalPlatforms.includes(p);
                      const label = { linkedin:"LinkedIn", youtube:"YouTube", reddit:"Reddit", twitter:"Twitter", instagram:"Instagram" }[p];
                      return (
                        <button key={p} type="button"
                          onClick={() => setModalPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all"
                          style={selected ? { background: `${color}20`, color, border: `1px solid ${color}50` } : { background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                        >{label}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Error */}
                {modalError && (
                  <div className="flex items-center gap-2 text-xs text-[#F87171] bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] rounded-lg px-3 py-2">
                    <AlertCircle size={12} /> {modalError}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={() => { setShowModal(false); setModalError(null); }}
                    className="flex-1 py-2 text-sm rounded-lg bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleScheduleSubmit} disabled={modalSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg bg-[#3B82F6] hover:bg-[#60A5FA] text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                    {modalSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
                    {modalSubmitting ? "Scheduling…" : "Schedule"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
