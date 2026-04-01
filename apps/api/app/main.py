from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import structlog
import os
from app.config import settings
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.logging import LoggingMiddleware, configure_structlog
from app.api.v1.router import v1_router
configure_structlog()
logger = structlog.get_logger()
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AdGenius API starting up", environment=settings.ENVIRONMENT)
    yield
    logger.info("AdGenius API shutting down")
def create_app() -> FastAPI:
    app = FastAPI(title="AdGenius API", description="AI-powered ad network backend", version="1.0.0", lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(RequestIDMiddleware)
    app.include_router(v1_router)
    _static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
    if os.path.isdir(_static_dir):
        app.mount("/static", StaticFiles(directory=_static_dir), name="static")
    return app
app = create_app()
