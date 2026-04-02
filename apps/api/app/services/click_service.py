from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.adnet import AdRequest, Click, Campaign
from app.models.publisher import AdSlot
from app.services.token_service import verify_click_token
from app.services.finance_service import apply_ad_spend, write_delivery_log


async def record_click(db: AsyncSession, token: str):
    payload = verify_click_token(token)
    if not payload:
        raise ValueError("Invalid click token")

    request_id = payload.get("request_id")
    landing_url = payload.get("landing_url")
    ad_request = await db.scalar(select(AdRequest).where(AdRequest.id == request_id))
    if not ad_request or not ad_request.campaign_id or not ad_request.ad_id:
        raise ValueError("Invalid request")

    click = Click(
        request_id=ad_request.id,
        campaign_id=ad_request.campaign_id,
        ad_id=ad_request.ad_id,
        slot_id=ad_request.slot_id,
        session_id=ad_request.session_id,
    )
    db.add(click)

    campaign = await db.scalar(select(Campaign).where(Campaign.id == ad_request.campaign_id))
    slot = await db.scalar(select(AdSlot).where(AdSlot.id == ad_request.slot_id))
    if campaign and slot:
        gross_cost = Decimal(str(campaign.bid_amount or Decimal("0"))) * Decimal("2")
        publisher_share = await apply_ad_spend(
            db=db,
            campaign=campaign,
            slot=slot,
            gross_cost=gross_cost,
            event_type="click",
            reference_id=str(click.id),
        )
        await write_delivery_log(
            db=db,
            event_type="click",
            campaign_id=campaign.id,
            ad_id=ad_request.ad_id,
            slot_id=ad_request.slot_id,
            gross_cost=gross_cost,
            publisher_share=publisher_share,
            request_id=ad_request.id,
        )

    await db.flush()
    return click, landing_url
