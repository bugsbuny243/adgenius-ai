from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/adgenius"
    REDIS_URL: str = "redis://localhost:6379"
    SECRET_KEY: str = "change-me-in-production-use-a-long-random-string"
    GEMINI_API_KEY: str = ""
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    ENVIRONMENT: str = "development"
    RATE_LIMIT_GENERATION_PER_MINUTE: int = 5
    ACCESS_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

settings = Settings()
def get_settings() -> Settings:
    return settings
