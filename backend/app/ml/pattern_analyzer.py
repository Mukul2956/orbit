"""
PatternAnalyzer – lightweight scikit-learn pipeline that groups audience
engagement patterns by hour-of-day × day-of-week to build a heat-map.
"""

from __future__ import annotations

import logging
from datetime import datetime

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class PatternAnalyzer:
    """
    Builds a 7×24 engagement heat-map matrix from raw audience_patterns rows.

    Usage::

        analyzer = PatternAnalyzer()
        heatmap = analyzer.build_heatmap(patterns_list)
        # heatmap[day_of_week][hour] → float engagement rate
    """

    def build_heatmap(self, patterns: list[dict]) -> list[dict]:
        """
        Returns a list of AudienceHeatmapPoint-compatible dicts::

            [{"hour": 9, "day_of_week": 1, "engagement_rate": 0.045, "reach": 1200}, ...]
        """
        if not patterns:
            return []

        df = pd.DataFrame(patterns)
        df["ds"] = pd.to_datetime(df["time_slot"])
        df["hour"] = df["ds"].dt.hour
        df["dow"] = df["ds"].dt.dayofweek

        grouped = (
            df.groupby(["dow", "hour"])
            .agg(engagement_rate=("engagement_rate", "mean"), reach=("reach", "mean"))
            .reset_index()
        )

        return [
            {
                "day_of_week": int(row["dow"]),
                "hour": int(row["hour"]),
                "engagement_rate": round(float(row["engagement_rate"]), 5),
                "reach": int(row["reach"]),
            }
            for _, row in grouped.iterrows()
        ]

    def best_slot(self, patterns: list[dict]) -> dict | None:
        """Return the single highest-engagement hour slot."""
        heatmap = self.build_heatmap(patterns)
        if not heatmap:
            return None
        return max(heatmap, key=lambda x: x["engagement_rate"])
