"""
Base class for all platform publishers.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class PlatformPublisher(ABC):
    """
    All platform publishers must implement `publish`.

    Args:
        access_token: The user's OAuth access token for the platform.
        content: Formatted content dict specific to the platform.

    Returns:
        dict with at minimum ``id`` and ``url`` keys.
    """

    platform_name: str = "unknown"

    @abstractmethod
    async def publish(self, access_token: str, content: dict[str, Any]) -> dict[str, Any]:
        ...

    @abstractmethod
    async def verify_post(self, access_token: str, post_id: str) -> bool:
        """Return True if the post exists and is publicly visible."""
        ...

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}>"
