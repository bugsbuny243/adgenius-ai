from celery import shared_task
@shared_task
def generate_ads(job_id:str): return {"job_id":job_id}
