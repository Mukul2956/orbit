"""
data_ingestion.py – pulls real engagement + timing data from Reddit, YouTube,
and LinkedIn, then stores it into:
  • audience_patterns  (feeds Prophet / TimingEngine)
  • platform_performance  (feeds analytics + PriorityCalculator)

How each platform works
------------------------
Reddit   — public JSON API, zero credentials required.
           Pulls top/hot posts from a list of subreddits.
           Derives: posting hour/day from created_utc, engagement from score + comments.

YouTube  — YouTube Data API v3.  Requires YOUTUBE_API_KEY (read-only key, no OAuth).
           Pulls the trending-videos chart + optional keyword search.
           Derives: posting hour/day from publishedAt, engagement from viewCount/likeCount/commentCount.

LinkedIn — LinkedIn API v2.  Requires the user's OAuth access_token stored in platform_configs.
           Pulls the user's own UGC posts + per-post social actions (likes, comments).
           If no token is stored the endpoint returns a clear message and skips gracefully.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.audience_pattern import AudiencePattern
from app.models.platform_config import PlatformConfig
from app.models.platform_performance import PlatformPerformance

logger = logging.getLogger(__name__)

# ─── constants ────────────────────────────────────────────────────────────────

_REDDIT_HEADERS = {"User-Agent": "ORBIT/1.0 (engagement analytics)"}
_YT_BASE = "https://www.googleapis.com/youtube/v3"
_LI_BASE = "https://api.linkedin.com/v2"

# Default subreddits to harvest when none supplied by the caller
DEFAULT_SUBREDDITS = [
    "entrepreneur", "startups", "marketing", "content_marketing",
    "socialmedia", "digitalmarketing", "smallbusiness",
]

# Number of posts collected per subreddit call
REDDIT_LIMIT = 50

# Max videos per YouTube trending fetch (max 50 per API call without paging)
YOUTUBE_LIMIT = 50

# Max posts to fetch from LinkedIn (per author)
LINKEDIN_LIMIT = 50


# ─── helpers ─────────────────────────────────────────────────────────────────

def _safe_int(v: Any, default: int = 0) -> int:
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def _safe_float(v: Any, default: float = 0.0) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _utc_from_ts(ts: float) -> datetime:
    return datetime.fromtimestamp(ts, tz=timezone.utc)


def _utc_from_iso(s: str) -> datetime | None:
    """Parse an ISO-8601 string that may end with 'Z' or contain offset."""
    if not s:
        return None
    try:
        s = s.rstrip("Z")
        if "+" in s:
            s = s.split("+")[0]
        return datetime.fromisoformat(s).replace(tzinfo=timezone.utc)
    except ValueError:
        return None


# ─── DataIngestionService ──────────────────────────────────────────────────

class DataIngestionService:
    """
    Orchestrates data collection across platforms and persists results to DB.

    Usage:
        svc = DataIngestionService(db_session)
        result = await svc.ingest_reddit(user_id=uuid, subreddits=["technology"])
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── internal write helpers ────────────────────────────────────────────

    async def _upsert_audience_pattern(
        self,
        user_id: uuid.UUID,
        platform: str,
        time_slot: datetime,
        engagement_rate: float,
        reach: int,
        interactions: int,
    ) -> None:
        """Insert a single audience-pattern row (no dedup – append-only)."""
        row = AudiencePattern(
            user_id=user_id,
            platform=platform,
            time_slot=time_slot,
            engagement_rate=min(engagement_rate, 1.0),
            reach=reach,
            interactions=interactions,
        )
        self.db.add(row)

    async def _upsert_platform_performance(
        self,
        user_id: uuid.UUID,
        platform: str,
        post_id: str,
        post_url: str,
        publish_time: datetime,
        content_type: str,
        likes: int,
        comments: int,
        shares: int,
        reach: int,
        engagement_score: float,
        raw: dict,
    ) -> None:
        """Insert a platform-performance row."""
        row = PlatformPerformance(
            user_id=user_id,
            content_id=uuid.uuid4(),   # synthetic – we're tracking *external* posts
            platform=platform,
            content_type=content_type,
            actual_publish_time=publish_time,
            likes=likes,
            comments=comments,
            shares=shares,
            reach=reach,
            engagement_score=round(min(engagement_score, 1.0), 6),
            post_id=post_id,
            post_url=post_url,
            performance_metrics=raw,
        )
        self.db.add(row)

    # ── Reddit ───────────────────────────────────────────────────────────

    async def ingest_reddit(
        self,
        user_id: uuid.UUID,
        subreddits: list[str] | None = None,
        sort: str = "top",
        timeframe: str = "month",
    ) -> dict[str, Any]:
        """
        Fetch top posts from subreddits → store audience_patterns + platform_performance.

        Engagement formula
        ------------------
        estimated_impressions ≈ score / upvote_ratio * 10
        engagement_rate       = (score + comments) / max(impressions, 1)
        """
        subs = subreddits or DEFAULT_SUBREDDITS
        inserted = 0
        errors: list[str] = []

        async with httpx.AsyncClient(headers=_REDDIT_HEADERS, timeout=15.0) as client:
            for sub in subs:
                try:
                    url = f"https://www.reddit.com/r/{sub}/{sort}.json"
                    params: dict[str, Any] = {"limit": REDDIT_LIMIT, "t": timeframe}
                    resp = await client.get(url, params=params)
                    resp.raise_for_status()
                    children = resp.json().get("data", {}).get("children", [])
                except Exception as exc:
                    errors.append(f"reddit/{sub}: {exc}")
                    logger.warning("Reddit fetch failed for r/%s: %s", sub, exc)
                    continue

                for child in children:
                    p = child.get("data", {})
                    created_ts = _safe_float(p.get("created_utc"))
                    if not created_ts:
                        continue

                    score = _safe_int(p.get("score", 0))
                    ratio = _safe_float(p.get("upvote_ratio", 0.5)) or 0.5
                    num_comments = _safe_int(p.get("num_comments", 0))

                    # Estimate impressions from score + ratio
                    estimated_upvotes = score / ratio            # total upvotes (before downvotes)
                    impressions = max(int(estimated_upvotes * 10), score + 1)
                    interactions = score + num_comments
                    eng_rate = interactions / impressions

                    publish_time = _utc_from_ts(created_ts)
                    post_id = p.get("id", "")
                    permalink = p.get("permalink", "")
                    post_url = f"https://www.reddit.com{permalink}"

                    await self._upsert_audience_pattern(
                        user_id=user_id,
                        platform="reddit",
                        time_slot=publish_time,
                        engagement_rate=eng_rate,
                        reach=impressions,
                        interactions=interactions,
                    )
                    await self._upsert_platform_performance(
                        user_id=user_id,
                        platform="reddit",
                        post_id=post_id,
                        post_url=post_url,
                        publish_time=publish_time,
                        content_type="text" if p.get("is_self") else "link",
                        likes=score,
                        comments=num_comments,
                        shares=0,
                        reach=impressions,
                        engagement_score=eng_rate,
                        raw={
                            "subreddit": p.get("subreddit"),
                            "title": p.get("title", "")[:200],
                            "score": score,
                            "upvote_ratio": ratio,
                            "num_comments": num_comments,
                        },
                    )
                    inserted += 1

        await self.db.commit()
        logger.info("Reddit ingestion: %d rows inserted for user %s", inserted, user_id)
        return {"platform": "reddit", "rows_inserted": inserted, "errors": errors}

    # ── YouTube ──────────────────────────────────────────────────────────

    async def ingest_youtube(
        self,
        user_id: uuid.UUID,
        region_code: str = "US",
        category_id: str = "",
        keyword: str = "",
    ) -> dict[str, Any]:
        """
        Fetch YouTube trending videos or keyword search results → store patterns + performance.

        Engagement formula
        ------------------
        engagement_rate = (likeCount + commentCount) / max(viewCount, 1)
        reach           = viewCount
        """
        if not settings.YOUTUBE_API_KEY:
            return {
                "platform": "youtube",
                "rows_inserted": 0,
                "errors": ["YOUTUBE_API_KEY not set in .env — add it to enable YouTube ingestion"],
            }

        inserted = 0
        errors: list[str] = []
        video_ids: list[str] = []

        async with httpx.AsyncClient(timeout=15.0) as client:
            # Step 1: get list of video IDs (trending chart or keyword search)
            if keyword:
                try:
                    search_resp = await client.get(
                        f"{_YT_BASE}/search",
                        params={
                            "part": "id",
                            "q": keyword,
                            "type": "video",
                            "maxResults": YOUTUBE_LIMIT,
                            "order": "viewCount",
                            "key": settings.YOUTUBE_API_KEY,
                        },
                    )
                    search_resp.raise_for_status()
                    for item in search_resp.json().get("items", []):
                        vid = item.get("id", {}).get("videoId")
                        if vid:
                            video_ids.append(vid)
                except Exception as exc:
                    errors.append(f"youtube/search: {exc}")
                    logger.warning("YouTube search failed: %s", exc)
            else:
                params: dict[str, Any] = {
                    "part": "id",
                    "chart": "mostPopular",
                    "regionCode": region_code,
                    "maxResults": YOUTUBE_LIMIT,
                    "key": settings.YOUTUBE_API_KEY,
                }
                if category_id:
                    params["videoCategoryId"] = category_id
                try:
                    trend_resp = await client.get(f"{_YT_BASE}/videos", params=params)
                    trend_resp.raise_for_status()
                    for item in trend_resp.json().get("items", []):
                        video_ids.append(item["id"])
                except Exception as exc:
                    errors.append(f"youtube/trending: {exc}")
                    logger.warning("YouTube trending fetch failed: %s", exc)

            if not video_ids:
                return {"platform": "youtube", "rows_inserted": 0, "errors": errors}

            # Step 2: fetch snippet + statistics for all IDs in one call
            try:
                detail_resp = await client.get(
                    f"{_YT_BASE}/videos",
                    params={
                        "part": "snippet,statistics",
                        "id": ",".join(video_ids),
                        "key": settings.YOUTUBE_API_KEY,
                    },
                )
                detail_resp.raise_for_status()
                items = detail_resp.json().get("items", [])
            except Exception as exc:
                errors.append(f"youtube/details: {exc}")
                logger.warning("YouTube details fetch failed: %s", exc)
                return {"platform": "youtube", "rows_inserted": 0, "errors": errors}

        for item in items:
            vid_id = item.get("id", "")
            snippet = item.get("snippet", {})
            stats = item.get("statistics", {})

            published_at = _utc_from_iso(snippet.get("publishedAt", ""))
            if not published_at:
                continue

            views = _safe_int(stats.get("viewCount", 0))
            likes = _safe_int(stats.get("likeCount", 0))
            comments = _safe_int(stats.get("commentCount", 0))
            interactions = likes + comments
            eng_rate = interactions / max(views, 1)

            await self._upsert_audience_pattern(
                user_id=user_id,
                platform="youtube",
                time_slot=published_at,
                engagement_rate=eng_rate,
                reach=views,
                interactions=interactions,
            )
            await self._upsert_platform_performance(
                user_id=user_id,
                platform="youtube",
                post_id=vid_id,
                post_url=f"https://www.youtube.com/watch?v={vid_id}",
                publish_time=published_at,
                content_type="video",
                likes=likes,
                comments=comments,
                shares=0,
                reach=views,
                engagement_score=eng_rate,
                raw={
                    "title": snippet.get("title", "")[:200],
                    "channel": snippet.get("channelTitle", ""),
                    "viewCount": views,
                    "likeCount": likes,
                    "commentCount": comments,
                    "categoryId": snippet.get("categoryId", ""),
                },
            )
            inserted += 1

        await self.db.commit()
        logger.info("YouTube ingestion: %d rows inserted for user %s", inserted, user_id)
        return {"platform": "youtube", "rows_inserted": inserted, "errors": errors}

    # ── LinkedIn ─────────────────────────────────────────────────────────

    async def ingest_linkedin(
        self,
        user_id: uuid.UUID,
        access_token: str | None = None,
    ) -> dict[str, Any]:
        """
        Fetch the user's own LinkedIn UGC posts + per-post social-action counts.

        Scope requirements
        ------------------
        Reading posts (ugcPosts, socialActions) requires the "Share on LinkedIn"
        product to be approved for your LinkedIn App, which grants w_member_social.
        Without that approval only openid / profile / email work (OIDC).

        If posts cannot be read due to insufficient scopes this method returns
        a clear, actionable error instead of a cryptic 403.
        """
        # ── 1. Resolve access token ──────────────────────────────────────
        token = access_token
        if not token:
            stmt = select(PlatformConfig).where(
                PlatformConfig.user_id == user_id,
                PlatformConfig.platform == "linkedin",
                PlatformConfig.is_active.is_(True),
            )
            result = await self.db.execute(stmt)
            cfg = result.scalar_one_or_none()
            if cfg:
                token = cfg.access_token

        if not token:
            return {
                "platform": "linkedin",
                "rows_inserted": 0,
                "errors": [
                    "No LinkedIn OAuth token found. "
                    "Click 'Connect LinkedIn' on the Orbit dashboard first."
                ],
            }

        inserted = 0
        errors: list[str] = []
        headers = {
            "Authorization": f"Bearer {token}",
            "X-Restli-Protocol-Version": "2.0.0",
            "LinkedIn-Version": "202304",
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            # ── 2. Resolve person ID via OIDC userinfo (works with openid+profile) ──
            try:
                ui_resp = await client.get(
                    f"{_LI_BASE}/userinfo",
                    headers={"Authorization": f"Bearer {token}"},
                )
                ui_resp.raise_for_status()
                ui = ui_resp.json()
                person_id = ui.get("sub", "")
                if not person_id:
                    raise ValueError("empty sub in userinfo response")
                author_urn = f"urn:li:person:{person_id}"
            except Exception as exc:
                return {
                    "platform": "linkedin",
                    "rows_inserted": 0,
                    "errors": [f"LinkedIn profile lookup failed: {exc}"],
                }

            # ── 3. Fetch user's UGC posts ────────────────────────────────
            # Requires w_member_social scope ("Share on LinkedIn" product approval).
            # If the token doesn't have that scope LinkedIn returns 403.
            try:
                posts_resp = await client.get(
                    f"{_LI_BASE}/ugcPosts",
                    headers=headers,
                    params={
                        "q": "authors",
                        "authors": f"List({author_urn})",
                        "count": LINKEDIN_LIMIT,
                    },
                )
                if posts_resp.status_code == 403:
                    return {
                        "platform": "linkedin",
                        "rows_inserted": 0,
                        "profile_connected": True,
                        "profile_name": ui.get("name"),
                        "errors": [
                            "LinkedIn account connected ✓  but reading post history requires "
                            "the 'Share on LinkedIn' product to be approved for your LinkedIn App. "
                            "Go to linkedin.com/developers/apps → your app → Products tab → "
                            "request 'Share on LinkedIn'. Once approved (usually instant for test apps), "
                            "reconnect and pull again. Until then the ML models use the seeded training data."
                        ],
                    }
                posts_resp.raise_for_status()
                posts = posts_resp.json().get("elements", [])
            except Exception as exc:
                errors.append(f"linkedin/ugcPosts: {exc}")
                posts = []

            for post in posts:
                post_urn = post.get("id", "")
                if not post_urn:
                    continue

                # created timestamp (epoch ms)
                created_ms = _safe_float(post.get("created", {}).get("time", 0))
                publish_time = _utc_from_ts(created_ms / 1000) if created_ms else None
                if not publish_time:
                    continue

                # ── 4. Social actions (likes + comments) ────────────────
                likes = 0
                comments = 0
                impressions = 0

                try:
                    sa_resp = await client.get(
                        f"{_LI_BASE}/socialActions/{post_urn}",
                        headers=headers,
                    )
                    if sa_resp.status_code == 200:
                        sa = sa_resp.json()
                        likes = _safe_int(sa.get("likesSummary", {}).get("totalLikes", 0))
                        comments = _safe_int(
                            sa.get("commentsSummary", {}).get("totalFirstLevelComments", 0)
                        )
                except Exception as exc:
                    errors.append(f"linkedin/socialActions/{post_urn}: {exc}")

                # ── 5. Share statistics (impressions) ───────────────────
                encoded_urn = post_urn.replace(":", "%3A")
                try:
                    stats_resp = await client.get(
                        f"{_LI_BASE}/organizationalEntityShareStatistics",
                        headers=headers,
                        params={
                            "q": "organizationalEntity",
                            "organizationalEntity": author_urn,
                            "shares[0]": post_urn,
                        },
                    )
                    if stats_resp.status_code == 200:
                        elems = stats_resp.json().get("elements", [])
                        if elems:
                            total_stats = elems[0].get("totalShareStatistics", {})
                            impressions = _safe_int(total_stats.get("impressionCount", 0))
                except Exception:
                    pass  # impressions are optional

                if impressions == 0:
                    impressions = max((likes + comments) * 50, 50)

                interactions = likes + comments
                eng_rate = interactions / impressions

                await self._upsert_audience_pattern(
                    user_id=user_id,
                    platform="linkedin",
                    time_slot=publish_time,
                    engagement_rate=eng_rate,
                    reach=impressions,
                    interactions=interactions,
                )
                await self._upsert_platform_performance(
                    user_id=user_id,
                    platform="linkedin",
                    post_id=post_urn,
                    post_url=f"https://www.linkedin.com/feed/update/{encoded_urn}/",
                    publish_time=publish_time,
                    content_type="text",
                    likes=likes,
                    comments=comments,
                    shares=0,
                    reach=impressions,
                    engagement_score=eng_rate,
                    raw={
                        "post_urn": post_urn,
                        "author_urn": author_urn,
                        "likes": likes,
                        "comments": comments,
                        "impressions": impressions,
                    },
                )
                inserted += 1

        await self.db.commit()
        logger.info("LinkedIn ingestion: %d posts ingested for user %s", inserted, user_id)
        return {"platform": "linkedin", "rows_inserted": inserted, "errors": errors}

    # ── status ─────────────────────────────────────────────────────────

    async def get_status(self, user_id: uuid.UUID) -> dict[str, Any]:
        """Return count of audience_pattern rows per platform for this user."""
        from sqlalchemy import func as sqlfunc

        platforms = ["reddit", "youtube", "linkedin"]
        counts: dict[str, int] = {}
        for platform in platforms:
            stmt = (
                select(sqlfunc.count())
                .select_from(AudiencePattern)
                .where(
                    AudiencePattern.user_id == user_id,
                    AudiencePattern.platform == platform,
                )
            )
            result = await self.db.execute(stmt)
            counts[platform] = result.scalar_one()

        # Also count platform_performance rows
        perf_counts: dict[str, int] = {}
        for platform in platforms:
            stmt = (
                select(sqlfunc.count())
                .select_from(PlatformPerformance)
                .where(
                    PlatformPerformance.user_id == user_id,
                    PlatformPerformance.platform == platform,
                )
            )
            result = await self.db.execute(stmt)
            perf_counts[platform] = result.scalar_one()

        return {
            "user_id": str(user_id),
            "audience_patterns": counts,
            "platform_performance": perf_counts,
            "total_audience_patterns": sum(counts.values()),
            "total_platform_performance": sum(perf_counts.values()),
            "ml_threshold": settings.MIN_DATA_POINTS_FOR_ML,
            "ml_ready": {
                p: counts[p] >= settings.MIN_DATA_POINTS_FOR_ML for p in platforms
            },
        }
