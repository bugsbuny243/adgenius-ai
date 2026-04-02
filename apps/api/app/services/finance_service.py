"""Finance service: wallet debits, campaign spend tracking, publisher earnings."""
from decimal import Decimal
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from app.models.adnet import Campaign, CampaignStatus, AdvertiserWallet, AdvertiserTransaction, PublisherEarning, DeliveryLog
from app.models.publisher import AdSlot, Placement

logger = structlog.get_logger()


def split_revenue(gross_cost: Decimal, revenue_share_pct: Decimal) -> tuple[Decimal, Decimal]:
    publisher_share = (gross_cost * revenue_share_pct / Decimal("100")).quantize(Decimal("0.000001"))
    platform_share = gross_cost - publisher_share
    return publisher_share, platform_share


async def apply_ad_spend(db: AsyncSession, campaign: Campaign, slot: AdSlot, gross_cost: Decimal, event_type: str, reference_id: str) -> Decimal:
    revenue_share_pct = Decimal(str(slot.revenue_share_percent))
    publisher_share, _ = split_revenue(gross_cost, revenue_share_pct)

    result = await db.execute(select(AdvertiserWallet).where(AdvertiserWallet.user_id == campaign.user_id))
    wallet = result.scalar_one_or_none()

    if wallet and gross_cost > Decimal("0"):
        if wallet.balance < gross_cost:
            campaign.is_active = False
            campaign.status = CampaignStatus.ENDED
            logger.warning("Insufficient balance, campaign paused", campaign_id=str(campaign.id))
            return Decimal("0")
        wallet.balance -= gross_cost
        wallet.total_spent += gross_cost
        db.add(AdvertiserTransaction(
            wallet_id=wallet.id, campaign_id=campaign.id,
            tx_type=f"spend_{event_type}", amount=-gross_cost,
            description=f"{event_type.upper()} spend on slot {slot.id}",
            reference_id=reference_id[:255],
        ))

    campaign.spent_amount = campaign.spent_amount + gross_cost
    if event_type == "impression":
        campaign.impressions_count = campaign.impressions_count + 1
    elif event_type == "click":
        campaign.clicks_count = campaign.clicks_count + 1

    if campaign.spent_amount >= campaign.total_budget:
        campaign.status = CampaignStatus.ENDED
        campaign.is_active = False
        logger.info("Campaign budget exhausted", campaign_id=str(campaign.id))

    result = await db.execute(select(Placement).where(Placement.id == slot.placement_id))
    placement = result.scalar_one_or_none()
    if placement and publisher_share > Decimal("0"):
        db.add(PublisherEarning(
            publisher_id=placement.publisher_id, slot_id=slot.id,
            campaign_id=campaign.id, event_type=event_type,
            amount=publisher_share, reference_id=reference_id[:255],
        ))

    return publisher_share


async def write_delivery_log(db: AsyncSession, event_type: str, campaign_id, ad_id, slot_id, gross_cost: Decimal, publisher_share: Decimal, request_id=None, description: Optional[str] = None) -> None:
    db.add(DeliveryLog(
        event_type=event_type, request_id=request_id,
        campaign_id=campaign_id, ad_id=ad_id, slot_id=slot_id,
        gross_cost=gross_cost, publisher_share=publisher_share,
        description=description or f"{event_type} event",
    ))
