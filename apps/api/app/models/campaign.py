# FULL FILE
import enum
from sqlalchemy import String, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import UUIDBase

class CampaignObjective(str, enum.Enum): AWARENESS="AWARENESS"; TRAFFIC="TRAFFIC"; CONVERSIONS="CONVERSIONS"
class CampaignStatus(str, enum.Enum): DRAFT="DRAFT"; ACTIVE="ACTIVE"; PAUSED="PAUSED"; ENDED="ENDED"

class CampaignBrief(UUIDBase):
    __tablename__ = "campaign_briefs"
    campaign_id: Mapped[str] = mapped_column(ForeignKey("campaigns.id"), unique=True)
    objective: Mapped[CampaignObjective] = mapped_column(Enum(CampaignObjective), default=CampaignObjective.TRAFFIC)
    status: Mapped[CampaignStatus] = mapped_column(Enum(CampaignStatus), default=CampaignStatus.DRAFT)
    audience_summary: Mapped[str] = mapped_column(String(1000), default="")
