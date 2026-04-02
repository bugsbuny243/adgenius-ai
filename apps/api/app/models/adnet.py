import enum
import uuid
from decimal import Decimal
from sqlalchemy import String, ForeignKey, Numeric, Integer, Enum, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import UUIDBase


class CampaignStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    ENDED = "ENDED"


class PayoutStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class Campaign(UUIDBase):
    __tablename__ = "campaigns"

    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    status: Mapped[CampaignStatus] = mapped_column(Enum(CampaignStatus), default=CampaignStatus.DRAFT)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    total_budget: Mapped[Decimal] = mapped_column(Numeric(14, 6), default=Decimal("0"))
    spent_amount: Mapped[Decimal] = mapped_column(Numeric(14, 6), default=Decimal("0"))
    bid_amount: Mapped[Decimal] = mapped_column(Numeric(14, 6), default=Decimal("0.01"))
    landing_url: Mapped[str] = mapped_column(String(1024), default="https://example.com")
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    target_countries: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    target_devices: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    start_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    impressions_count: Mapped[int] = mapped_column(Integer, default=0)
    clicks_count: Mapped[int] = mapped_column(Integer, default=0)


class Ad(UUIDBase):
    __tablename__ = "ads"

    campaign_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("campaigns.id"), index=True)
    headline: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(String(1000))
    cta: Mapped[str] = mapped_column(String(255), default="Learn more")
    image_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class AdvertiserWallet(UUIDBase):
    __tablename__ = "advertiser_wallets"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    balance: Mapped[Decimal] = mapped_column(Numeric(14, 6), default=Decimal("0"))
    total_deposit: Mapped[Decimal] = mapped_column(Numeric(14, 6), default=Decimal("0"))
    total_spent: Mapped[Decimal] = mapped_column(Numeric(14, 6), default=Decimal("0"))


class AdvertiserTransaction(UUIDBase):
    __tablename__ = "advertiser_transactions"

    wallet_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("advertiser_wallets.id"), index=True)
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("campaigns.id"), nullable=True)
    tx_type: Mapped[str] = mapped_column(String(50))
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 6))
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reference_id: Mapped[str | None] = mapped_column(String(255), nullable=True)


class PublisherEarning(UUIDBase):
    __tablename__ = "publisher_earnings"

    publisher_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("publisher_profiles.id"), index=True)
    slot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ad_slots.id"), index=True)
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("campaigns.id"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(32), default="impression")
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 6), default=Decimal("0"))
    reference_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    paid_out: Mapped[bool] = mapped_column(Boolean, default=False)


class PublisherPayout(UUIDBase):
    __tablename__ = "publisher_payouts"

    publisher_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("publisher_profiles.id"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 6))
    status: Mapped[PayoutStatus] = mapped_column(Enum(PayoutStatus), default=PayoutStatus.PENDING)


class AdRequest(UUIDBase):
    __tablename__ = "ad_requests"

    slot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ad_slots.id"), index=True)
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("campaigns.id"), nullable=True)
    ad_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("ads.id"), nullable=True)
    request_status: Mapped[str] = mapped_column(String(20), default="filled")
    session_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    page_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    country: Mapped[str | None] = mapped_column(String(8), nullable=True)
    device: Mapped[str | None] = mapped_column(String(32), nullable=True)
    click_token: Mapped[str | None] = mapped_column(String(1024), nullable=True)


class DeliveryLog(UUIDBase):
    __tablename__ = "delivery_logs"

    event_type: Mapped[str] = mapped_column(String(32))
    request_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("ad_requests.id"), nullable=True)
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("campaigns.id"), nullable=True)
    ad_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("ads.id"), nullable=True)
    slot_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("ad_slots.id"), nullable=True)
    gross_cost: Mapped[Decimal] = mapped_column(Numeric(14, 6), default=Decimal("0"))
    publisher_share: Mapped[Decimal] = mapped_column(Numeric(14, 6), default=Decimal("0"))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


class Impression(UUIDBase):
    __tablename__ = "impressions"

    request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ad_requests.id"), index=True)
    campaign_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("campaigns.id"), index=True)
    ad_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ads.id"), index=True)
    slot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ad_slots.id"), index=True)
    session_id: Mapped[str | None] = mapped_column(String(255), nullable=True)


class Click(UUIDBase):
    __tablename__ = "clicks"

    request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ad_requests.id"), index=True)
    campaign_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("campaigns.id"), index=True)
    ad_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ads.id"), index=True)
    slot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ad_slots.id"), index=True)
    session_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
