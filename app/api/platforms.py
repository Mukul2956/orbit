"""
/api/v1/platforms – connection status for all platforms per user.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.platform_config import PlatformConfig

router = APIRouter(prefix="/api/v1/platforms", tags=["Platforms"])

# Platforms Orbit knows about (ordered for the UI)
KNOWN_PLATFORMS = ["youtube", "linkedin", "reddit", "twitter", "instagram", "tiktok"]


@router.get("/status/{user_id}")
async def get_platform_status(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Return connection status for every known platform for a user.

    Status values:
      connected      – active token exists and is not expired
      auth_expired   – token exists but has expired
      not_connected  – no record in db
    """
    stmt = select(PlatformConfig).where(
        PlatformConfig.user_id == user_id,
        PlatformConfig.is_active.is_(True),
    )
    result = await db.execute(stmt)
    configs: list[PlatformConfig] = result.scalars().all()
    by_platform = {c.platform: c for c in configs}

    now = datetime.now(timezone.utc)
    statuses = []
    for platform in KNOWN_PLATFORMS:
        cfg = by_platform.get(platform)
        if cfg is None:
            status = "not_connected"
            account_name = None
            account_id = None
        elif cfg.token_expires_at and cfg.token_expires_at < now:
            status = "auth_expired"
            account_name = cfg.account_name
            account_id = cfg.account_id
        else:
            status = "connected"
            account_name = cfg.account_name
            account_id = cfg.account_id

        statuses.append({
            "platform": platform,
            "status": status,
            "account_name": account_name,
            "account_id": account_id,
        })

    return {"user_id": str(user_id), "platforms": statuses}


@router.delete("/{user_id}/{platform}")
async def disconnect_platform(
    user_id: uuid.UUID,
    platform: str,
    db: AsyncSession = Depends(get_db),
):
    """Revoke a platform connection (marks it inactive and clears tokens)."""
    stmt = select(PlatformConfig).where(
        PlatformConfig.user_id == user_id,
        PlatformConfig.platform == platform,
    )
    result = await db.execute(stmt)
    cfg = result.scalar_one_or_none()
    if cfg:
        cfg.is_active = False
        cfg.access_token = None
        cfg.refresh_token = None
        await db.commit()
    return {"platform": platform, "status": "disconnected"}
