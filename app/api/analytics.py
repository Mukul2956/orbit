"""
/api/v1/analytics – performance metrics, audience heat-maps, algorithm changes.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.ml.pattern_analyzer import PatternAnalyzer
from app.schemas.distribution import (
    AlgorithmChangeResponse,
    AnalyticsSummary,
    AudienceHeatmapPoint,
)
from app.services.algorithm_monitor import AlgorithmMonitor

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])


@router.get("/performance/{user_id}", response_model=AnalyticsSummary)
async def get_performance_summary(
    user_id: uuid.UUID,
    platform: str | None = None,
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregated performance metrics for a user."""
    from app.models.platform_performance import PlatformPerformance

    stmt = select(PlatformPerformance).where(
        PlatformPerformance.user_id == user_id,
        PlatformPerformance.recorded_at >= datetime.utcnow() - timedelta(days=days),
    )
    if platform:
        stmt = stmt.where(PlatformPerformance.platform == platform)

    result = await db.execute(stmt)
    rows = result.scalars().all()

    if not rows:
        return AnalyticsSummary(
            total_published=0, total_failed=0, avg_engagement_score=0.0,
            top_platform=None, heatmap=[],
        )

    from app.models.distribution_log import DistributionLog

    log_stmt = select(DistributionLog).where(
        DistributionLog.platform.is_not(None),
        DistributionLog.timestamp >= datetime.utcnow() - timedelta(days=days),
    )
    log_result = await db.execute(log_stmt)
    logs = log_result.scalars().all()

    total_published = sum(1 for l in logs if l.action == "success")
    total_failed = sum(1 for l in logs if l.action == "failed")

    avg_eng = sum(r.engagement_score for r in rows) / len(rows)

    platform_counts: dict[str, int] = {}
    for r in rows:
        platform_counts[r.platform] = platform_counts.get(r.platform, 0) + 1
    top_platform = max(platform_counts, key=platform_counts.get) if platform_counts else None

    return AnalyticsSummary(
        total_published=total_published,
        total_failed=total_failed,
        avg_engagement_score=round(avg_eng, 4),
        top_platform=top_platform,
        heatmap=[],
    )


@router.get("/heatmap/{user_id}", response_model=list[AudienceHeatmapPoint])
async def get_audience_heatmap(
    user_id: uuid.UUID,
    platform: str = "linkedin",
    db: AsyncSession = Depends(get_db),
):
    """Return a 7×24 engagement heat-map for audience timing optimisation."""
    from app.models.audience_pattern import AudiencePattern

    stmt = select(AudiencePattern).where(
        AudiencePattern.user_id == user_id,
        AudiencePattern.platform == platform,
        AudiencePattern.time_slot >= datetime.utcnow() - timedelta(days=90),
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()

    patterns = [
        {"time_slot": r.time_slot, "engagement_rate": r.engagement_rate, "reach": r.reach}
        for r in rows
    ]

    analyzer = PatternAnalyzer()
    heatmap = analyzer.build_heatmap(patterns)
    return heatmap


@router.get("/dashboard/{user_id}")
async def get_dashboard_stats(
    user_id: uuid.UUID,
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """One-shot endpoint for the Orbit dashboard header stats."""
    from sqlalchemy import func as sqlfunc
    from app.models.content_queue import ContentQueue
    from app.models.distribution_log import DistributionLog
    from app.models.platform_performance import PlatformPerformance

    log_stmt = select(sqlfunc.count()).select_from(DistributionLog).where(
        DistributionLog.action == "success",
        DistributionLog.timestamp >= datetime.utcnow() - timedelta(days=days),
    )
    published = (await db.execute(log_stmt)).scalar_one()

    sched_stmt = select(sqlfunc.count()).select_from(ContentQueue).where(
        ContentQueue.user_id == user_id,
        ContentQueue.status.in_(["pending", "scheduled"]),
    )
    scheduled = (await db.execute(sched_stmt)).scalar_one()

    perf_stmt = select(PlatformPerformance).where(
        PlatformPerformance.user_id == user_id,
        PlatformPerformance.recorded_at >= datetime.utcnow() - timedelta(days=days),
    )
    perf_rows = (await db.execute(perf_stmt)).scalars().all()
    avg_eng = round(sum(r.engagement_score for r in perf_rows) / len(perf_rows), 4) if perf_rows else 0.0
    platform_counts: dict[str, int] = {}
    for r in perf_rows:
        platform_counts[r.platform] = platform_counts.get(r.platform, 0) + 1
    top_platform = max(platform_counts, key=platform_counts.get) if platform_counts else None

    return {
        "total_published": published,
        "total_scheduled": scheduled,
        "avg_engagement_score": avg_eng,
        "top_platform": top_platform,
    }


@router.get("/algorithm-changes/{platform}", response_model=list[AlgorithmChangeResponse])
async def get_algorithm_changes(
    platform: str,
    days: int = Query(default=7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    """Return detected algorithm changes for a platform in the last N days."""
    monitor = AlgorithmMonitor(db)
    changes = await monitor.get_recent_changes(platform, days=days)
    return changes


@router.post("/detect-changes/{platform}")
async def trigger_algorithm_detection(
    platform: str,
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger algorithm change detection for a platform."""
    monitor = AlgorithmMonitor(db)
    changes = await monitor.detect_changes(platform)
    return {"platform": platform, "detected": len(changes), "changes": changes}
