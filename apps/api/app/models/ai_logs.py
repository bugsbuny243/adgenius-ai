# FULL FILE
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import UUIDBase

class AiOptimizationLog(UUIDBase):
    __tablename__ = "ai_optimization_logs"
    campaign_id: Mapped[str] = mapped_column(ForeignKey("campaigns.id"))
    model: Mapped[str] = mapped_column(String(100), default="gemini")
    prompt: Mapped[str] = mapped_column(String(4000), default="")
    response: Mapped[str] = mapped_column(String(4000), default="")
