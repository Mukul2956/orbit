/**
 * ORBIT API client
 * Typed wrappers around the FastAPI backend.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RedditPost {
  id: string;
  title: string;
  subreddit: string;
  author: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  url: string;
  created_utc: number;
  is_self: boolean;
  selftext: string;
  thumbnail: string | null;
  flair: string | null;
}

export interface RedditTrendingResponse {
  subreddit: string;
  sort: string;
  timeframe: string;
  count: number;
  posts: RedditPost[];
}

export interface PlatformStatus {
  platform: string;
  status: "connected" | "auth_expired" | "not_connected";
  account_name: string | null;
  account_id: string | null;
}

export interface PlatformStatusResponse {
  user_id: string;
  platforms: PlatformStatus[];
}

export interface YouTubeVideo {
  id: string;
  kind: string;
  title: string;
  channel: string;
  published_at: string;
  description: string;
  thumbnail: string | null;
  url: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
}

export interface YouTubeSearchResponse {
  query: string;
  count: number;
  results: YouTubeVideo[];
}

export interface YouTubeTrendingResponse {
  region_code: string;
  count: number;
  results: YouTubeVideo[];
}

// ─── Reddit ───────────────────────────────────────────────────────────────────

export async function fetchRedditTrending(opts?: {
  subreddit?: string;
  q?: string;
  sort?: "hot" | "new" | "top" | "rising";
  limit?: number;
  timeframe?: "hour" | "day" | "week" | "month" | "year" | "all";
}): Promise<RedditTrendingResponse> {
  const params = new URLSearchParams({
    subreddit: opts?.subreddit ?? "all",
    q: opts?.q ?? "",
    sort: opts?.sort ?? "hot",
    limit: String(opts?.limit ?? 15),
    timeframe: opts?.timeframe ?? "month",
  });
  const res = await fetch(`${API_BASE}/api/v1/reddit/trending?${params}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Reddit API error ${res.status}`);
  return res.json();
}

// ─── Platforms / OAuth ───────────────────────────────────────────────────────

export async function fetchPlatformStatus(userId: string): Promise<PlatformStatusResponse> {
  const res = await fetch(`${API_BASE}/api/v1/platforms/status/${userId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Platform status API error ${res.status}`);
  return res.json();
}

export async function getOAuthUrl(
  platform: "youtube" | "linkedin",
  userId: string
): Promise<string> {
  const res = await fetch(
    `${API_BASE}/api/v1/auth/${platform}/connect?user_id=${userId}`
  );
  if (!res.ok) throw new Error(`OAuth URL error ${res.status}`);
  const data = await res.json();
  return data.auth_url as string;
}

export async function disconnectPlatform(userId: string, platform: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/platforms/${userId}/${platform}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Disconnect failed: ${res.status}`);
}

// ─── YouTube ─────────────────────────────────────────────────────────────────

export async function searchYouTube(opts: {
  q: string;
  maxResults?: number;
  order?: "relevance" | "date" | "viewCount" | "rating";
}): Promise<YouTubeSearchResponse> {
  const params = new URLSearchParams({
    q: opts.q,
    max_results: String(opts.maxResults ?? 10),
    order: opts.order ?? "relevance",
  });
  const res = await fetch(`${API_BASE}/api/v1/youtube/search?${params}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`YouTube search error ${res.status}`);
  return res.json();
}

export async function fetchYouTubeTrending(opts?: {
  regionCode?: string;
  categoryId?: string;
  maxResults?: number;
}): Promise<YouTubeTrendingResponse> {
  const params = new URLSearchParams({
    region_code: opts?.regionCode ?? "US",
    category_id: opts?.categoryId ?? "0",
    max_results: String(opts?.maxResults ?? 10),
  });
  const res = await fetch(`${API_BASE}/api/v1/youtube/trending?${params}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`YouTube trending error ${res.status}`);
  return res.json();
}

// ─── Queue ────────────────────────────────────────────────────────────────────

export interface QueueEntry {
  queue_id: string;
  content_id: string;
  user_id: string;
  platforms: string[];
  status: string;
  scheduled_time: string | null;
  priority: number;
  created_at: string;
}

export async function fetchUserQueue(
  userId: string,
  status?: string
): Promise<QueueEntry[]> {
  const params = new URLSearchParams({ ...(status ? { status } : {}) });
  const res = await fetch(
    `${API_BASE}/api/v1/queue/user/${userId}?${params}`
  );
  if (!res.ok) throw new Error(`Queue API error ${res.status}`);
  return res.json();
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  total_published: number;
  total_failed: number;
  avg_engagement_score: number;
  top_platform: string | null;
}

export async function fetchAnalyticsSummary(
  userId: string,
  days = 30
): Promise<AnalyticsSummary> {
  const res = await fetch(
    `${API_BASE}/api/v1/analytics/performance/${userId}?days=${days}`
  );
  if (!res.ok) throw new Error(`Analytics API error ${res.status}`);
  return res.json();
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export interface OptimalTimeResponse {
  platform: string;
  optimal_time: string;
  confidence_score: number;
  is_default_time: boolean;
  reasoning: string | null;
}

export async function fetchOptimalTime(
  userId: string,
  platform: string,
  contentType = "general"
): Promise<OptimalTimeResponse> {
  const params = new URLSearchParams({
    user_id: userId,
    platform,
    content_type: contentType,
  });
  const res = await fetch(
    `${API_BASE}/api/v1/schedule/optimal-time?${params}`
  );
  if (!res.ok) throw new Error(`Schedule API error ${res.status}`);
  return res.json();
}

// ─── Data Ingestion ──────────────────────────────────────────────────────────

export interface IngestResult {
  platform: string;
  rows_inserted: number;
  errors: string[];
}

export interface IngestAllResult {
  total_rows_inserted: number;
  reddit: IngestResult;
  youtube: IngestResult;
  linkedin: IngestResult;
}

export interface IngestStatus {
  user_id: string;
  audience_patterns: Record<string, number>;
  platform_performance: Record<string, number>;
  total_audience_patterns: number;
  total_platform_performance: number;
  ml_threshold: number;
  ml_ready: Record<string, boolean>;
}

export async function triggerIngest(
  userId: string,
  platform: "reddit" | "youtube" | "linkedin" | "all",
  opts: Record<string, string> = {}
): Promise<IngestResult | IngestAllResult> {
  const params = new URLSearchParams({ user_id: userId, ...opts });
  const res = await fetch(
    `${API_BASE}/api/v1/ingest/${platform}?${params}`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error(`Ingest API error ${res.status}`);
  return res.json();
}

export async function fetchIngestStatus(userId: string): Promise<IngestStatus> {
  const res = await fetch(`${API_BASE}/api/v1/ingest/status/${userId}`);
  if (!res.ok) throw new Error(`Ingest status API error ${res.status}`);
  return res.json();
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  total_published: number;
  total_scheduled: number;
  avg_engagement_score: number;
  top_platform: string | null;
}

export async function fetchDashboardStats(
  userId: string,
  days = 30
): Promise<DashboardStats> {
  const res = await fetch(
    `${API_BASE}/api/v1/analytics/dashboard/${userId}?days=${days}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Dashboard stats API error ${res.status}`);
  return res.json();
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

export interface HeatmapPoint {
  day_of_week: number;   // 0 = Mon … 6 = Sun
  hour_of_day: number;   // 0–23
  avg_engagement: number;
}

export async function fetchHeatmap(
  userId: string,
  platform = "linkedin"
): Promise<HeatmapPoint[]> {
  const res = await fetch(
    `${API_BASE}/api/v1/analytics/heatmap/${userId}?platform=${platform}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Heatmap API error ${res.status}`);
  return res.json();
}

// ─── Content Drafts ───────────────────────────────────────────────────────────

export type ContentType = "text" | "image" | "video" | "carousel" | "thread" | "article" | "email";
export type DraftStatus  = "draft" | "queued" | "published" | "archived";

export interface DraftResponse {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  content_type: ContentType;
  status: DraftStatus;
  is_evergreen: boolean;
  is_time_sensitive: boolean;
  created_at: string;
  updated_at: string;
}

export interface QueuedDraftResponse {
  draft: DraftResponse;
  optimal_publish_time: string | null;
  platforms: string[];
  queue_id: string | null;
}

export async function createDraft(body: {
  user_id: string;
  title: string;
  body?: string;
  content_type?: ContentType;
  is_evergreen?: boolean;
  is_time_sensitive?: boolean;
}): Promise<DraftResponse> {
  const res = await fetch(`${API_BASE}/api/v1/content/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Create draft error ${res.status}`);
  return res.json();
}

export async function queueDraft(
  contentId: string,
  opts: { platforms: string[]; is_time_sensitive?: boolean }
): Promise<QueuedDraftResponse> {
  const res = await fetch(`${API_BASE}/api/v1/content/${contentId}/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw new Error(`Queue draft error ${res.status}`);
  return res.json();
}

export async function fetchUserDrafts(userId: string): Promise<DraftResponse[]> {
  const res = await fetch(`${API_BASE}/api/v1/content/user/${userId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Fetch drafts error ${res.status}`);
  return res.json();
}
