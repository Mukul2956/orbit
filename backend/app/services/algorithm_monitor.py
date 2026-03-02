"""
AlgorithmMonitor – detects statistical changes in platform algorithm behaviour.

Uses z-score + Welch's t-test to compare recent vs. historical performance.
Detected changes are stored in algorithm_changes and trigger strategy hints.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import TYPE_CHECKING

import numpy as np
from scipy import stats  # type: ignore

from app.models.algorithm_change import AlgorithmChange

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

ANOMALY_THRESHOLD = 2.5   # standard deviations
P_VALUE_THRESHOLD = 0.05  # significance level
MIN_SAMPLES = 100


class AlgorithmMonitor:
    """
    Monitors per-platform performance metrics and flags possible algorithm
    changes when statistical anomalies are detected.
    """

    def __init__(self, db: "AsyncSession") -> None:
        self.db = db

    # ─── Public API ──────────────────────────────────────────────────────────

    async def detect_changes(
        self,
        platform: str,
        user_id: str | None = None,
        lookback_days: int = 30,
    ) -> list[dict]:
        """
        Analyse performance data for `platform` and return a list of
        detected change dicts.  Empty list means no anomalies found.
        """
        data = await self._fetch_performance(platform, user_id, lookback_days)

        if len(data) < MIN_SAMPLES:
            logger.debug("Not enough data for %s (%d rows).", platform, len(data))
            return []

        metrics = ["engagement_score", "reach", "clicks"]
        detected: list[dict] = []

        for metric in metrics:
            change = self._detect_anomaly(data, metric)
            if change:
                change["platform"] = platform
                detected.append(change)
                await self._record(platform, change)

        return detected

    async def get_recent_changes(
        self, platform: str, days: int = 7
    ) -> list[AlgorithmChange]:
        from sqlalchemy import select

        stmt = (
            select(AlgorithmChange)
            .where(
                AlgorithmChange.platform == platform,
                AlgorithmChange.detected_at >= datetime.utcnow() - timedelta(days=days),
            )
            .order_by(AlgorithmChange.detected_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # ─── Internal helpers ────────────────────────────────────────────────────

    async def _fetch_performance(
        self, platform: str, user_id: str | None, days: int
    ) -> list[dict]:
        from sqlalchemy import select
        from app.models.platform_performance import PlatformPerformance
        import uuid as _uuid

        stmt = select(PlatformPerformance).where(
            PlatformPerformance.platform == platform,
            PlatformPerformance.recorded_at
            >= datetime.utcnow() - timedelta(days=days),
        )
        if user_id:
            try:
                uid = _uuid.UUID(str(user_id))
                stmt = stmt.where(PlatformPerformance.user_id == uid)
            except ValueError:
                pass

        result = await self.db.execute(stmt)
        rows = result.scalars().all()
        return [
            {
                "engagement_score": r.engagement_score,
                "reach": r.reach,
                "clicks": r.clicks,
                "recorded_at": r.recorded_at,
            }
            for r in rows
        ]

    @staticmethod
    def _detect_anomaly(data: list[dict], metric: str) -> dict | None:
        values = [d[metric] for d in data if d.get(metric) is not None]
        if len(values) < MIN_SAMPLES:
            return None

        window = len(values) // 3
        recent = values[-window:]
        historical = values[:-window]

        hist_mean = np.mean(historical)
        hist_std = np.std(historical) or 1e-9
        recent_mean = np.mean(recent)
        z_score = abs((recent_mean - hist_mean) / hist_std)

        if z_score <= ANOMALY_THRESHOLD:
            return None

        _, p_value = stats.ttest_ind(historical, recent)

        if p_value >= P_VALUE_THRESHOLD:
            return None

        change_pct = ((recent_mean - hist_mean) / (hist_mean + 1e-9)) * 100
        return {
            "metric": metric,
            "change_percentage": round(change_pct, 2),
            "z_score": round(z_score, 3),
            "p_value": round(p_value, 5),
            "confidence": round(1 - p_value, 4),
            "direction": "increase" if change_pct > 0 else "decrease",
            "detected_at": datetime.utcnow().isoformat(),
        }

    async def _record(self, platform: str, change: dict) -> None:
        impact = abs(change["change_percentage"]) / 100 * change["confidence"]
        record = AlgorithmChange(
            platform=platform,
            detected_at=datetime.fromisoformat(change["detected_at"]),
            change_type=f"{change['metric']}_anomaly",
            impact_score=round(impact, 4),
            description=(
                f"{change['metric']} {change['direction']} by "
                f"{change['change_percentage']:.1f}% (z={change['z_score']}, "
                f"p={change['p_value']})"
            ),
            adjustments_made={},
        )
        self.db.add(record)
        await self.db.flush()
        logger.info(
            "Algorithm change recorded for %s: %s %s %.1f%%",
            platform, change["metric"], change["direction"], change["change_percentage"],
        )
