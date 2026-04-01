# FULL FILE
import logging
import time
import structlog
from starlette.middleware.base import BaseHTTPMiddleware


def configure_structlog() -> None:
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.JSONRenderer(),
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
    )
    logging.basicConfig(level=logging.INFO)


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        logger = structlog.get_logger()
        started = time.time()
        response = await call_next(request)
        logger.info(
            "request.completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=round((time.time() - started) * 1000, 2),
            request_id=getattr(request.state, "request_id", None),
        )
        return response
