from decimal import Decimal
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
import structlog

from app.dependencies import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.publisher import PublisherProfile, PublisherStatus, PublisherTier, SiteStatus, PublisherSite, Placement, AdSlot
from app.models.adnet import Campaign, CampaignStatus, PublisherPayout, PublisherEarning, AdvertiserWallet, DeliveryLog
from app.models.finance import ModerationReview, ModerationDecision, ModerationItemType, FraudSignal

router = APIRouter(prefix="/admin", tags=["admin"])
logger = structlog.get_logger()


def _require_admin(user: User):
    if user.role not in (UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER):
        raise HTTPException(status_code=403, detail="Admin only")


# ── Schemas ────────────────────────────────────────────────────────────────────

class NetworkOverview(BaseModel):
    total_campaigns: int
    active_campaigns: int
    total_publishers: int
    approved_publishers: int
    pending_publishers: int
    total_impressions: int
    total_clicks: int
    total_spend: float
    total_publisher_earnings: float
    payout_requests: int


class PublisherAdminResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    company_name: str
    contact_email: str
    status: str
    tier: str
    revenue_share_pct: float
    rejection_reason: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


class FraudSignalResponse(BaseModel):
    id: uuid.UUID
    signal_type: str
    severity: int
    description: Optional[str]
    signal_data: Optional[dict]
    campaign_id: Optional[uuid.UUID]
    live_campaign_id: Optional[uuid.UUID]
    slot_id: Optional[uuid.UUID]
    is_reviewed: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class PayoutAdminResponse(BaseModel):
    id: uuid.UUID
    publisher_id: uuid.UUID
    gross_earnings: Decimal
    publisher_share: Decimal
    platform_share: Decimal
    status: str
    period_start: datetime
    period_end: datetime
    paid_at: Optional[datetime]
    created_at: datetime
    model_config = {"from_attributes": True}


class FinanceOverview(BaseModel):
    total_advertiser_spend: float
    total_publisher_earnings: float
    platform_margin_estimate: float
    payout_requests: int


# ── Network Overview ───────────────────────────────────────────────────────────

@router.get("/overview", response_model=NetworkOverview)
async def get_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)

    total_campaigns = (await db.execute(select(func.count(Campaign.id)))).scalar_one() or 0
    active_campaigns = (await db.execute(
        select(func.count(Campaign.id)).where(Campaign.status == CampaignStatus.ACTIVE)
    )).scalar_one() or 0

    total_publishers = (await db.execute(select(func.count(PublisherProfile.id)))).scalar_one() or 0
    approved_publishers = (await db.execute(
        select(func.count(PublisherProfile.id)).where(PublisherProfile.status == PublisherStatus.APPROVED)
    )).scalar_one() or 0
    pending_publishers = (await db.execute(
        select(func.count(PublisherProfile.id)).where(PublisherProfile.status == PublisherStatus.PENDING)
    )).scalar_one() or 0

    total_impressions = (await db.execute(select(func.sum(Campaign.impressions_count)))).scalar_one() or 0
    total_clicks = (await db.execute(select(func.sum(Campaign.clicks_count)))).scalar_one() or 0
    total_spend = float((await db.execute(select(func.sum(Campaign.spent_amount)))).scalar_one() or 0)

    total_publisher_earnings = float((await db.execute(
        select(func.sum(PublisherEarning.amount))
    )).scalar_one() or 0)

    payout_requests = (await db.execute(
        select(func.count(PublisherPayout.id)).where(PublisherPayout.status == "pending")
    )).scalar_one() or 0

    return NetworkOverview(
        total_campaigns=total_campaigns,
        active_campaigns=active_campaigns,
        total_publishers=total_publishers,
        approved_publishers=approved_publishers,
        pending_publishers=pending_publishers,
        total_impressions=int(total_impressions),
        total_clicks=int(total_clicks),
        total_spend=total_spend,
        total_publisher_earnings=total_publisher_earnings,
        payout_requests=payout_requests,
    )


# ── Campaign Management ────────────────────────────────────────────────────────

