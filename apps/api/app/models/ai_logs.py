# FULL FILE
import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import UUIDBase

class AiOptimizationLog(UUIDBase):
    __tablename__ = "ai_optimization_logs"
    campaign_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("campaigns.id"))
    live_campaign_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("live_campaigns.id"), nullable=True)
    generation_job_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("generation_jobs.id"), nullable=True)
    model: Mapped[str] = mapped_column(String(100), default="gemini")
    prompt: Mapped[str] = mapped_column(String(4000), default="")
    response: Mapped[str] = mapped_column(String(4000), default="")
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
