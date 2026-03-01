"""
TimingEngine – Predicts the optimal posting time for a piece of content.

Decision flow:
1. Fetch historical audience_patterns for the user+platform from the DB.
2. If >= MIN_DATA_POINTS rows exist, run Prophet to forecast engagement.
3. Otherwise fall back to research-backed industry defaults.
4. Apply platform-specific hard rules (no midnight posts, no LinkedIn weekends…).
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import TYPE_CHECKING

import pandas as pd
import pytz

from app.config import settings

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


# ─── Industry-default best posting times (UTC) ────────────────────────────
PLATFORM_DEFAULTS: dict[str, dict] = {
    "reddit":   {"hour": 10, "min": 0, "avoid_weekends": False},
    "linkedin": {"hour": 8,  "min": 0, "avoid_weekends": True},
    "youtube":  {"hour": 14, "min": 0, "avoid_weekends": False},
}


class TimingEngine:
    """
    Predicts optimal posting times per platform.

    Usage::

        engine = TimingEngine(db_session)
        result = await engine.get_optimal_time(user_id, "reddit", "text")
        print(result["optimal_time"])
    """

    def __init__(self, db: "AsyncSession") -> None:
        self.db = db

    # ─── Public API ──────────────────────────────────────────────────────────

    async def get_optimal_time(
        self,
        user_id: str,
        platform: str,
        content_type: str = "general",
        audience_segment: str | None = None,
        target_tz: str = "UTC",
    ) -> dict:
        """
        Returns::

            {
                "optimal_time": datetime,
                "confidence_score": float,
                "is_default_time": bool,
                "reasoning": str,
            }
        """
        platform = platform.lower()
        patterns = await self._fetch_audience_patterns(user_id, platform, audience_segment)

        if len(patterns) >= settings.MIN_DATA_POINTS_FOR_ML:
            try:
                return await self._predict_with_prophet(patterns, platform, target_tz)
            except Exception as exc:
                logger.warning("Prophet prediction failed (%s); using defaults.", exc)
                return self._get_default_time(
                    platform, target_tz,
                    reason=f"Industry default for {platform} — ML forecast unavailable (Stan backend not configured); {len(patterns)} historical rows available",
                )

        return self._get_default_time(platform, target_tz)

    async def get_top_slots(
        self,
        user_id: str,
        platform: str,
        n: int = 5,
    ) -> list[dict]:
        """Return the top-n ranked posting slots for the next 7 days."""
        platform = platform.lower()
        patterns = await self._fetch_audience_patterns(user_id, platform)

        if len(patterns) < settings.MIN_DATA_POINTS_FOR_ML:
            base = self._get_default_time(platform)["optimal_time"]
            return [
                {"rank": i + 1, "time": base + timedelta(days=i), "score": 0.5}
                for i in range(n)
            ]

        return await self._top_slots_from_prophet(patterns, platform, n)

    # ─── Internal helpers ────────────────────────────────────────────────────

    async def _fetch_audience_patterns(
        self,
        user_id: str,
        platform: str,
        audience_segment: str | None = None,
    ) -> list[dict]:
        """Load the last 90 days of audience pattern rows from the DB."""
        from sqlalchemy import select, text
        from app.models.audience_pattern import AudiencePattern
        import uuid as _uuid

        try:
            uid = _uuid.UUID(str(user_id))
        except ValueError:
            return []

        stmt = (
            select(AudiencePattern)
            .where(
                AudiencePattern.user_id == uid,
                AudiencePattern.platform == platform,
                AudiencePattern.time_slot
                >= datetime.utcnow() - timedelta(days=90),
            )
            .order_by(AudiencePattern.time_slot)
        )
        if audience_segment:
            stmt = stmt.where(AudiencePattern.audience_segment == audience_segment)

        result = await self.db.execute(stmt)
        rows = result.scalars().all()

        return [
            {
                "time_slot": r.time_slot,
                "engagement_rate": r.engagement_rate,
                "reach": r.reach,
                "interactions": r.interactions,
            }
            for r in rows
        ]

    async def _predict_with_prophet(
        self,
        patterns: list[dict],
        platform: str,
        target_tz: str = "UTC",
    ) -> dict:
        """Use Facebook Prophet to forecast the best posting hour."""
        # Import here to avoid slowing startup for teams that skip ML
        from prophet import Prophet  # type: ignore

        df = pd.DataFrame(patterns)
        df["ds"] = pd.to_datetime(df["time_slot"])
        df["y"] = df["engagement_rate"].clip(lower=0)

        model = Prophet(daily_seasonality=True, weekly_seasonality=True, yearly_seasonality=False)
        model.fit(df)

        # Forecast next 7 days in hourly intervals
        future = model.make_future_dataframe(periods=7 * 24, freq="h")
        forecast = model.predict(future)

        # Only look at future windows (6 AM–10 PM local)
        now = datetime.utcnow()
        future_fc = forecast[forecast["ds"] > now].copy()
        future_fc = future_fc[future_fc["ds"].dt.hour.between(6, 22)]
        future_fc = self._apply_platform_rules(future_fc, platform)

        if future_fc.empty:
            return self._get_default_time(platform, target_tz)

        top = future_fc.nlargest(1, "yhat").iloc[0]
        optimal_dt = top["ds"].to_pydatetime()

        # Convert to requested timezone
        tz = pytz.timezone(target_tz)
        optimal_dt = optimal_dt.replace(tzinfo=pytz.utc).astimezone(tz)

        confidence = float(min(1.0, max(0.0, top["yhat"] / (df["y"].max() + 1e-6))))

        return {
            "optimal_time": optimal_dt,
            "confidence_score": round(confidence, 3),
            "is_default_time": False,
            "reasoning": f"Prophet forecast — top engagement slot in next 7 days (yhat={top['yhat']:.3f})",
        }

    async def _top_slots_from_prophet(
        self,
        patterns: list[dict],
        platform: str,
        n: int,
    ) -> list[dict]:
        from prophet import Prophet  # type: ignore

        df = pd.DataFrame(patterns)
        df["ds"] = pd.to_datetime(df["time_slot"])
        df["y"] = df["engagement_rate"].clip(lower=0)

        model = Prophet(daily_seasonality=True, weekly_seasonality=True, yearly_seasonality=False)
        model.fit(df)

        future = model.make_future_dataframe(periods=7 * 24, freq="h")
        forecast = model.predict(future)
        now = datetime.utcnow()
        future_fc = forecast[forecast["ds"] > now].copy()
        future_fc = future_fc[future_fc["ds"].dt.hour.between(6, 22)]
        future_fc = self._apply_platform_rules(future_fc, platform)

        top_n = future_fc.nlargest(n, "yhat")
        return [
            {"rank": i + 1, "time": row["ds"].to_pydatetime(), "score": float(row["yhat"])}
            for i, (_, row) in enumerate(top_n.iterrows())
        ]

    def _apply_platform_rules(self, df: pd.DataFrame, platform: str) -> pd.DataFrame:
        """Remove time slots that violate platform-specific posting rules."""
        defaults = PLATFORM_DEFAULTS.get(platform, {})
        if defaults.get("avoid_weekends"):
            df = df[df["ds"].dt.dayofweek < 5]
        return df

    def _get_default_time(self, platform: str, target_tz: str = "UTC", reason: str | None = None) -> dict:
        """Return the industry-default posting time for the given platform."""
        cfg = PLATFORM_DEFAULTS.get(platform, {"hour": 10, "min": 0, "avoid_weekends": False})
        now = datetime.utcnow()
        candidate = now.replace(hour=cfg["hour"], minute=cfg["min"], second=0, microsecond=0)

        # If the time has already passed today, push to tomorrow
        if candidate <= now:
            candidate += timedelta(days=1)

        # Skip weekends for LinkedIn
        if cfg.get("avoid_weekends"):
            while candidate.weekday() >= 5:
                candidate += timedelta(days=1)

        tz = pytz.timezone(target_tz)
        candidate = candidate.replace(tzinfo=pytz.utc).astimezone(tz)

        return {
            "optimal_time": candidate,
            "confidence_score": 0.3,
            "is_default_time": True,
            "reasoning": reason or f"Industry default for {platform} — insufficient historical data",
        }
