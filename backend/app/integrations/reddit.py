"""
Reddit integration via Reddit's public JSON API (no credentials required).

Uses https://www.reddit.com/r/<subreddit>/search.json and related public
endpoints – no OAuth, no PRAW, no Reddit app registration needed.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_REDDIT_BASE = "https://www.reddit.com"
_HEADERS = {"User-Agent": "ORBIT/1.0 (content distribution analytics)"}


class RedditPublicClient:
    """
    Read-only Reddit client using the public .json API.
    No credentials required.
    """

    async def fetch_posts(
        self,
        subreddit: str = "all",
        q: str = "",
        sort: str = "hot",
        limit: int = 25,
        timeframe: str = "month",
    ) -> list[dict[str, Any]]:
        """
        Fetch trending/search posts from a subreddit.

        Args:
            subreddit:  Subreddit name (without r/).  Use "all" for all of Reddit.
            q:          Search query. When non-empty, hits /search.json.
                        When empty, hits /<sort>.json directly (hot/new/top/rising).
            sort:       "hot" | "new" | "top" | "rising"
            limit:      Number of posts (1–100).
            timeframe:  "hour" | "day" | "week" | "month" | "year" | "all"
        """
        if q.strip():
            url = f"{_REDDIT_BASE}/r/{subreddit}/search.json"
            params: dict[str, Any] = {
                "q": q,
                "sort": sort,
                "limit": limit,
                "t": timeframe,
                "restrict_sr": 1,
            }
        else:
            url = f"{_REDDIT_BASE}/r/{subreddit}/{sort}.json"
            params = {"limit": limit, "t": timeframe}

        async with httpx.AsyncClient(headers=_HEADERS, timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        posts: list[dict[str, Any]] = []
        for child in data.get("data", {}).get("children", []):
            p = child.get("data", {})
            thumbnail = p.get("thumbnail", "")
            posts.append(
                {
                    "id": p.get("id"),
                    "title": p.get("title"),
                    "subreddit": p.get("subreddit"),
                    "author": p.get("author"),
                    "score": p.get("score", 0),
                    "upvote_ratio": p.get("upvote_ratio", 0.0),
                    "num_comments": p.get("num_comments", 0),
                    "url": f"https://www.reddit.com{p.get('permalink', '')}",
                    "created_utc": p.get("created_utc"),
                    "is_self": p.get("is_self", True),
                    "selftext": (p.get("selftext") or "")[:300],
                    "thumbnail": thumbnail if thumbnail.startswith("http") else None,
                    "flair": p.get("link_flair_text"),
                }
            )

        logger.info("Fetched %d posts from r/%s (q=%r)", len(posts), subreddit, q)
        return posts
