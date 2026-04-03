import json
import os
import uuid
from typing import Any

import google.generativeai as genai
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.adnet import Ad, Campaign, CampaignStatus
from app.models.briefing import AdBrief, BriefGeneratedOutput, BriefGenerationRun, BriefStatus, GeneratedItemType
from app.models.delivery import ApprovalStatus, LiveCampaign, LiveCampaignStatus, RuntimePricingModel
from app.models.user import User, UserRole


def _prompt_for_brief(brief: AdBrief) -> str:
    return (
        "You are AdGenius creative strategist. Return ONLY valid JSON with keys analysis, angles, copies, concepts. "
        "analysis is object with summary and opportunities. "
        "angles is array of objects with title and rationale. "
        "copies is array of objects with headline, body, cta. "
        "concepts is array of objects with name, visual_direction, hook.\n"
        f"Business: {brief.business_name}\n"
        f"Sector: {brief.sector}\nOffer: {brief.offer_summary}\n"
        f"Audience: {brief.target_audience}\nGoal: {brief.goal}\n"
        f"Competitors: {brief.competitor_examples or ''}\nTone: {brief.tone_notes or ''}"
    )


async def get_or_create_demo_user(db: AsyncSession, role: UserRole = UserRole.ADVERTISER) -> User:
    existing = await db.scalar(select(User).where(User.role == role).order_by(User.created_at.asc()))
    if existing:
        return existing
    suffix = "advertiser" if role == UserRole.ADVERTISER else "publisher"
    user = User(
        email=f"{suffix}@adgenius.local",
        hashed_password="not-used",
        full_name=f"Demo {suffix.title()}",
        role=role,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    return user


async def generate_for_brief(db: AsyncSession, brief: AdBrief) -> BriefGenerationRun:
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set")

    brief.status = BriefStatus.PROCESSING
    run = BriefGenerationRun(brief_id=brief.id, status=BriefStatus.PROCESSING, model_name="gemini-2.5-pro")
    db.add(run)
    await db.flush()

    prompt = _prompt_for_brief(brief)
    run.prompt = prompt

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.5-pro")

    try:
        resp = model.generate_content(prompt)
        text = (resp.text or "{}").strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"):
                text = text[4:].strip()
        payload = json.loads(text)

        # clear previous outputs to keep the latest studio deterministic
        old = await db.execute(select(BriefGeneratedOutput).where(BriefGeneratedOutput.brief_id == brief.id))
        for row in old.scalars().all():
            await db.delete(row)

        analysis = payload.get("analysis") or {}
        brief.metadata = {"analysis": analysis}

        for angle in payload.get("angles", [])[:8]:
            db.add(
                BriefGeneratedOutput(
                    brief_id=brief.id,
                    run_id=run.id,
                    output_type=GeneratedItemType.ANGLE,
                    title=angle.get("title", "Angle"),
                    content=angle.get("rationale", ""),
                    extra_data=angle,
                )
            )

        for item in payload.get("copies", [])[:12]:
            db.add(
                BriefGeneratedOutput(
                    brief_id=brief.id,
                    run_id=run.id,
                    output_type=GeneratedItemType.COPY,
                    title=item.get("headline", "Copy Variant"),
                    content=item.get("body", ""),
                    extra_data={"cta": item.get("cta", "Learn more")},
                )
            )

        for concept in payload.get("concepts", [])[:8]:
            db.add(
                BriefGeneratedOutput(
                    brief_id=brief.id,
                    run_id=run.id,
                    output_type=GeneratedItemType.CONCEPT,
                    title=concept.get("name", "Creative Concept"),
                    content=concept.get("visual_direction", ""),
                    extra_data={"hook": concept.get("hook")},
                )
            )

        brief.status = BriefStatus.COMPLETED
        run.status = BriefStatus.COMPLETED
        run.raw_response = payload
    except Exception as exc:  # noqa: BLE001
        brief.status = BriefStatus.FAILED
        run.status = BriefStatus.FAILED
        run.error_message = str(exc)
        raise

    await db.flush()
    return run


async def create_campaign_from_brief(db: AsyncSession, brief: AdBrief, advertiser_id: uuid.UUID) -> dict[str, Any]:
    selected = await db.execute(
        select(BriefGeneratedOutput).where(
            BriefGeneratedOutput.brief_id == brief.id,
            BriefGeneratedOutput.is_selected.is_(True),
        )
    )
    selected_items = selected.scalars().all()

    copy_item = next((x for x in selected_items if x.output_type == GeneratedItemType.COPY), None)
    concept_item = next((x for x in selected_items if x.output_type == GeneratedItemType.CONCEPT), None)

    campaign = Campaign(
        user_id=advertiser_id,
        title=f"{brief.business_name} - {brief.goal[:50]}",
        status=CampaignStatus.ACTIVE,
        pricing_model="CPC",
        total_budget=500,
        bid_amount=1,
        landing_url="https://example.com/landing",
        category=brief.sector,
    )
    db.add(campaign)
    await db.flush()

    ad = Ad(
        campaign_id=campaign.id,
        headline=(copy_item.title if copy_item else f"{brief.business_name} campaign")[:255],
        body=(copy_item.content if copy_item else brief.offer_summary)[:1000],
        cta=((copy_item.extra_data or {}).get("cta") if copy_item else "Learn more") or "Learn more",
        image_url=None,
        is_active=True,
    )
    db.add(ad)
    await db.flush()

    live = LiveCampaign(
        campaign_id=campaign.id,
        campaign_brief_id=None,
        name=f"{campaign.title} Live",
        ad_id=ad.id,
        pricing_model=RuntimePricingModel.CPC,
        cpc_rate=campaign.bid_amount,
        total_budget=campaign.total_budget,
        spent_amount=0,
        target_categories=[brief.sector] if brief.sector else None,
        target_regions=["US"],
        target_formats=["BANNER", "NATIVE", "VIDEO"],
        runtime_targeting={"goal": brief.goal, "concept": concept_item.content if concept_item else None},
        priority=10,
        is_approved=True,
        approval_status=ApprovalStatus.APPROVED,
        status=LiveCampaignStatus.ACTIVE,
    )
    db.add(live)
    await db.flush()

    return {
        "campaign_id": str(campaign.id),
        "live_campaign_id": str(live.id),
        "ad_id": str(ad.id),
        "campaign_status": campaign.status.value,
        "live_status": live.status.value,
    }
