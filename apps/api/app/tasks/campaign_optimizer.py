from celery import shared_task
@shared_task(name="app.tasks.campaign_optimizer.optimize_all_campaigns")
def optimize_all_campaigns():
    return {"status": "ok"}
