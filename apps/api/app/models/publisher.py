# FULL FILE
import enum
from sqlalchemy import String, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import UUIDBase

class PlacementType(str, enum.Enum): BANNER="BANNER"; NATIVE="NATIVE"; VIDEO="VIDEO"
class SlotStatus(str, enum.Enum): ACTIVE="ACTIVE"; PAUSED="PAUSED"

class PublisherProfile(UUIDBase):
    __tablename__="publisher_profiles"
    user_id: Mapped[str]=mapped_column(ForeignKey("users.id"), unique=True)
    company_name: Mapped[str]=mapped_column(String(255))

class PublisherSite(UUIDBase):
    __tablename__="publisher_sites"
    profile_id: Mapped[str]=mapped_column(ForeignKey("publisher_profiles.id"))
    domain: Mapped[str]=mapped_column(String(255), unique=True)

class PublisherApp(UUIDBase):
    __tablename__="publisher_apps"
    profile_id: Mapped[str]=mapped_column(ForeignKey("publisher_profiles.id"))
    bundle_id: Mapped[str]=mapped_column(String(255), unique=True)

class Placement(UUIDBase):
    __tablename__="placements"
    site_id: Mapped[str]=mapped_column(ForeignKey("publisher_sites.id"))
    name: Mapped[str]=mapped_column(String(255))
    type: Mapped[PlacementType]=mapped_column(Enum(PlacementType), default=PlacementType.BANNER)

class AdSlot(UUIDBase):
    __tablename__="ad_slots"
    placement_id: Mapped[str]=mapped_column(ForeignKey("placements.id"))
    code: Mapped[str]=mapped_column(String(255), unique=True)
    status: Mapped[SlotStatus]=mapped_column(Enum(SlotStatus), default=SlotStatus.ACTIVE)
