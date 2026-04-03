"""Ad selection service using live_campaign runtime entities for serving decisions."""

import random
from datetime import datetime, timezone
from typing import Optional

import structlog
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import adnet as adnet_models
from app.models.delivery import ApprovalStatus, LiveCampaign, LiveCampaignStatus
from app.models.finance import SpendReservation
from app.models.publisher import AdSlot, Placement, PublisherProfile, PublisherSite, PublisherStatus
from app.services.token_service import create_click_token

logger = structlog.get_logger()

Ad = adnet_models.Ad
AdRequest = adnet_models.AdRequest
Campaign = adnet_models.Campaign
CampaignStatus = adnet_models.CampaignStatus

_DEFAULT_FILLED_STATUS = "FILLED"
_DEFAULT_NO_FILL_STATUS = "NO_FILL"
AdRequestStatus = getattr(adnet_models, "AdRequestStatus", None)
_FILLED_STATUS = getattr(AdRequestStatus, "FILLED", _DEFAULT_FILLED_STATUS)
_NO_FILL_STATUS = getattr(AdRequestStatus, "NO_FILL", _DEFAULT_NO_FILL_STATUS)

_SCORE_WEIGHT_BID = 10
_SCORE_WEIGHT_BUDGET = 20
_SCORE_WEIGHT_NOISE = 5


def _score_campaign(campaign: Campaign, random_factor: float, priority: int) -> float:
    remaining = float(campaign.total_budget) - float(campaign.spent_amount)
    budget_ratio = min(remaining / max(float(campaign.total_budget), 1.0), 1.0)
    return (
        float(campaign.bid_amount) * _SCORE_WEIGHT_BID
        + budget_ratio * _SCORE_WEIGHT_BUDGET
        + float(priority)
        + random_factor * _SCORE_WEIGHT_NOISE
    )


async def _record_no_fill(db, slot_id, session_id, page_url, country, device):
    db.add(
        AdRequest(
            slot_id=slot_id,
            request_status=_NO_FILL_STATUS,
            session_id=session_id,
            page_url=page_url,
            country=country,
            device=device,
        )
    )
    await db.flush()


async def select_best_ad(
    db: AsyncSession,
    slot_key: str,
    page_url: Optional[str] = None,
    session_id: Optional[str] = None,
    country: Optional[str] = None,
    device: Optional[str] = None,
) -> Optional[dict]:
    now = datetime.now(timezone.utc)

    result = await db.execute(select(AdSlot).where(AdSlot.slot_key == slot_key, AdSlot.is_active.is_(True)))
    slot = result.scalar_one_or_none()
    if not slot:
        return None

    result = await db.execute(select(Placement).where(Placement.id == slot.placement_id, Placement.is_active.is_(True)))
    placement = result.scalar_one_or_none()
    if not placement:
        await _record_no_fill(db, slot.id, session_id, page_url, country, device)
        return None

    if placement.site_id:
        result = await db.execute(select(PublisherSite).where(PublisherSite.id == placement.site_id, PublisherSite.is_active.is_(True)))
        if not result.scalar_one_or_none():
            await _record_no_fill(db, slot.id, session_id, page_url, country, device)
            return None

    result = await db.execute(
        select(PublisherProfile).where(
            PublisherProfile.id == placement.publisher_id,
            PublisherProfile.status == PublisherStatus.APPROVED,
        )
    )
    if not result.scalar_one_or_none():
        await _record_no_fill(db, slot.id, session_id, page_url, country, device)
        return None

    runtime_conditions = [
        (LiveCampaign.is_approved.is_(True)) | (LiveCampaign.approval_status == ApprovalStatus.APPROVED),
        LiveCampaign.status == LiveCampaignStatus.ACTIVE,
    ]
    result = await db.execute(select(LiveCampaign).where(and_(*runtime_conditions)))
    live_candidates = list(result.scalars().all())

    candidates: list[tuple[LiveCampaign, Campaign, Ad]] = []
    for live in live_candidates:
        campaign = await db.scalar(
            select(Campaign).where(
                Campaign.id == live.campaign_id,
                Campaign.status == CampaignStatus.ACTIVE,
                Campaign.is_active.is_(True),
                Campaign.spent_amount < Campaign.total_budget,
                (Campaign.start_at.is_(None)) | (Campaign.start_at <= now),
                (Campaign.end_at.is_(None)) | (Campaign.end_at >= now),
            )
        )
        if not campaign:
            continue

        if country and live.target_regions and country not in live.target_regions:
            continue
        if device and campaign.target_devices and device not in campaign.target_devices:
            continue
        if slot.format and live.target_formats and slot.format.value not in live.target_formats:
            continue
        if slot.category and campaign.category and campaign.category != slot.category:
            continue

        ad = await db.scalar(select(Ad).where(Ad.id == live.ad_id, Ad.is_active.is_(True))) if live.ad_id else None
        if not ad:
            ad = await db.scalar(select(Ad).where(Ad.campaign_id == campaign.id, Ad.is_active.is_(True)).limit(1))
        if not ad:
            continue

        candidates.append((live, campaign, ad))

    if not candidates:
        await _record_no_fill(db, slot.id, session_id, page_url, country, device)
        return None

    scored = [(live, campaign, ad, _score_campaign(campaign, random.random(), live.priority)) for live, campaign, ad in candidates]
    scored.sort(key=lambda x: x[3], reverse=True)
    selected_live, selected_campaign, selected_ad, _ = scored[0]

    ad_request = AdRequest(
        slot_id=slot.id,
        campaign_id=selected_campaign.id,
        live_campaign_id=selected_live.id,
        ad_id=selected_ad.id,
        request_status=_FILLED_STATUS,
        session_id=session_id,
        page_url=page_url,
        country=country,
        device=device,
    )
    db.add(ad_request)
    await db.flush()
    await db.refresh(ad_request)

    estimated_reservation = float(selected_live.cpm_rate or selected_live.cpc_rate or selected_campaign.bid_amount or 0)
    db.add(
        SpendReservation(
            campaign_id=selected_campaign.id,
            ad_request_id=ad_request.id,
            amount=estimated_reservation,
            status="reserved",
        )
    )

    click_token = create_click_token(
        request_id=str(ad_request.id),
        campaign_id=str(selected_campaign.id),
        ad_id=str(selected_ad.id),
        slot_id=str(slot.id),
        landing_url=selected_campaign.landing_url,
    )
    ad_request.click_token = click_token
    await db.flush()

    slot_format = slot.format.value if slot.format else "BANNER"
    logger.info(
        "Ad selected",
        request_id=str(ad_request.id),
        campaign_id=str(selected_campaign.id),
        live_campaign_id=str(selected_live.id),
    )

    return {
        "ad_request_id": str(ad_request.id),
        "campaign_id": str(selected_campaign.id),
        "live_campaign_id": str(selected_live.id),
        "ad_id": str(selected_ad.id),
        "headline": selected_ad.headline,
        "body": selected_ad.body,
        "cta": selected_ad.cta,
        "image_url": selected_ad.image_url,
        "click_url": f"/api/v1/track/click/{click_token}",
        "impression_url": "/api/v1/track/impression",
        "format": slot_format,
        "tracking_data": {
            "ad_request_id": str(ad_request.id),
            "campaign_id": str(selected_campaign.id),
            "live_campaign_id": str(selected_live.id),
            "ad_id": str(selected_ad.id),
            "slot_id": str(slot.id),
        },
    }
