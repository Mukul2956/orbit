"""
Tests for the QueueManager service.
"""

from __future__ import annotations

import uuid
import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_add_to_queue_returns_uuid():
    """add_to_queue should return a valid UUID."""
    from app.services.queue_manager import QueueManager
    from app.services.timing_engine import TimingEngine

    db = MagicMock()
    db.add = MagicMock()
    db.flush = AsyncMock()

    qm = QueueManager(db)

    fake_timing = {
        "optimal_time": datetime.utcnow(),
        "confidence_score": 0.5,
        "is_default_time": True,
        "reasoning": "test",
    }

    with patch.object(TimingEngine, "get_optimal_time", return_value=fake_timing):
        queue_id = await qm.add_to_queue(
            content_id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            platforms=["twitter"],
        )

    # Should return the UUID of the new entry (mocked via flush side-effect)
    assert queue_id is not None


@pytest.mark.asyncio
async def test_decay_priority_decreases_over_time():
    """_decay_priority should return a lower value for older entries."""
    from app.services.queue_manager import QueueManager
    from datetime import timedelta

    old_time = datetime.utcnow() - timedelta(hours=10)
    decayed = QueueManager._decay_priority(0.8, 0.05, old_time)

    assert decayed < 0.8


@pytest.mark.asyncio
async def test_decay_priority_min_floor():
    """Priority should never fall below 0.05."""
    from app.services.queue_manager import QueueManager
    from datetime import timedelta

    very_old_time = datetime.utcnow() - timedelta(hours=1000)
    decayed = QueueManager._decay_priority(0.5, 0.1, very_old_time)

    assert decayed >= 0.05
