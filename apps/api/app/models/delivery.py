"""Runtime delivery domain models.

This module intentionally separates publish/runtime entities from advertiser authoring entities:
- ``campaigns`` and ``ads`` stay in advertiser business authoring domain.
- ``live_campaigns`` and ``ad_*`` runtime tables power serving execution.
"""

import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import UUIDBase


class LiveCampaignStatus(str, enum.Enum):
    PENDING = "PENDING"
    READY = "READY"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    ENDED = "ENDED"
    REJECTED = "REJECTED"


class ApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class RuntimePricingModel(str, enum.Enum):
    CPC = "CPC"
    CPM = "CPM"


class LiveCampaign(UUIDBase):
    """Publish/runtime campaign entity used by serving.

    This is not an advertiser authoring object. It is a runtime projection of campaign
    business intent, brief intent and generated creative output.
    """

    __tablename__ = "live_campaigns"

    campaign_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("campaigns.id"), index=True)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("workspaces.id"), nullable=True, index=True)
    campaign_brief_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("campaign_briefs.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    ad_set_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("generated_ad_sets.id"), nullable=True)
    ad_variant_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("generated_ad_variants.id"), nullable=True)
    ad_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("ads.id"), nullable=True)

    pricing_model: Mapped[RuntimePricingModel] = mapped_column(
        Enum(RuntimePricingModel, name="pricing_model_enum", create_type=False),
        default=RuntimePricingModel.CPC,
    )
    cpm_rate: Mapped[Decimal] = mapped_column(Numeric(10, 4), default=Decimal("0"))
    cpc_rate: Mapped[Decimal] = mapped_column(Numeric(10, 4), default=Decimal("0"))
    total_budget: Mapped[Decimal | None] = mapped_column(Numeric(14, 6), nullable=True)
    spent_amount: Mapped[Decimal] = mapped_column(Numeric(14, 6), default=Decimal("0"))
    daily_budget_cap: Mapped[Decimal | None] = mapped_column(Numeric(12, 4), nullable=True)

    target_categories: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    target_regions: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    target_formats: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    runtime_targeting: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    frequency_cap_per_session: Mapped[int | None] = mapped_column(Integer, nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    approval_status: Mapped[ApprovalStatus] = mapped_column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING)
    status: Mapped[LiveCampaignStatus] = mapped_column(
        Enum(LiveCampaignStatus, name="live_campaign_status_enum", create_type=False),
        default=LiveCampaignStatus.PENDING,
    )


class DeliveryRule(UUIDBase):
    __tablename__ = "delivery_rules"

    live_campaign_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("live_campaigns.id"))
    key: Mapped[str] = mapped_column(String(100))
    value: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class AdImpression(UUIDBase):
    """Detailed runtime impression telemetry at live-campaign/ad-set level."""

    __tablename__ = "ad_impressions"

    live_campaign_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("live_campaigns.id"), index=True)
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("campaigns.id"), nullable=True, index=True)
    slot_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("ad_slots.id"), nullable=True, index=True)
    ad_request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ad_requests.id"), index=True)
    ad_set_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("generated_ad_sets.id"), nullable=True)
    ad_variant_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("generated_ad_variants.id"), nullable=True)
    ad_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("ads.id"), nullable=True)
    session_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    user_agent_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    click_token: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    cost: Mapped[Decimal] = mapped_column(Numeric(14, 6), default=Decimal("0"))
    publisher_earnings: Mapped[Decimal] = mapped_column(Numeric(14, 6), default=Decimal("0"))
    site_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    country: Mapped[str | None] = mapped_column(String(8), nullable=True)
    device: Mapped[str | None] = mapped_column(String(32), nullable=True)
    telemetry: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    served_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class AdClick(UUIDBase):
    """Detailed runtime click telemetry linked to ad impression when available."""

    __tablename__ = "ad_clicks"

    live_campaign_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("live_campaigns.id"), index=True)
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("campaigns.id"), nullable=True, index=True)
    slot_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("ad_slots.id"), nullable=True, index=True)
    ad_request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ad_requests.id"), index=True)
    impression_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("ad_impressions.id"), nullable=True)
    ad_set_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("generated_ad_sets.id"), nullable=True)
    ad_variant_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("generated_ad_variants.id"), nullable=True)
    ad_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("ads.id"), nullable=True)
    click_token: Mapped[str] = mapped_column(String(1024), index=True)
    destination_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    ip_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    cost: Mapped[Decimal] = mapped_column(Numeric(14, 6), default=Decimal("0"))
    publisher_earnings: Mapped[Decimal] = mapped_column(Numeric(14, 6), default=Decimal("0"))
    country: Mapped[str | None] = mapped_column(String(8), nullable=True)
    device: Mapped[str | None] = mapped_column(String(32), nullable=True)
    telemetry: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    clicked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class ConversionEvent(UUIDBase):
    __tablename__ = "conversion_events"

    campaign_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("campaigns.id"), index=True)
    live_campaign_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("live_campaigns.id"), nullable=True, index=True)
    ad_click_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("ad_clicks.id"), nullable=True, index=True)
    ad_impression_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("ad_impressions.id"), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(100))
    value: Mapped[Decimal | None] = mapped_column(Numeric(14, 6), nullable=True)
    currency: Mapped[str | None] = mapped_column(String(10), nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class BudgetLedger(UUIDBase):
    """Financial/budget control ledger for budget debits/credits per campaign."""

    __tablename__ = "budget_ledgers"

    campaign_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("campaigns.id"), index=True)
    live_campaign_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("live_campaigns.id"), nullable=True, index=True)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("workspaces.id"), nullable=True, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 4), default=Decimal("0"))
    entry_type: Mapped[str] = mapped_column(String(50), default="spend")
    reference_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reference_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class PacingCounter(UUIDBase):
    """Per campaign serving counters used by pacing decisions."""

    __tablename__ = "pacing_counters"

    campaign_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("campaigns.id"), index=True)
    live_campaign_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("live_campaigns.id"), nullable=True, index=True)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("workspaces.id"), nullable=True, index=True)
    hour_bucket: Mapped[str] = mapped_column(String(20), index=True)
    count: Mapped[int] = mapped_column(Integer, default=0)
    spend_amount: Mapped[Decimal] = mapped_column(Numeric(14, 6), default=Decimal("0"))
