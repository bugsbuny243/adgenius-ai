from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import UUIDBase


class UsageLog(UUIDBase):
    __tablename__ = "usage_logs"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(255))
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)


class ApiUsageCounter(UUIDBase):
    __tablename__ = "api_usage_counters"

    key: Mapped[str] = mapped_column(String(255), unique=True)
    count: Mapped[int] = mapped_column(Integer, default=0)
