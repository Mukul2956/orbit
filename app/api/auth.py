"""
/api/v1/auth – OAuth 2.0 connect / callback for YouTube and LinkedIn.

Flow:
  1. Frontend calls GET /api/v1/auth/{platform}/connect?user_id=<uuid>
     → returns { auth_url } to redirect the user to the provider.
  2. Provider redirects to GET /api/v1/auth/{platform}/callback?code=...&state=<user_id>
     → exchanges code for tokens, persists in platform_configs, redirects to frontend.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.platform_config import PlatformConfig

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/auth", tags=["Auth / OAuth"])

# ─── Constants ────────────────────────────────────────────────────────────────

_FRONTEND_ORIGIN = "http://localhost:3000"
_API_ORIGIN = "http://localhost:8000"

YOUTUBE_AUTH_URL   = "https://accounts.google.com/o/oauth2/v2/auth"
YOUTUBE_TOKEN_URL  = "https://oauth2.googleapis.com/token"
YOUTUBE_SCOPES     = " ".join([
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.readonly",
])

LINKEDIN_AUTH_URL  = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
# NOTE: "w_member_social" (posting) requires "Share on LinkedIn" product approval
# in the LinkedIn Developer Portal → Products tab. Without that approval LinkedIn
# silently loops back to the login page.
# Use only OIDC profile scopes until the product is approved.
LINKEDIN_SCOPES    = "openid profile email"


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _upsert_token(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    platform: str,
    access_token: str,
    refresh_token: str | None,
    expires_in: int | None,
    account_id: str | None = None,
    account_name: str | None = None,
) -> None:
    stmt = select(PlatformConfig).where(
        PlatformConfig.user_id == user_id,
        PlatformConfig.platform == platform,
    )
    result = await db.execute(stmt)
    cfg = result.scalar_one_or_none()

    expires_at = None
    if expires_in:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    if cfg:
        cfg.access_token = access_token
        cfg.refresh_token = refresh_token or cfg.refresh_token
        cfg.token_expires_at = expires_at
        cfg.account_id = account_id or cfg.account_id
        cfg.account_name = account_name or cfg.account_name
        cfg.is_active = True
    else:
        cfg = PlatformConfig(
            user_id=user_id,
            platform=platform,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=expires_at,
            account_id=account_id,
            account_name=account_name,
            is_active=True,
        )
        db.add(cfg)

    await db.commit()
    logger.info("Saved %s token for user %s", platform, user_id)


# ─── YouTube ──────────────────────────────────────────────────────────────────

@router.get("/youtube/connect")
async def youtube_connect(user_id: uuid.UUID):
    """Return the Google OAuth2 URL to redirect the user to."""
    redirect_uri = f"{_API_ORIGIN}/api/v1/auth/youtube/callback"
    params = {
        "client_id": settings.YOUTUBE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": YOUTUBE_SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "state": str(user_id),
    }
    auth_url = f"{YOUTUBE_AUTH_URL}?{urlencode(params)}"
    return {"auth_url": auth_url, "platform": "youtube"}


@router.get("/youtube/callback")
async def youtube_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Exchange the auth code for tokens and persist them."""
    if error or not code or not state:
        return RedirectResponse(
            f"{_FRONTEND_ORIGIN}/dashboard/orbit?platform=youtube&status=error&reason={error or 'missing_code'}"
        )

    try:
        user_id = uuid.UUID(state)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid state (user_id)")

    redirect_uri = f"{_API_ORIGIN}/api/v1/auth/youtube/callback"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            YOUTUBE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.YOUTUBE_CLIENT_ID,
                "client_secret": settings.YOUTUBE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        if resp.status_code != 200:
            logger.error("YouTube token exchange failed: %s", resp.text)
            return RedirectResponse(
                f"{_FRONTEND_ORIGIN}/dashboard/orbit?platform=youtube&status=error&reason=token_exchange"
            )
        token_data = resp.json()

        # Fetch channel info for account_name
        channel_name = None
        channel_id = None
        try:
            ch_resp = await client.get(
                "https://www.googleapis.com/youtube/v3/channels",
                params={"part": "snippet", "mine": "true"},
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            if ch_resp.status_code == 200:
                items = ch_resp.json().get("items", [])
                if items:
                    channel_id = items[0]["id"]
                    channel_name = items[0]["snippet"]["title"]
        except Exception:
            pass

    await _upsert_token(
        db,
        user_id=user_id,
        platform="youtube",
        access_token=token_data["access_token"],
        refresh_token=token_data.get("refresh_token"),
        expires_in=token_data.get("expires_in"),
        account_id=channel_id,
        account_name=channel_name,
    )

    return RedirectResponse(
        f"{_FRONTEND_ORIGIN}/dashboard/orbit?platform=youtube&status=connected"
    )


# ─── LinkedIn ─────────────────────────────────────────────────────────────────

@router.get("/linkedin/connect")
async def linkedin_connect(user_id: uuid.UUID):
    """Return the LinkedIn OAuth2 URL to redirect the user to."""
    redirect_uri = f"{_API_ORIGIN}/api/v1/auth/linkedin/callback"
    params = {
        "response_type": "code",
        "client_id": settings.LINKEDIN_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": LINKEDIN_SCOPES,
        "state": str(user_id),
    }
    auth_url = f"{LINKEDIN_AUTH_URL}?{urlencode(params)}"
    return {"auth_url": auth_url, "platform": "linkedin"}


@router.get("/linkedin/callback")
async def linkedin_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Exchange the auth code for tokens and persist them."""
    if error or not code or not state:
        return RedirectResponse(
            f"{_FRONTEND_ORIGIN}/dashboard/orbit?platform=linkedin&status=error&reason={error or 'missing_code'}"
        )

    try:
        user_id = uuid.UUID(state)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid state (user_id)")

    redirect_uri = f"{_API_ORIGIN}/api/v1/auth/linkedin/callback"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            LINKEDIN_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": settings.LINKEDIN_CLIENT_ID,
                "client_secret": settings.LINKEDIN_CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if resp.status_code != 200:
            logger.error("LinkedIn token exchange failed: %s", resp.text)
            return RedirectResponse(
                f"{_FRONTEND_ORIGIN}/dashboard/orbit?platform=linkedin&status=error&reason=token_exchange"
            )
        token_data = resp.json()

        # Fetch profile using OIDC userinfo endpoint (compatible with openid+profile scopes)
        profile_name = None
        profile_id = None
        try:
            me_resp = await client.get(
                "https://api.linkedin.com/v2/userinfo",
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            if me_resp.status_code == 200:
                me = me_resp.json()
                profile_id = me.get("sub")
                profile_name = me.get("name") or (
                    f"{me.get('given_name', '')} {me.get('family_name', '')}".strip() or None
                )
        except Exception:
            pass

    await _upsert_token(
        db,
        user_id=user_id,
        platform="linkedin",
        access_token=token_data["access_token"],
        refresh_token=token_data.get("refresh_token"),
        expires_in=token_data.get("expires_in"),
        account_id=profile_id,
        account_name=profile_name,
    )

    return RedirectResponse(
        f"{_FRONTEND_ORIGIN}/dashboard/orbit?platform=linkedin&status=connected"
    )
