# FULL FILE
from sqlalchemy import String, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import UUIDBase

class AdvertiserInvoice(UUIDBase): __tablename__="advertiser_invoices"; workspace_id: Mapped[str]=mapped_column(ForeignKey("workspaces.id")); total: Mapped[float]=mapped_column(Numeric(12,2), default=0)
class SpendReservation(UUIDBase): __tablename__="spend_reservations"; campaign_id: Mapped[str]=mapped_column(ForeignKey("campaigns.id")); amount: Mapped[float]=mapped_column(Numeric(12,4), default=0)
class ModerationReview(UUIDBase): __tablename__="moderation_reviews"; entity_type: Mapped[str]=mapped_column(String(50)); entity_id: Mapped[str]=mapped_column(String(64)); status: Mapped[str]=mapped_column(String(50), default="pending")
class PolicyFlag(UUIDBase): __tablename__="policy_flags"; campaign_id: Mapped[str]=mapped_column(ForeignKey("campaigns.id")); reason: Mapped[str]=mapped_column(String(255))
class FraudSignal(UUIDBase): __tablename__="fraud_signals"; campaign_id: Mapped[str]=mapped_column(ForeignKey("campaigns.id")); live_campaign_id: Mapped[str]=mapped_column(ForeignKey("live_campaigns.id")); severity: Mapped[str]=mapped_column(String(50)); details: Mapped[str]=mapped_column(String(1000), default="")
