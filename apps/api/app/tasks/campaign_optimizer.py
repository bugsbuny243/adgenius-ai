# FULL FILE
from app.tasks.celery_app import celery_app

@celery_app.task(name="app.tasks.campaign_optimizer.optimize_all_campaigns")
def optimize_all_campaigns():
    return {"optimized": True, "interval": "15m", "engine": "gemini"}
