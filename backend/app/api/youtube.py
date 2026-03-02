"""
/api/v1/youtube – Public YouTube Data API v3 endpoints (API key only, no OAuth).

These are read-only endpoints for displaying YouTube insights in the Orbit UI.
"""

from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/youtube", tags=["YouTube"])

_YT_BASE = "https://www.googleapis.com/youtube/v3"


@router.get("/search")
async def search_videos(
    q: str = Query(..., description="Search query"),
    max_results: int = Query(default=10, ge=1, le=50),
    order: str = Query(default="relevance", description="relevance | date | viewCount | rating"),
    video_type: str = Query(default="video", description="video | channel | playlist"),
):
    """
    Search YouTube using the public Data API v3 (API key only).
    Returns video metadata including title, channel, view count, and thumbnails.
    """
    if not settings.YOUTUBE_API_KEY:
        raise HTTPException(status_code=503, detail="YOUTUBE_API_KEY not configured")

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Step 1: search
        search_resp = await client.get(
            f"{_YT_BASE}/search",
            params={
                "key": settings.YOUTUBE_API_KEY,
                "q": q,
                "part": "snippet",
                "type": video_type,
                "maxResults": max_results,
                "order": order,
            },
        )
        if search_resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"YouTube API error: {search_resp.text}")

        search_data = search_resp.json()
        items = search_data.get("items", [])

        # Step 2: fetch statistics for the video IDs found
        video_ids = [
            item["id"]["videoId"]
            for item in items
            if item.get("id", {}).get("kind") == "youtube#video"
        ]

        stats_by_id: dict[str, dict] = {}
        if video_ids:
            stats_resp = await client.get(
                f"{_YT_BASE}/videos",
                params={
                    "key": settings.YOUTUBE_API_KEY,
                    "id": ",".join(video_ids),
                    "part": "statistics,contentDetails",
                },
            )
            if stats_resp.status_code == 200:
                for v in stats_resp.json().get("items", []):
                    stats_by_id[v["id"]] = v.get("statistics", {})

    results = []
    for item in items:
        kind = item.get("id", {}).get("kind", "")
        vid_id = item["id"].get("videoId") or item["id"].get("channelId") or item["id"].get("playlistId")
        snippet = item.get("snippet", {})
        thumbs = snippet.get("thumbnails", {})
        thumb = (
            thumbs.get("maxres", {}).get("url")
            or thumbs.get("standard", {}).get("url")
            or thumbs.get("default", {}).get("url")  # default (120x90) always exists
        )
        stats = stats_by_id.get(vid_id, {})
        results.append({
            "id": vid_id,
            "kind": kind,
            "title": snippet.get("title"),
            "channel": snippet.get("channelTitle"),
            "published_at": snippet.get("publishedAt"),
            "description": (snippet.get("description") or "")[:200],
            "thumbnail": thumb,
            "url": f"https://www.youtube.com/watch?v={vid_id}" if "video" in kind else None,
            "view_count": int(stats.get("viewCount", 0)),
            "like_count": int(stats.get("likeCount", 0)),
            "comment_count": int(stats.get("commentCount", 0)),
        })

    logger.info("YouTube search '%s' returned %d results", q, len(results))
    return {"query": q, "count": len(results), "results": results}


@router.get("/trending")
async def get_trending_videos(
    region_code: str = Query(default="US"),
    category_id: str = Query(default="0", description="0=all, 28=science&tech, 24=entertainment"),
    max_results: int = Query(default=10, ge=1, le=50),
):
    """Fetch YouTube trending videos for a region (API key only)."""
    if not settings.YOUTUBE_API_KEY:
        raise HTTPException(status_code=503, detail="YOUTUBE_API_KEY not configured")

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{_YT_BASE}/videos",
            params={
                "key": settings.YOUTUBE_API_KEY,
                "part": "snippet,statistics",
                "chart": "mostPopular",
                "regionCode": region_code,
                "videoCategoryId": category_id,
                "maxResults": max_results,
            },
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"YouTube API error: {resp.text}")

    items = resp.json().get("items", [])
    results = []
    for item in items:
        snippet = item.get("snippet", {})
        stats = item.get("statistics", {})
        thumbs = snippet.get("thumbnails", {})
        thumb = (
            thumbs.get("maxres", {}).get("url")
            or thumbs.get("standard", {}).get("url")
            or thumbs.get("default", {}).get("url")  # default (120x90) always exists
        )
        results.append({
            "id": item["id"],
            "title": snippet.get("title"),
            "channel": snippet.get("channelTitle"),
            "published_at": snippet.get("publishedAt"),
            "thumbnail": thumb,
            "url": f"https://www.youtube.com/watch?v={item['id']}",
            "view_count": int(stats.get("viewCount", 0)),
            "like_count": int(stats.get("likeCount", 0)),
            "comment_count": int(stats.get("commentCount", 0)),
        })

    return {"region_code": region_code, "count": len(results), "results": results}
