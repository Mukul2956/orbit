"""
PriorityCalculator – LightGBM model that scores how important it is to
publish a piece of content as soon as possible.

Features used:
- content_type   (text=0, image=1, video=2, carousel=3)
- is_time_sensitive
- is_evergreen
- hour_of_day  (0-23)
- day_of_week  (0-6)
- platform_count (number of platforms)

Falls back to a simple rule-based score when the model isn't trained yet.
"""

from __future__ import annotations

import logging
import os
import pickle
from pathlib import Path
from typing import Any

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

MODEL_FILE = Path(settings.MODEL_PATH) / "priority_model.pkl"

CONTENT_TYPE_MAP = {"text": 0, "image": 1, "video": 2, "carousel": 3, "general": 0}


class PriorityCalculator:
    """
    Wraps a LightGBM classifier that predicts a 0-1 priority score.
    """

    def __init__(self) -> None:
        self._model: Any = None
        self._load()

    def _load(self) -> None:
        if MODEL_FILE.exists():
            with open(MODEL_FILE, "rb") as f:
                self._model = pickle.load(f)
            logger.info("Priority model loaded from %s", MODEL_FILE)
        else:
            logger.info("No trained priority model found – using rule-based fallback.")

    def calculate(
        self,
        content_type: str = "general",
        is_time_sensitive: bool = False,
        is_evergreen: bool = False,
        platform_count: int = 1,
    ) -> float:
        """Return a priority score in [0, 1]."""
        if self._model is not None:
            return self._predict(content_type, is_time_sensitive, is_evergreen, platform_count)
        return self._rule_based(is_time_sensitive, is_evergreen, platform_count)

    # ─── ML path ─────────────────────────────────────────────────────────────

    def _predict(self, content_type: str, ts: bool, ev: bool, n_platforms: int) -> float:
        now = np.datetime64("now", "h").astype(object)
        features = np.array([[
            CONTENT_TYPE_MAP.get(content_type, 0),
            int(ts),
            int(ev),
            now.hour if hasattr(now, "hour") else 12,
            now.weekday() if hasattr(now, "weekday") else 0,
            n_platforms,
        ]])
        score = float(self._model.predict_proba(features)[0][1])
        return round(score, 4)

    def train(self, X: np.ndarray, y: np.ndarray) -> None:
        """Train and persist the LightGBM model."""
        import lightgbm as lgb  # type: ignore

        self._model = lgb.LGBMClassifier(n_estimators=200, learning_rate=0.05)
        self._model.fit(X, y)
        MODEL_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(MODEL_FILE, "wb") as f:
            pickle.dump(self._model, f)
        logger.info("Priority model trained and saved to %s", MODEL_FILE)

    # ─── Rule-based fallback ─────────────────────────────────────────────────

    @staticmethod
    def _rule_based(ts: bool, ev: bool, n_platforms: int) -> float:
        score = 0.5
        if ts:
            score += 0.3
        if ev:
            score -= 0.1
        score += min(0.1, (n_platforms - 1) * 0.02)
        return round(min(1.0, max(0.05, score)), 4)
