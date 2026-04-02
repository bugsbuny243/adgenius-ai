FROM python:3.12-slim

WORKDIR /app

COPY apps/worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/api/app ./app

CMD ["celery", "-A", "app.tasks.celery_app:celery_app", "worker", "--loglevel=info", "-B"]
