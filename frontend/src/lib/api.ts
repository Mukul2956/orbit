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
    // Next.js: revalidate every 5 minutes
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Reddit API error ${res.status}`);
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
