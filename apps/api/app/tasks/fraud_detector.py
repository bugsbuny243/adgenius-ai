from celery import shared_task
@shared_task(name="app.tasks.fraud_detector.detect_fraud")
def detect_fraud():
    return {"status": "ok"}
