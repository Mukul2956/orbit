"""
/api/v1/reddit – Public Reddit data feed (no credentials required).

Wraps Reddit's public .json API so the Orbit frontend can display
trending posts without any OAuth setup.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.integrations.reddit import RedditPublicClient

router = APIRouter(prefix="/api/v1/reddit", tags=["Reddit"])


@router.get("/trending")
async def get_trending_posts(
    subreddit: str = Query(
        default="all",
        description="Subreddit name without r/. Use 'all' for site-wide trending.",
    ),
    q: str = Query(
        default="",
        description="Search query. Leave empty to fetch hot/top posts directly.",
    ),
    sort: str = Query(
        default="hot",
        description="Sort order: hot | new | top | rising",
    ),
    limit: int = Query(default=15, ge=1, le=100),
    timeframe: str = Query(
        default="month",
        description="Time filter: hour | day | week | month | year | all",
    ),
):
    """
    Fetch trending posts from Reddit using the public JSON API.
    No credentials required.

    Example:
        GET /api/v1/reddit/trending?subreddit=python&q=async&sort=hot&limit=10&timeframe=month
    """
    client = RedditPublicClient()
    try:
        posts = await client.fetch_posts(
            subreddit=subreddit,
            q=q,
            sort=sort,
            limit=limit,
            timeframe=timeframe,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Reddit API error: {exc}") from exc

    return {
        "subreddit": subreddit,
        "sort": sort,
        "timeframe": timeframe,
        "count": len(posts),
        "posts": posts,
    }
