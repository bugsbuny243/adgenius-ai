import structlog
from starlette.middleware.base import BaseHTTPMiddleware

def configure_structlog() -> None:
    structlog.configure(processors=[structlog.processors.TimeStamper(fmt="iso"), structlog.processors.JSONRenderer()])

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        structlog.get_logger().info("http_request", method=request.method, path=request.url.path, status_code=response.status_code)
        return response
