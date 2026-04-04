"""Finance service: wallet debits, campaign spend tracking, budget and payout side-effects."""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
import uuid

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.adnet import AdvertiserTransaction, AdvertiserWallet, Campaign, CampaignStatus, DeliveryLog, PublisherEarning
from app.models.delivery import BudgetLedger, PacingCounter
from app.models.finance import SpendReservation
from app.models.publisher import AdSlot, Placement

logger = structlog.get_logger()


def split_revenue(gross_cost: Decimal, revenue_share_pct: Decimal) -> tuple[Decimal, Decimal]:
    publisher_share = (gross_cost * revenue_share_pct / Decimal("100")).quantize(Decimal("0.000001"))
    platform_share = gross_cost - publisher_share
    return publisher_share, platform_share


async def apply_ad_spend(
    db: AsyncSession,
    campaign: Campaign,
    slot: AdSlot,
    gross_cost: Decimal,
    event_type: str,
    reference_id: str,
    live_campaign_id: uuid.UUID | None = None,
) -> tuple[bool, Decimal]:
    if gross_cost <= Decimal("0") or not live_campaign_id:
        return False, Decimal("0")

    revenue_share_pct = Decimal(str(slot.revenue_share_percent))
    publisher_share, _ = split_revenue(gross_cost, revenue_share_pct)

    result = await db.execute(select(AdvertiserWallet).where(AdvertiserWallet.user_id == campaign.user_id))
    wallet = result.scalar_one_or_none()

    if not wallet or wallet.balance < gross_cost:
        campaign.is_active = False
        campaign.status = CampaignStatus.ENDED
        logger.warning("Insufficient balance, campaign paused", campaign_id=str(campaign.id))
        return False, Decimal("0")

    wallet.balance -= gross_cost
    wallet.total_spent += gross_cost
    db.add(
        AdvertiserTransaction(
            wallet_id=wallet.id,
            campaign_id=campaign.id,
            tx_type=f"spend_{event_type}",
            amount=-gross_cost,
            description=f"{event_type.upper()} spend on slot {slot.id}",
            reference_id=reference_id[:255],
        )
    )

    campaign.spent_amount = campaign.spent_amount + gross_cost
    if event_type == "impression":
        campaign.impressions_count = campaign.impressions_count + 1
    elif event_type == "click":
        campaign.clicks_count = campaign.clicks_count + 1

    if campaign.spent_amount >= campaign.total_budget:
        campaign.status = CampaignStatus.ENDED
        campaign.is_active = False
        logger.info("Campaign budget exhausted", campaign_id=str(campaign.id))

    now = datetime.now(timezone.utc)
    hour_bucket = now.strftime("%Y%m%d%H")
    pacing_counter = await db.scalar(
        select(PacingCounter).where(PacingCounter.campaign_id == campaign.id, PacingCounter.hour_bucket == hour_bucket)
    )
    if not pacing_counter:
        pacing_counter = PacingCounter(campaign_id=campaign.id, hour_bucket=hour_bucket, count=0, spend_amount=Decimal("0"))
        db.add(pacing_counter)
    pacing_counter.count += 1
    pacing_counter.spend_amount = Decimal(str(pacing_counter.spend_amount or 0)) + gross_cost

    db.add(
        BudgetLedger(
            campaign_id=live_campaign_id,
            amount=-gross_cost,
            entry_type=f"{event_type}_spend",
            description=f"{event_type.upper()} spend",
            reference_id=reference_id[:255],
        )
    )

    reservation = await db.scalar(
        select(SpendReservation)
        .where(
            SpendReservation.campaign_id == live_campaign_id,
            SpendReservation.released_at.is_(None),
        )
        .order_by(SpendReservation.created_at.desc())
    )
    if reservation:
        reservation.actual_spend = Decimal(str(reservation.actual_spend or 0)) + gross_cost
        if reservation.actual_spend >= Decimal(str(reservation.reserved_amount or 0)):
            reservation.released_at = datetime.now(timezone.utc)

    result = await db.execute(select(Placement).where(Placement.id == slot.placement_id))
    placement = result.scalar_one_or_none()
    if placement and publisher_share > Decimal("0"):
        db.add(
            PublisherEarning(
                publisher_id=placement.publisher_id,
                slot_id=slot.id,
                campaign_id=campaign.id,
                event_type=event_type,
                amount=publisher_share,
                reference_id=reference_id[:255],
            )
        )

    return True, publisher_share


async def write_delivery_log(
    db: AsyncSession,
    event_type: str,
    campaign_id,
    ad_id,
    slot_id,
    gross_cost: Decimal,
    publisher_share: Decimal,
    ad_request_id=None,
    description: Optional[str] = None,
) -> None:
    db.add(
        DeliveryLog(
            event_type=event_type,
            ad_request_id=ad_request_id,
            campaign_id=campaign_id,
            ad_id=ad_id,
            slot_id=slot_id,
            gross_cost=gross_cost,
            publisher_share=publisher_share,
            description=description or f"{event_type} event",
        )
    )
