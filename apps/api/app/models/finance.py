import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import UUIDBase


class AdvertiserInvoice(UUIDBase):
    __tablename__ = "advertiser_invoices"

    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    status: Mapped[str] = mapped_column(String(50), default="draft")
    period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class SpendReservation(UUIDBase):
    __tablename__ = "spend_reservations"

    campaign_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("campaigns.id"), index=True)
    ad_request_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("ad_requests.id"), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 4), default=0)
    status: Mapped[str] = mapped_column(String(50), default="reserved")


class ModerationReview(UUIDBase):
    __tablename__ = "moderation_reviews"

    entity_type: Mapped[str] = mapped_column(String(50))
    entity_id: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(50), default="pending")
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)


class PolicyFlag(UUIDBase):
    __tablename__ = "policy_flags"

    campaign_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("campaigns.id"), nullable=True)
    live_campaign_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("live_campaigns.id"), nullable=True)
    reason: Mapped[str] = mapped_column(String(255))
    severity: Mapped[str] = mapped_column(String(50), default="medium")
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class FraudSignal(UUIDBase):
    __tablename__ = "fraud_signals"

    campaign_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("campaigns.id"), nullable=True)
    live_campaign_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("live_campaigns.id"), nullable=True)
    ad_request_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("ad_requests.id"), nullable=True)
    severity: Mapped[str] = mapped_column(String(50))
    details: Mapped[str] = mapped_column(String(1000), default="")
    signal_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
