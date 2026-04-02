"""Ad selection service: find and score the best eligible ad for a slot."""
import random
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import structlog

from app.models.publisher import AdSlot, Placement, PublisherProfile, PublisherSite, PublisherStatus
from app.models.adnet import Campaign, CampaignStatus, Ad, AdRequest
from app.services.token_service import create_click_token

logger = structlog.get_logger()

_SCORE_WEIGHT_BID = 10
_SCORE_WEIGHT_BUDGET = 20
_SCORE_WEIGHT_NOISE = 5


def _score_campaign(campaign: Campaign, random_factor: float) -> float:
    remaining = float(campaign.total_budget) - float(campaign.spent_amount)
    budget_ratio = min(remaining / max(float(campaign.total_budget), 1.0), 1.0)
    return (
        float(campaign.bid_amount) * _SCORE_WEIGHT_BID
        + budget_ratio * _SCORE_WEIGHT_BUDGET
        + random_factor * _SCORE_WEIGHT_NOISE
    )


async def _record_no_fill(db, slot_id, session_id, page_url, country, device):
    db.add(AdRequest(
        slot_id=slot_id, request_status="no_fill",
        session_id=session_id, page_url=page_url, country=country, device=device,
    ))
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

    result = await db.execute(select(PublisherProfile).where(
        PublisherProfile.id == placement.publisher_id,
        PublisherProfile.status == PublisherStatus.APPROVED,
    ))
    if not result.scalar_one_or_none():
        await _record_no_fill(db, slot.id, session_id, page_url, country, device)
        return None

    conditions = [
        Campaign.status == CampaignStatus.ACTIVE,
        Campaign.is_active.is_(True),
        Campaign.spent_amount < Campaign.total_budget,
        (Campaign.start_at.is_(None)) | (Campaign.start_at <= now),
        (Campaign.end_at.is_(None)) | (Campaign.end_at >= now),
    ]
    result = await db.execute(select(Campaign).where(and_(*conditions)))
    candidates = list(result.scalars().all())

    eligible = []
    for c in candidates:
        if country and c.target_countries and country not in c.target_countries:
            continue
        if device and c.target_devices and device not in c.target_devices:
            continue
        if slot.category and c.category and c.category != slot.category:
            continue
        eligible.append(c)

    if not eligible:
        await _record_no_fill(db, slot.id, session_id, page_url, country, device)
        return None

    campaigns_with_ads = []
    for c in eligible:
        result = await db.execute(select(Ad).where(Ad.campaign_id == c.id, Ad.is_active.is_(True)).limit(1))
        ad = result.scalar_one_or_none()
        if ad:
            campaigns_with_ads.append((c, ad))

    if not campaigns_with_ads:
        await _record_no_fill(db, slot.id, session_id, page_url, country, device)
        return None

    try:
        from app.services.ai_matching import score_slot_campaign_match
        ai_scored = []
        for c, ad in campaigns_with_ads:
            base_score = _score_campaign(c, random.random())
            try:
                ai_boost = await score_slot_campaign_match(slot, c, db)
            except Exception:
                ai_boost = 0.5
            ai_scored.append((c, ad, base_score * (1 + ai_boost)))
        ai_scored.sort(key=lambda x: x[2], reverse=True)
        selected_campaign, selected_ad, _ = ai_scored[0]
    except Exception:
        scored = [(c, ad, _score_campaign(c, random.random())) for c, ad in campaigns_with_ads]
        scored.sort(key=lambda x: x[2], reverse=True)
        selected_campaign, selected_ad, _ = scored[0]

    ad_request = AdRequest(
        slot_id=slot.id, campaign_id=selected_campaign.id, ad_id=selected_ad.id,
        request_status="filled", session_id=session_id, page_url=page_url,
        country=country, device=device,
    )
    db.add(ad_request)
    await db.flush()
    await db.refresh(ad_request)

    click_token = create_click_token(
        request_id=str(ad_request.id), campaign_id=str(selected_campaign.id),
        ad_id=str(selected_ad.id), slot_id=str(slot.id), landing_url=selected_campaign.landing_url,
    )
    ad_request.click_token = click_token
    await db.flush()

    slot_format = slot.format.value if slot.format else "BANNER"
    logger.info("Ad selected", request_id=str(ad_request.id), campaign_id=str(selected_campaign.id))

    return {
        "request_id": str(ad_request.id),
        "ad_id": str(selected_ad.id),
        "campaign_id": str(selected_campaign.id),
        "headline": selected_ad.headline,
        "body": selected_ad.body,
        "cta": selected_ad.cta,
        "image_url": selected_ad.image_url,
        "click_url": f"/api/v1/track/click/{click_token}",
        "impression_url": "/api/v1/track/impression",
        "format": slot_format,
        "tracking_data": {
            "request_id": str(ad_request.id),
            "campaign_id": str(selected_campaign.id),
            "ad_id": str(selected_ad.id),
            "slot_id": str(slot.id),
        },
    }
