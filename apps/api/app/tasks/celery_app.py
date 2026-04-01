# FULL FILE
from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "adgenius",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.campaign_optimizer", "app.tasks.fraud_detector"],
)

celery_app.conf.beat_schedule = {
    "optimize-campaigns-every-15-minutes": {
        "task": "app.tasks.campaign_optimizer.optimize_all_campaigns",
        "schedule": crontab(minute="*/15"),
    },
    "detect-fraud-every-10-minutes": {
        "task": "app.tasks.fraud_detector.detect_fraud",
        "schedule": crontab(minute="*/10"),
    },
}
