"""
Tests for the TimingEngine service.
"""

from __future__ import annotations

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_default_time_twitter():
    """When no historical data exists the engine returns a default industry time."""
    from app.services.timing_engine import TimingEngine

    db = AsyncMock()
    engine = TimingEngine(db)

    # Simulate empty DB result
    with patch.object(engine, "_fetch_audience_patterns", return_value=[]):
        result = await engine.get_optimal_time("user-123", "twitter", "text")

    assert isinstance(result["optimal_time"], datetime)
    assert result["is_default_time"] is True
    assert result["confidence_score"] == pytest.approx(0.3, abs=0.01)


@pytest.mark.asyncio
async def test_default_time_linkedin_skips_weekends():
    """LinkedIn default time must never land on a weekend."""
    from app.services.timing_engine import TimingEngine

    db = AsyncMock()
    engine = TimingEngine(db)

    with patch.object(engine, "_fetch_audience_patterns", return_value=[]):
        result = await engine.get_optimal_time("user-123", "linkedin")

    # weekday() 0-4 = Mon-Fri, 5-6 = Sat-Sun
    optimal = result["optimal_time"]
    assert optimal.weekday() < 5, "LinkedIn optimal time must be a weekday"


@pytest.mark.asyncio
async def test_get_top_slots_returns_n_items():
    """get_top_slots should respect the n argument."""
    from app.services.timing_engine import TimingEngine
    from datetime import timedelta

    db = AsyncMock()
    engine = TimingEngine(db)

    # Simulate not enough data → rule-based path
    with patch.object(engine, "_fetch_audience_patterns", return_value=[]):
        slots = await engine.get_top_slots("user-123", "instagram", n=3)

    assert len(slots) == 3
    for slot in slots:
        assert "time" in slot
        assert "score" in slot
