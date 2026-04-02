import enum

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import UUIDBase


class CampaignObjective(str, enum.Enum):
    AWARENESS = "AWARENESS"
    TRAFFIC = "TRAFFIC"
    CONVERSIONS = "CONVERSIONS"


class CampaignStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    ENDED = "ENDED"


class CampaignBrief(UUIDBase):
    """AI input/brief layer entity linked to campaign, brand, product and audience."""

    __tablename__ = "campaign_briefs"

    campaign_id: Mapped[str] = mapped_column(ForeignKey("campaigns.id"), unique=True)
    brand_id: Mapped[str | None] = mapped_column(ForeignKey("brands.id"), nullable=True)
    product_id: Mapped[str | None] = mapped_column(ForeignKey("products.id"), nullable=True)
    audience_id: Mapped[str | None] = mapped_column(ForeignKey("audiences.id"), nullable=True)

    objective: Mapped[CampaignObjective] = mapped_column(Enum(CampaignObjective), default=CampaignObjective.TRAFFIC)
    status: Mapped[CampaignStatus] = mapped_column(Enum(CampaignStatus), default=CampaignStatus.DRAFT)
    audience_summary: Mapped[str] = mapped_column(String(1000), default="")
    brief_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
