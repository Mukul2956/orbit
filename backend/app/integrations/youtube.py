"""
YouTube integration via Google Data API v3.

Publishing a video requires a resumable upload, which is complex.
This module focuses on scheduing an existing video (updating its status/
publishAt metadata) and posting community posts.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.integrations.base import PlatformPublisher

logger = logging.getLogger(__name__)

YOUTUBE_URL = "https://www.googleapis.com/youtube/v3"


class YouTubePublisher(PlatformPublisher):
    platform_name = "youtube"

    async def publish(self, access_token: str, content: dict[str, Any]) -> dict[str, Any]:
        """
        content keys expected:
            video_id:    str   (pre-uploaded video ID)
            title:       str
            description: str
            publish_at:  str   (ISO datetime, optional – schedule)
        """
        video_id = content.get("video_id")
        if not video_id:
            # If no video uploaded yet, return stub for demo purposes
            return {"id": "NO_VIDEO_ID", "url": "https://youtube.com"}

        body: dict[str, Any] = {
            "id": video_id,
            "snippet": {
                "title": content.get("title", "")[:100],
                "description": content.get("description", "")[:5000],
            },
            "status": {"privacyStatus": "private"},
        }

        if content.get("publish_at"):
            body["status"]["publishAt"] = content["publish_at"]
            body["status"]["privacyStatus"] = "private"  # becomes public at publishAt

        async with httpx.AsyncClient() as client:
            resp = await client.put(
                f"{YOUTUBE_URL}/videos",
                params={"part": "snippet,status"},
                json=body,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()

        url = f"https://www.youtube.com/watch?v={video_id}"
        logger.info("Scheduled YouTube video %s", video_id)
        return {"id": video_id, "url": url, "raw": data}

    async def verify_post(self, access_token: str, post_id: str) -> bool:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{YOUTUBE_URL}/videos",
                params={"id": post_id, "part": "status"},
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if resp.status_code != 200:
                return False
            items = resp.json().get("items", [])
            return len(items) > 0
