from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    app_name: str = "Koschei AI Backend"
    app_env: str = "development"

    # Frontend origins for CORS. Comma separated values in .env are supported.
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    supabase_url: str
    supabase_service_role_key: str

    # Temporary default until agent selection is wired from the frontend.
    default_agent_type_id: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings object for dependency reuse."""

    return Settings()
