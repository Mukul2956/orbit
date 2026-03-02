"""
LinkedIn integration via LinkedIn API v2.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.integrations.base import PlatformPublisher

logger = logging.getLogger(__name__)

LINKEDIN_URL = "https://api.linkedin.com/v2"


class LinkedInPublisher(PlatformPublisher):
    platform_name = "linkedin"

    async def publish(self, access_token: str, content: dict[str, Any]) -> dict[str, Any]:
        """
        content keys expected:
            text: str   (max 3 000 chars)
            media: list[str]  (optional)
        """
        text = content.get("text", "")[:3000]

        # Get author URN (person or organisation)
        async with httpx.AsyncClient() as client:
            # Use OIDC userinfo endpoint — works with openid+profile scopes
            # /v2/me requires r_liteprofile which is restricted
            me_resp = await client.get(
                f"{LINKEDIN_URL.replace('/v2', '')}/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            me_resp.raise_for_status()
            person_id = me_resp.json().get("sub", "")
            author_urn = f"urn:li:person:{person_id}"

            payload = {
                "author": author_urn,
                "lifecycleState": "PUBLISHED",
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareCommentary": {"text": text},
                        "shareMediaCategory": "NONE",
                    }
                },
                "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
            }

            post_resp = await client.post(
                f"{LINKEDIN_URL}/ugcPosts",
                json=payload,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "X-Restli-Protocol-Version": "2.0.0",
                },
            )
            post_resp.raise_for_status()
            post_id = post_resp.json().get("id", "")

        url = f"https://www.linkedin.com/feed/update/{post_id}/"
        logger.info("Published LinkedIn post %s", post_id)
        return {"id": post_id, "url": url}

    async def verify_post(self, access_token: str, post_id: str) -> bool:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{LINKEDIN_URL}/ugcPosts/{post_id}",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            return resp.status_code == 200
