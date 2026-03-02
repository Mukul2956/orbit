from .queue import router as queue_router
from .schedule import router as schedule_router
from .analytics import router as analytics_router
from .reddit import router as reddit_router
from .auth import router as auth_router
from .platforms import router as platforms_router
from .youtube import router as youtube_router
from .ingest import router as ingest_router
from .content import router as content_router

__all__ = [
    "queue_router",
    "schedule_router",
    "analytics_router",
    "reddit_router",
    "auth_router",
    "platforms_router",
    "youtube_router",
    "ingest_router",
    "content_router",
]
