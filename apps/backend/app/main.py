from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.ws_agent import router as ws_agent_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Backend AI engine for Koschei workspace.",
)

# CORS configuration for the upcoming Next.js frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ws_agent_router)


@app.get("/health", tags=["system"])
async def healthcheck() -> dict[str, str]:
    """Basic liveliness endpoint for monitoring and deployment checks."""

    return {"status": "ok"}
