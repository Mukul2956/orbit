"""
Tests for the CrossPlatformOrchestrator service.
"""

from __future__ import annotations

import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_publish_unknown_platform_returns_failed():
    """Publishing to an unsupported platform returns a 'failed' status dict."""
    from app.services.orchestrator import CrossPlatformOrchestrator, ContentDTO

    db = AsyncMock()
    orchestrator = CrossPlatformOrchestrator(db)

    content = ContentDTO({"text": "Hello world"})
    result = await orchestrator._safe_publish("unknown_platform", content, uuid.uuid4())

    assert result["status"] == "failed"
    assert "No publisher" in result["error"]


@pytest.mark.asyncio
async def test_publish_no_credentials_returns_failed():
    """Publishing when platform config is missing returns 'failed'."""
    from app.services.orchestrator import CrossPlatformOrchestrator, ContentDTO

    db = AsyncMock()
    orchestrator = CrossPlatformOrchestrator(db)

    # Simulate no platform config found
    with patch.object(orchestrator, "_get_platform_config", return_value=None):
        content = ContentDTO({"text": "test"})
        result = await orchestrator._safe_publish("twitter", content, uuid.uuid4())

    assert result["status"] == "failed"
    assert "credentials" in result["error"].lower()


def test_format_twitter_truncates_to_280():
    """Twitter formatter should truncate text to 280 chars."""
    from app.services.orchestrator import CrossPlatformOrchestrator, ContentDTO

    db = MagicMock()
    orchestrator = CrossPlatformOrchestrator(db)
    content = ContentDTO({"text": "x" * 500})

    formatted = orchestrator._format_content(content, "twitter")
    assert len(formatted["text"]) <= 280


def test_format_linkedin_truncates_to_3000():
    """LinkedIn formatter should truncate text to 3000 chars."""
    from app.services.orchestrator import CrossPlatformOrchestrator, ContentDTO

    db = MagicMock()
    orchestrator = CrossPlatformOrchestrator(db)
    content = ContentDTO({"text": "y" * 5000})

    formatted = orchestrator._format_content(content, "linkedin")
    assert len(formatted["text"]) <= 3000
