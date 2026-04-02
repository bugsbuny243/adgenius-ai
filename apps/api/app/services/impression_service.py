from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.adnet import AdRequest, Impression
from app.models.publisher import AdSlot
from app.services.finance_service import apply_ad_spend, write_delivery_log
from decimal import Decimal


async def record_impression(db: AsyncSession, request_id: str, session_id: str | None = None) -> Impression:
    ad_request = await db.scalar(select(AdRequest).where(AdRequest.id == request_id))
    if not ad_request or not ad_request.campaign_id or not ad_request.ad_id:
        raise ValueError("Invalid request_id")

    impression = Impression(
        request_id=ad_request.id,
        campaign_id=ad_request.campaign_id,
        ad_id=ad_request.ad_id,
        slot_id=ad_request.slot_id,
        session_id=session_id,
    )
    db.add(impression)

    from app.models.adnet import Campaign
    campaign = await db.scalar(select(Campaign).where(Campaign.id == ad_request.campaign_id))
    slot = await db.scalar(select(AdSlot).where(AdSlot.id == ad_request.slot_id))

    if campaign and slot:
        gross_cost = Decimal(str(campaign.bid_amount or Decimal("0")))
        publisher_share = await apply_ad_spend(
            db=db,
            campaign=campaign,
            slot=slot,
            gross_cost=gross_cost,
            event_type="impression",
            reference_id=str(impression.id),
        )
        await write_delivery_log(
            db=db,
            event_type="impression",
            campaign_id=campaign.id,
            ad_id=ad_request.ad_id,
            slot_id=ad_request.slot_id,
            gross_cost=gross_cost,
            publisher_share=publisher_share,
            request_id=ad_request.id,
        )

    await db.flush()
    return impression
