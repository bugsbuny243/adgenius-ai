from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import structlog
import os

from app.config import settings
from app.database import engine
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.logging import LoggingMiddleware, configure_structlog
from app.api.v1.router import v1_router
from app.pages import router as pages_router
from app.database import Base
import app.models  # noqa: F401

configure_structlog()
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AdGenius API starting up", environment=settings.ENVIRONMENT)
    app.state.db_startup_ready = False
    app.state.db_startup_error = None

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        app.state.db_startup_ready = True
        logger.info("Database startup check completed")
    except Exception as exc:  # noqa: BLE001
        app.state.db_startup_error = str(exc)
        logger.exception(
            "Database startup check failed; continuing in degraded mode",
            require_db_on_startup=settings.REQUIRE_DB_ON_STARTUP,
        )
        if settings.REQUIRE_DB_ON_STARTUP:
            raise RuntimeError(
                "Database startup check failed and REQUIRE_DB_ON_STARTUP=true. "
                "Set REQUIRE_DB_ON_STARTUP=false to allow degraded startup."
            ) from exc
    yield
    logger.info("AdGenius API shutting down")


def create_app() -> FastAPI:
    app = FastAPI(
        title="AdGenius API",
        description="AI-powered ad network backend",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_middleware(LoggingMiddleware)
    app.add_middleware(RequestIDMiddleware)
    app.include_router(v1_router)
    app.include_router(pages_router)

    _app_dir = os.path.dirname(__file__)
    _static_dir = os.path.join(_app_dir, "static")
    if os.path.isdir(_static_dir):
        app.mount("/static", StaticFiles(directory=_static_dir), name="static")

    return app


app = create_app()
