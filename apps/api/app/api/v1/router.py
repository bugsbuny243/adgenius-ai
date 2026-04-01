from fastapi import APIRouter
from app.api.v1 import health, auth, serving, publishers, adnet, admin, ai_reports, reports
v1_router=APIRouter(prefix="/api/v1")
for r in [health.router, auth.router, serving.router, publishers.router, adnet.router, admin.router, ai_reports.router, reports.router]:
    v1_router.include_router(r)
