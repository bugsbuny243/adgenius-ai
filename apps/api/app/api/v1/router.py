# FULL FILE
from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.serving import router as serving_router
from app.api.v1.publishers import router as publishers_router
from app.api.v1.adnet import router as adnet_router
from app.api.v1.admin import router as admin_router
from app.api.v1.reports import router as reports_router
from app.api.v1.ai_reports import router as ai_reports_router
from app.api.v1.runtime import router as runtime_router

v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(health_router)
v1_router.include_router(auth_router)
v1_router.include_router(serving_router)
v1_router.include_router(publishers_router)
v1_router.include_router(adnet_router)
v1_router.include_router(admin_router)
v1_router.include_router(reports_router)
v1_router.include_router(ai_reports_router)
v1_router.include_router(runtime_router)
