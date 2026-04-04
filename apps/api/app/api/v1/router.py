from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.api.v1.publishers import router as publishers_router
from app.api.v1.adnet import router as adnet_router
from app.api.v1.admin import router as admin_router

v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(health_router)
v1_router.include_router(publishers_router)
v1_router.include_router(adnet_router)
v1_router.include_router(admin_router)
