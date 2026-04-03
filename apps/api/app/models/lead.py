from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import UUIDBase


class LeadBrief(UUIDBase):
    __tablename__ = "lead_briefs"

    business_name: Mapped[str] = mapped_column(String(200))
    sector: Mapped[str] = mapped_column(String(200))
    what_do_you_sell: Mapped[str] = mapped_column(Text)
    target_audience: Mapped[str] = mapped_column(Text)
    advertising_goal: Mapped[str] = mapped_column(Text)
    website_or_social_link: Mapped[str] = mapped_column(String(500), default="")
    competitor_examples: Mapped[str] = mapped_column(Text, default="")
    interested_package: Mapped[str] = mapped_column(String(100))
