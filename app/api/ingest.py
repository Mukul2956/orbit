"""
/api/v1/ingest – endpoints to pull real engagement data from platforms
and store it into audience_patterns + platform_performance tables.

After ingestion, the TimingEngine (Prophet) and PriorityCalculator (LightGBM)
will automatically use the newly stored rows on their next prediction call.
Re-run `scripts/train_models.py` to retrain LightGBM on the fresh data.
"""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.data_ingestion import DataIngestionService

router = APIRouter(prefix="/api/v1/ingest", tags=["Data Ingestion"])


# ─── Reddit ───────────────────────────────────────────────────────────────────

@router.post("/reddit")
async def ingest_reddit(
    user_id: uuid.UUID = Query(description="User UUID to associate data with"),
    subreddits: str = Query(
        default="",
        description="Comma-separated subreddit names (e.g. 'entrepreneur,startups'). "
                    "Leave blank to use the default list.",
    ),
    sort: str = Query(default="top", description="hot | new | top | rising"),
    timeframe: str = Query(default="month", description="hour | day | week | month | year | all"),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Pull top/hot posts from subreddits → audience_patterns + platform_performance.

    No credentials required — uses Reddit's public JSON API.
    Each post's created_utc becomes the time_slot in audience_patterns so the
    TimingEngine can learn which day/hour drives the most engagement.
    """
    subs = [s.strip() for s in subreddits.split(",") if s.strip()] or None
    svc = DataIngestionService(db)
    return await svc.ingest_reddit(user_id=user_id, subreddits=subs, sort=sort, timeframe=timeframe)


# ─── YouTube ─────────────────────────────────────────────────────────────────

@router.post("/youtube")
async def ingest_youtube(
    user_id: uuid.UUID = Query(description="User UUID to associate data with"),
    region_code: str = Query(default="US", description="ISO 3166-1 alpha-2 country code"),
    category_id: str = Query(default="", description="YouTube category ID (e.g. '28' for Tech)"),
    keyword: str = Query(default="", description="Keyword to search instead of trending chart"),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Pull YouTube trending videos (or keyword results) → audience_patterns + platform_performance.

    Requires YOUTUBE_API_KEY in .env (read-only key, no OAuth needed).
    Engagement = (likes + comments) / views per video.
    """
    svc = DataIngestionService(db)
    return await svc.ingest_youtube(
        user_id=user_id,
        region_code=region_code,
        category_id=category_id,
        keyword=keyword,
    )


# ─── LinkedIn ────────────────────────────────────────────────────────────────

@router.post("/linkedin")
async def ingest_linkedin(
    user_id: uuid.UUID = Query(description="User UUID to associate data with"),
    access_token: str = Query(
        default="",
        description="Override OAuth token (optional – leave blank to use the stored token "
                    "from platform_configs for this user)",
    ),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Pull the user's own LinkedIn posts + social-action counts → audience_patterns + platform_performance.

    Requires a LinkedIn OAuth access token with scopes: r_liteprofile, r_member_social.
    If the user has already clicked 'Connect LinkedIn' in the Orbit dashboard, the token
    is already stored and will be used automatically — just supply user_id.
    """
    svc = DataIngestionService(db)
    return await svc.ingest_linkedin(
        user_id=user_id,
        access_token=access_token or None,
    )


# ─── All platforms at once ───────────────────────────────────────────────────

@router.post("/all")
async def ingest_all(
    user_id: uuid.UUID = Query(description="User UUID to associate data with"),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Run Reddit + YouTube + LinkedIn ingestion in sequence.

    Reddit and YouTube run unconditionally.
    LinkedIn runs only if a stored token is found for this user.
    """
    svc = DataIngestionService(db)

    reddit_result = await svc.ingest_reddit(user_id=user_id)
    youtube_result = await svc.ingest_youtube(user_id=user_id)
    linkedin_result = await svc.ingest_linkedin(user_id=user_id)

    total = (
        reddit_result["rows_inserted"]
        + youtube_result["rows_inserted"]
        + linkedin_result["rows_inserted"]
    )

    return {
        "total_rows_inserted": total,
        "reddit": reddit_result,
        "youtube": youtube_result,
        "linkedin": linkedin_result,
    }


# ─── Status ──────────────────────────────────────────────────────────────────

@router.get("/status/{user_id}")
async def ingest_status(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Return how many rows exist in audience_patterns and platform_performance
    for this user, broken down by platform.  Also shows whether each platform
    has enough data for ML predictions (ml_ready flag).
    """
    svc = DataIngestionService(db)
    return await svc.get_status(user_id=user_id)
