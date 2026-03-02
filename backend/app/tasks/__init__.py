"""
Celery app factory + beat schedule.
"""

from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "orbit",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.scheduler",
        "app.tasks.publisher",
        "app.tasks.monitor",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone=settings.DEFAULT_TIMEZONE,
    enable_utc=True,
    task_routes={
        "app.tasks.scheduler.*": {"queue": "scheduler"},
        "app.tasks.publisher.*": {"queue": "publisher"},
        "app.tasks.monitor.*": {"queue": "monitor"},
    },
    # ─── Beat (periodic tasks) ────────────────────────────────────────────
    beat_schedule={
        # Decay priorities every hour
        "update-queue-priorities": {
            "task": "app.tasks.scheduler.update_queue_priorities",
            "schedule": crontab(minute=0),  # every hour
        },
        # Flush ready-to-publish items every 15 minutes
        "schedule-next-batch": {
            "task": "app.tasks.scheduler.schedule_next_batch",
            "schedule": crontab(minute="*/15"),
        },
        # Check for algorithm changes daily at 06:00 UTC
        "check-algorithm-changes": {
            "task": "app.tasks.monitor.check_algorithm_changes",
            "schedule": crontab(hour=6, minute=0),
        },
        # Re-queue evergreen content daily at 07:00 UTC
        "republish-evergreen": {
            "task": "app.tasks.scheduler.republish_evergreen_content",
            "schedule": crontab(hour=7, minute=0),
        },
    },
)
