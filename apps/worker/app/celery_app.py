from celery import Celery
from celery.schedules import crontab
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

celery_app = Celery(
    "adgenius",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "app.tasks.campaign_optimizer",
        "app.tasks.fraud_detector",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "optimize-campaigns-every-15-minutes": {
            "task": "app.tasks.campaign_optimizer.optimize_all_campaigns",
            "schedule": crontab(minute="*/15"),
        },
        "detect-fraud-every-10-minutes": {
            "task": "app.tasks.fraud_detector.detect_fraud",
            "schedule": crontab(minute="*/10"),
        },
    },
)
