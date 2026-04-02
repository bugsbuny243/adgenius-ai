from decimal import Decimal
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.publisher import PublisherProfile, PublisherStatus, SiteStatus
from app.models.adnet import Campaign, CampaignStatus, PublisherPayout, PayoutStatus, DeliveryLog

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(user: User):
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")


@router.get("/overview")
async def overview(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    campaigns = await db.scalar(select(func.count(Campaign.id)))
    publishers = await db.scalar(select(func.count(PublisherProfile.id)))
    active_campaigns = await db.scalar(select(func.count(Campaign.id)).where(Campaign.status == CampaignStatus.ACTIVE))
    pending_publishers = await db.scalar(select(func.count(PublisherProfile.id)).where(PublisherProfile.status == PublisherStatus.PENDING))
    return {
        "campaigns": campaigns,
        "active_campaigns": active_campaigns,
        "publishers": publishers,
        "pending_publishers": pending_publishers,
    }


@router.get("/campaigns")
async def campaigns(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    result = await db.execute(select(Campaign).order_by(Campaign.created_at.desc()))
    return list(result.scalars().all())


@router.post("/campaigns/{campaign_id}/activate")
async def activate_campaign(campaign_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    campaign = await db.scalar(select(Campaign).where(Campaign.id == uuid.UUID(campaign_id)))
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.status = CampaignStatus.ACTIVE
    campaign.is_active = True
    await db.flush()
    return {"activated": str(campaign.id)}


@router.get("/publishers")
async def publishers(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    result = await db.execute(select(PublisherProfile).order_by(PublisherProfile.created_at.desc()))
    return list(result.scalars().all())


@router.post("/publishers/{publisher_id}/approve")
async def approve_publisher(publisher_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    publisher = await db.scalar(select(PublisherProfile).where(PublisherProfile.id == uuid.UUID(publisher_id)))
    if not publisher:
        raise HTTPException(status_code=404, detail="Publisher not found")
    publisher.status = PublisherStatus.APPROVED
    await db.flush()
    return {"approved": str(publisher.id)}


@router.get("/fraud/signals")
async def fraud_signals(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    result = await db.execute(select(DeliveryLog).where(DeliveryLog.event_type == "fraud").order_by(DeliveryLog.created_at.desc()))
    return list(result.scalars().all())


@router.get("/finance")
async def finance(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    total_payout = await db.scalar(select(func.coalesce(func.sum(PublisherPayout.publisher_share), 0)).where(PublisherPayout.status == PayoutStatus.APPROVED))
    pending_payout = await db.scalar(select(func.coalesce(func.sum(PublisherPayout.publisher_share), 0)).where(PublisherPayout.status == PayoutStatus.PENDING))
    return {
        "approved_payouts": total_payout or Decimal("0"),
        "pending_payouts": pending_payout or Decimal("0"),
        "site_statuses": [s.value for s in SiteStatus],
    }


@router.patch("/payouts/{id}/approve")
async def approve_payout(id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    payout = await db.scalar(select(PublisherPayout).where(PublisherPayout.id == uuid.UUID(id)))
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    payout.status = PayoutStatus.APPROVED
    await db.flush()
    return {"approved_payout": str(payout.id)}


@router.get("/payouts")
async def payouts(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    result = await db.execute(select(PublisherPayout).order_by(PublisherPayout.created_at.desc()))
    return list(result.scalars().all())
