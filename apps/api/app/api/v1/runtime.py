"""Runtime, AI generation and governance aligned endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.adnet import Campaign, PricingModel
from app.models.campaign import CampaignBrief
from app.models.delivery import ApprovalStatus, LiveCampaign, LiveCampaignStatus
from app.models.generation import GeneratedAdSet, GeneratedAdVariant, GenerationJob
from app.models.user import User

router = APIRouter(prefix="/runtime", tags=["runtime"])


class LiveCampaignIn(BaseModel):
    campaign_id: str
    campaign_brief_id: str | None = None
    ad_set_id: str | None = None
    ad_variant_id: str | None = None
    ad_id: str | None = None
    pricing_model: str = "CPC"
    cpm_rate: float = 0
    cpc_rate: float = 0
    daily_budget_cap: float | None = None
    total_budget_cap: float | None = None
    target_regions: list[str] | None = None
    target_formats: list[str] | None = None
    runtime_targeting: dict | None = None
    frequency_cap_per_user: int | None = None
    priority: int = 0
    status: str = "PENDING"
    approval_status: str = "PENDING"


class GenerationJobIn(BaseModel):
    campaign_id: str
    campaign_brief_id: str | None = None
    prompt: str | None = None
    model_name: str = "gemini-2.5-pro"


@router.post("/live-campaigns", status_code=status.HTTP_201_CREATED)
async def create_live_campaign(payload: LiveCampaignIn, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    campaign = await db.scalar(select(Campaign).where(Campaign.id == payload.campaign_id))
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    live = LiveCampaign(
        campaign_id=payload.campaign_id,
        campaign_brief_id=payload.campaign_brief_id,
        ad_set_id=payload.ad_set_id,
        ad_variant_id=payload.ad_variant_id,
        ad_id=payload.ad_id,
        pricing_model=payload.pricing_model.upper(),
        cpm_rate=payload.cpm_rate,
        cpc_rate=payload.cpc_rate,
        daily_budget_cap=payload.daily_budget_cap,
        total_budget_cap=payload.total_budget_cap,
        target_regions=payload.target_regions,
        target_formats=payload.target_formats,
        runtime_targeting=payload.runtime_targeting,
        frequency_cap_per_user=payload.frequency_cap_per_user,
        priority=payload.priority,
        status=LiveCampaignStatus(payload.status.upper()),
        approval_status=ApprovalStatus(payload.approval_status.upper()),
    )
    db.add(live)
    await db.flush()
    return {"id": str(live.id), "campaign_id": str(live.campaign_id), "status": live.status.value}


@router.get("/live-campaigns")
async def list_live_campaigns(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(LiveCampaign).order_by(LiveCampaign.created_at.desc()))
    return list(result.scalars().all())


@router.post("/generation/jobs", status_code=status.HTTP_201_CREATED)
async def create_generation_job(payload: GenerationJobIn, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    campaign = await db.scalar(select(Campaign).where(Campaign.id == payload.campaign_id))
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if payload.campaign_brief_id:
        brief = await db.scalar(select(CampaignBrief).where(CampaignBrief.id == payload.campaign_brief_id))
        if not brief:
            raise HTTPException(status_code=404, detail="Campaign brief not found")

    # Gemini-only policy: non-gemini values are normalized.
    model_name = payload.model_name if payload.model_name.lower().startswith("gemini") else "gemini-2.5-pro"
    job = GenerationJob(
        campaign_id=payload.campaign_id,
        campaign_brief_id=payload.campaign_brief_id,
        prompt=payload.prompt,
        model_name=model_name,
    )
    db.add(job)
    await db.flush()
    return {"id": str(job.id), "model_name": job.model_name, "status": job.status}


@router.post("/generation/jobs/{job_id}/publish", status_code=status.HTTP_201_CREATED)
async def publish_generation_output(job_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    job = await db.scalar(select(GenerationJob).where(GenerationJob.id == job_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    ad_set = await db.scalar(select(GeneratedAdSet).where(GeneratedAdSet.job_id == job.id).order_by(GeneratedAdSet.created_at.desc()))
    if not ad_set:
        raise HTTPException(status_code=400, detail="No generated ad set for job")
    ad_variant = await db.scalar(
        select(GeneratedAdVariant)
        .where(GeneratedAdVariant.ad_set_id == ad_set.id)
        .order_by(GeneratedAdVariant.created_at.desc())
    )

    campaign = await db.scalar(select(Campaign).where(Campaign.id == job.campaign_id))
    live = LiveCampaign(
        campaign_id=job.campaign_id,
        campaign_brief_id=job.campaign_brief_id,
        ad_set_id=ad_set.id,
        ad_variant_id=getattr(ad_variant, "id", None),
        pricing_model=(campaign.pricing_model.value if isinstance(campaign.pricing_model, PricingModel) else str(campaign.pricing_model)).upper(),
        cpc_rate=float(campaign.bid_amount or 0),
        status=LiveCampaignStatus.READY,
        approval_status=ApprovalStatus.PENDING,
    )
    db.add(live)
    await db.flush()
    return {"live_campaign_id": str(live.id), "from_job_id": str(job.id), "status": live.status.value}
