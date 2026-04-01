# FULL FILE
from sqlalchemy import String, ForeignKey, Numeric, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import UUIDBase

class LiveCampaign(UUIDBase): __tablename__="live_campaigns"; campaign_id: Mapped[str]=mapped_column(ForeignKey("campaigns.id"), unique=True); bid_cpm: Mapped[float]=mapped_column(Numeric(10,4), default=1)
class DeliveryRule(UUIDBase): __tablename__="delivery_rules"; live_campaign_id: Mapped[str]=mapped_column(ForeignKey("live_campaigns.id")); key: Mapped[str]=mapped_column(String(100)); value: Mapped[str]=mapped_column(String(255))
class AdImpression(UUIDBase): __tablename__="ad_impressions"; live_campaign_id: Mapped[str]=mapped_column(ForeignKey("live_campaigns.id")); ad_id: Mapped[str]=mapped_column(ForeignKey("ads.id"))
class AdClick(UUIDBase): __tablename__="ad_clicks"; live_campaign_id: Mapped[str]=mapped_column(ForeignKey("live_campaigns.id")); ad_id: Mapped[str]=mapped_column(ForeignKey("ads.id"))
class ConversionEvent(UUIDBase): __tablename__="conversion_events"; campaign_id: Mapped[str]=mapped_column(ForeignKey("campaigns.id")); event_type: Mapped[str]=mapped_column(String(100))
class BudgetLedger(UUIDBase): __tablename__="budget_ledger"; campaign_id: Mapped[str]=mapped_column(ForeignKey("campaigns.id")); amount: Mapped[float]=mapped_column(Numeric(12,4), default=0)
class PacingCounter(UUIDBase): __tablename__="pacing_counters"; campaign_id: Mapped[str]=mapped_column(ForeignKey("campaigns.id")); hour_bucket: Mapped[str]=mapped_column(String(20)); count: Mapped[int]=mapped_column(Integer, default=0)
