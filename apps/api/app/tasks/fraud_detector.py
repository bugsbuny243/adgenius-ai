# FULL FILE
from app.tasks.celery_app import celery_app

@celery_app.task(name="app.tasks.fraud_detector.detect_fraud")
def detect_fraud():
    rules = ["high_ctr_spike", "ip_repetition", "geo_mismatch", "bot_signature"]
    return {"checked": True, "rules": rules, "engine": "gemini"}
