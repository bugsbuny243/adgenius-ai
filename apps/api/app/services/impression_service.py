from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.adnet import AdRequest, Impression
from app.models.delivery import AdImpression, LiveCampaign
from app.models.publisher import AdSlot
from app.services.finance_service import apply_ad_spend, write_delivery_log


async def record_impression(db: AsyncSession, ad_request_id: str, session_id: str | None = None) -> Impression:
    ad_request = await db.scalar(select(AdRequest).where(AdRequest.id == ad_request_id))
    if not ad_request or not ad_request.campaign_id:
        raise ValueError("Invalid ad_request_id")

    from app.models.adnet import Campaign

    campaign = await db.scalar(select(Campaign).where(Campaign.id == ad_request.campaign_id))
    slot = await db.scalar(select(AdSlot).where(AdSlot.id == ad_request.slot_id))
    live_campaign = await db.scalar(select(LiveCampaign).where(LiveCampaign.id == ad_request.live_campaign_id)) if ad_request.live_campaign_id else None

    if live_campaign and str(live_campaign.pricing_model).upper() == "CPM" and live_campaign.cpm_rate:
        gross_cost = Decimal(str(live_campaign.cpm_rate)) / Decimal("1000")
    elif live_campaign and live_campaign.cpc_rate:
        gross_cost = Decimal(str(live_campaign.cpc_rate))
    else:
        gross_cost = Decimal(str(campaign.bid_amount or Decimal("0"))) if campaign else Decimal("0")

    publisher_share = Decimal("0")
    if campaign and slot:
        publisher_share = await apply_ad_spend(
            db=db,
            campaign=campaign,
            slot=slot,
            gross_cost=gross_cost,
            event_type="impression",
            reference_id=str(ad_request.id),
        )

    impression = Impression(
        ad_request_id=ad_request.id,
        campaign_id=ad_request.campaign_id,
        slot_id=ad_request.slot_id,
        cost=gross_cost,
        publisher_earnings=publisher_share,
        site_url=ad_request.page_url,
    )
    db.add(impression)
    await db.flush()

    if ad_request.live_campaign_id:
        db.add(
            AdImpression(
                live_campaign_id=ad_request.live_campaign_id,
                ad_request_id=ad_request.id,
                ad_set_id=getattr(live_campaign, "ad_set_id", None),
                ad_variant_id=getattr(live_campaign, "ad_variant_id", None),
                ad_id=ad_request.ad_id,
                click_token=ad_request.click_token,
                country=ad_request.country,
                device=ad_request.device,
                telemetry={"session_id": session_id, "page_url": ad_request.page_url},
                occurred_at=datetime.utcnow(),
            )
        )

    if campaign and slot:
        await write_delivery_log(
            db=db,
            event_type="impression",
            campaign_id=campaign.id,
            ad_id=ad_request.ad_id,
            slot_id=ad_request.slot_id,
            gross_cost=gross_cost,
            publisher_share=publisher_share,
            ad_request_id=ad_request.id,
        )

    await db.flush()
    return impression
