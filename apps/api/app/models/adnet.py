# FULL FILE
from sqlalchemy import String, ForeignKey, Numeric, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import UUIDBase

class Campaign(UUIDBase): __tablename__="campaigns"; workspace_id: Mapped[str]=mapped_column(ForeignKey("workspaces.id")); name: Mapped[str]=mapped_column(String(255)); budget: Mapped[float]=mapped_column(Numeric(12,2), default=0)
class Ad(UUIDBase): __tablename__="ads"; campaign_id: Mapped[str]=mapped_column(ForeignKey("campaigns.id")); title: Mapped[str]=mapped_column(String(255)); body: Mapped[str]=mapped_column(String(1000)); cta: Mapped[str]=mapped_column(String(255), default="Learn more")
class AdvertiserWallet(UUIDBase): __tablename__="advertiser_wallets"; workspace_id: Mapped[str]=mapped_column(ForeignKey("workspaces.id"), unique=True); balance: Mapped[float]=mapped_column(Numeric(12,2), default=0)
class AdvertiserTransaction(UUIDBase): __tablename__="advertiser_transactions"; wallet_id: Mapped[str]=mapped_column(ForeignKey("advertiser_wallets.id")); amount: Mapped[float]=mapped_column(Numeric(12,2)); type: Mapped[str]=mapped_column(String(50))
class PublisherEarning(UUIDBase): __tablename__="publisher_earnings"; profile_id: Mapped[str]=mapped_column(ForeignKey("publisher_profiles.id")); amount: Mapped[float]=mapped_column(Numeric(12,2), default=0)
class AdRequest(UUIDBase): __tablename__="ad_requests"; slot_id: Mapped[str]=mapped_column(ForeignKey("ad_slots.id")); request_id: Mapped[str]=mapped_column(String(255), unique=True)
class DeliveryLog(UUIDBase): __tablename__="delivery_logs"; campaign_id: Mapped[str]=mapped_column(ForeignKey("campaigns.id")); slot_id: Mapped[str]=mapped_column(ForeignKey("ad_slots.id")); cost: Mapped[float]=mapped_column(Numeric(12,4), default=0)
class Impression(UUIDBase): __tablename__="impressions"; ad_id: Mapped[str]=mapped_column(ForeignKey("ads.id")); slot_id: Mapped[str]=mapped_column(ForeignKey("ad_slots.id"))
class Click(UUIDBase): __tablename__="clicks"; ad_id: Mapped[str]=mapped_column(ForeignKey("ads.id")); slot_id: Mapped[str]=mapped_column(ForeignKey("ad_slots.id")); request_id: Mapped[str]=mapped_column(String(255))
