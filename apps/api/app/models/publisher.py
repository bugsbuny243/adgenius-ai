import enum
import uuid
from decimal import Decimal
from sqlalchemy import String, ForeignKey, Enum, Boolean, Numeric, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import UUIDBase


class PublisherStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class PublisherTier(str, enum.Enum):
    BRONZE = "BRONZE"
    SILVER = "SILVER"
    GOLD = "GOLD"


class SiteStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    DISABLED = "DISABLED"


class PlacementType(str, enum.Enum):
    BANNER = "BANNER"
    NATIVE = "NATIVE"
    VIDEO = "VIDEO"


class SlotFormat(str, enum.Enum):
    BANNER = "BANNER"
    NATIVE = "NATIVE"
    VIDEO = "VIDEO"


class PublisherProfile(UUIDBase):
    __tablename__ = "publisher_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    company_name: Mapped[str] = mapped_column(String(255))
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[PublisherStatus] = mapped_column(Enum(PublisherStatus), default=PublisherStatus.PENDING)
    tier: Mapped[PublisherTier] = mapped_column(Enum(PublisherTier), default=PublisherTier.BRONZE)


class PublisherSite(UUIDBase):
    __tablename__ = "publisher_sites"

    publisher_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("publisher_profiles.id"), index=True)
    domain: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    categories: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    status: Mapped[SiteStatus] = mapped_column(Enum(SiteStatus), default=SiteStatus.PENDING)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class PublisherApp(UUIDBase):
    __tablename__ = "publisher_apps"

    publisher_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("publisher_profiles.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    bundle_id: Mapped[str] = mapped_column(String(255), unique=True)
    platform: Mapped[str] = mapped_column(String(50), default="web")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Placement(UUIDBase):
    __tablename__ = "placements"

    publisher_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("publisher_profiles.id"), index=True)
    site_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("publisher_sites.id"), nullable=True)
    app_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("publisher_apps.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255))
    type: Mapped[PlacementType] = mapped_column(Enum(PlacementType), default=PlacementType.BANNER)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class AdSlot(UUIDBase):
    __tablename__ = "ad_slots"

    placement_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("placements.id"), index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    slot_key: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    format: Mapped[SlotFormat] = mapped_column(Enum(SlotFormat), default=SlotFormat.BANNER)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    revenue_share_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("70.00"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