@router.get("/campaigns")
async def list_campaigns(
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    query = select(Campaign)
    if status_filter:
        query = query.where(Campaign.status == status_filter.upper())
    result = await db.execute(query.order_by(Campaign.created_at.desc()))
    campaigns = result.scalars().all()
    return [
        {
            "id": str(c.id), "title": c.title, "status": c.status.value,
            "pricing_model": c.pricing_model, "total_budget": float(c.total_budget),
            "spent_amount": float(c.spent_amount), "is_active": c.is_active,
            "impressions_count": c.impressions_count, "clicks_count": c.clicks_count,
            "created_at": c.created_at.isoformat(),
        }
        for c in campaigns
    ]


@router.post("/campaigns/{campaign_id}/activate")
async def activate_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.status = CampaignStatus.ACTIVE
    campaign.is_active = True
    await db.flush()
    logger.info("Campaign activated", campaign_id=str(campaign_id), admin=str(current_user.id))
    return {"id": str(campaign.id), "status": campaign.status.value}


@router.post("/campaigns/{campaign_id}/pause")
async def pause_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.status = CampaignStatus.PAUSED
    campaign.is_active = False
    await db.flush()
    return {"id": str(campaign.id), "status": campaign.status.value}


# ── Publisher Management ───────────────────────────────────────────────────────

@router.get("/publishers", response_model=List[PublisherAdminResponse])
async def list_publishers(
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    query = select(PublisherProfile)
    if status_filter:
        query = query.where(PublisherProfile.status == status_filter.upper())
    result = await db.execute(query.order_by(PublisherProfile.created_at.desc()))
    return result.scalars().all()


@router.post("/publishers/{publisher_id}/approve", response_model=PublisherAdminResponse)
async def approve_publisher(
    publisher_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    result = await db.execute(select(PublisherProfile).where(PublisherProfile.id == publisher_id))
    publisher = result.scalar_one_or_none()
    if not publisher:
        raise HTTPException(status_code=404, detail="Publisher not found")
    publisher.status = PublisherStatus.APPROVED
    publisher.rejection_reason = None
    await db.flush()
    await db.refresh(publisher)
    logger.info("Publisher approved", publisher_id=str(publisher_id))
    return publisher


@router.post("/publishers/{publisher_id}/reject", response_model=PublisherAdminResponse)
async def reject_publisher(
    publisher_id: uuid.UUID,
    reason: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    result = await db.execute(select(PublisherProfile).where(PublisherProfile.id == publisher_id))
    publisher = result.scalar_one_or_none()
    if not publisher:
        raise HTTPException(status_code=404, detail="Publisher not found")
    publisher.status = PublisherStatus.REJECTED
    publisher.rejection_reason = reason
    await db.flush()
    await db.refresh(publisher)
    return publisher


@router.post("/publishers/{publisher_id}/suspend", response_model=PublisherAdminResponse)
async def suspend_publisher(
    publisher_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    result = await db.execute(select(PublisherProfile).where(PublisherProfile.id == publisher_id))
    publisher = result.scalar_one_or_none()
    if not publisher:
        raise HTTPException(status_code=404, detail="Publisher not found")
    publisher.status = PublisherStatus.SUSPENDED
    await db.flush()
    await db.refresh(publisher)
    return publisher


# ── Fraud Signals ──────────────────────────────────────────────────────────────

@router.get("/fraud/signals", response_model=List[FraudSignalResponse])
async def list_fraud_signals(
    hours: int = 24,
    min_severity: int = 1,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=max(1, min(168, hours)))
    result = await db.execute(
        select(FraudSignal)
        .where(and_(FraudSignal.created_at >= cutoff, FraudSignal.severity >= min_severity))
        .order_by(FraudSignal.severity.desc(), FraudSignal.created_at.desc())
    )
    return result.scalars().all()


@router.patch("/fraud/signals/{signal_id}/review", response_model=FraudSignalResponse)
async def review_fraud_signal(
    signal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    result = await db.execute(select(FraudSignal).where(FraudSignal.id == signal_id))
    signal = result.scalar_one_or_none()
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    signal.is_reviewed = True
    await db.flush()
    await db.refresh(signal)
    return signal


# ── Payouts ────────────────────────────────────────────────────────────────────

@router.get("/payouts", response_model=List[PayoutAdminResponse])
async def list_all_payouts(
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    query = select(PublisherPayout).order_by(PublisherPayout.created_at.desc())
    if status_filter:
        query = query.where(PublisherPayout.status == status_filter)
    result = await db.execute(query)
    return result.scalars().all()


@router.patch("/payouts/{payout_id}/approve", response_model=PayoutAdminResponse)
async def approve_payout(
    payout_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    result = await db.execute(select(PublisherPayout).where(PublisherPayout.id == payout_id))
    payout = result.scalar_one_or_none()
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    if payout.status != "pending":
        raise HTTPException(status_code=400, detail="Payout not in pending state")
    payout.status = "paid"
    payout.paid_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(payout)
    logger.info("Payout approved", payout_id=str(payout_id))
    return payout


# ── Finance ────────────────────────────────────────────────────────────────────

@router.get("/finance", response_model=FinanceOverview)
async def get_finance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    total_spend = float((await db.execute(
        select(func.coalesce(func.sum(Campaign.spent_amount), 0))
    )).scalar_one() or 0)

    total_earnings = float((await db.execute(
        select(func.coalesce(func.sum(PublisherEarning.amount), 0))
    )).scalar_one() or 0)

    payout_requests = (await db.execute(
        select(func.count(PublisherPayout.id)).where(PublisherPayout.status == "pending")
    )).scalar_one() or 0

    return FinanceOverview(
        total_advertiser_spend=total_spend,
        total_publisher_earnings=total_earnings,
        platform_margin_estimate=max(0.0, total_spend - total_earnings),
        payout_requests=payout_requests,
    )
