from decimal import Decimal
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User, UserRole, Workspace
from app.models.publisher import PublisherProfile
from app.models.adnet import (
    Campaign,
    CampaignStatus,
    Ad,
    AdvertiserWallet,
    AdvertiserTransaction,
    PublisherEarning,
    PublisherPayout,
    PayoutStatus,
)

router = APIRouter(tags=["adnet"])


class CampaignIn(BaseModel):
    name: str
    total_budget: Decimal
    bid_amount: Decimal = Decimal("0.01")
    landing_url: str
    category: str | None = None


class CampaignOut(BaseModel):
    id: str
    name: str
    status: str
    total_budget: Decimal
    spent_amount: Decimal
    bid_amount: Decimal
    landing_url: str
    category: str | None = None

    model_config = {"from_attributes": True}


class AdIn(BaseModel):
    headline: str
    body: str
    cta: str = "Learn more"
    image_url: str | None = None


class AdOut(BaseModel):
    id: str
    campaign_id: str
    headline: str
    body: str
    cta: str
    image_url: str | None = None
    is_active: bool

    model_config = {"from_attributes": True}


class WalletOut(BaseModel):
    id: str
    balance: Decimal
    total_deposit: Decimal
    total_spent: Decimal

    model_config = {"from_attributes": True}


class DepositIn(BaseModel):
    amount: Decimal


class PayoutIn(BaseModel):
    amount: Decimal


class PayoutOut(BaseModel):
    id: str
    publisher_id: str
    amount: Decimal
    status: str

    model_config = {"from_attributes": True}


def _ensure_admin(user: User):
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")


async def _get_workspace(db: AsyncSession, user_id):
    result = await db.execute(select(Workspace).where(Workspace.owner_id == user_id))
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=400, detail="Workspace not found")
    return workspace


@router.get("/advertiser/campaigns", response_model=list[CampaignOut])
async def list_campaigns(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Campaign).where(Campaign.user_id == current_user.id).order_by(Campaign.created_at.desc()))
    return [CampaignOut.model_validate(c) for c in result.scalars().all()]


@router.post("/advertiser/campaigns", response_model=CampaignOut, status_code=status.HTTP_201_CREATED)
async def create_campaign(payload: CampaignIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    workspace = await _get_workspace(db, current_user.id)
    campaign = Campaign(
        workspace_id=workspace.id,
        user_id=current_user.id,
        name=payload.name,
        total_budget=payload.total_budget,
        bid_amount=payload.bid_amount,
        landing_url=payload.landing_url,
        category=payload.category,
    )
    db.add(campaign)
    await db.flush()
    await db.refresh(campaign)
    return CampaignOut.model_validate(campaign)


@router.get("/advertiser/campaigns/{id}", response_model=CampaignOut)
async def get_campaign(id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    campaign = await db.scalar(select(Campaign).where(Campaign.id == uuid.UUID(id), Campaign.user_id == current_user.id))
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return CampaignOut.model_validate(campaign)


@router.put("/advertiser/campaigns/{id}", response_model=CampaignOut)
async def update_campaign(id: str, payload: CampaignIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    campaign = await db.scalar(select(Campaign).where(Campaign.id == uuid.UUID(id), Campaign.user_id == current_user.id))
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status == CampaignStatus.ACTIVE and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Active campaigns can only be set by admin")
    campaign.name = payload.name
    campaign.total_budget = payload.total_budget
    campaign.bid_amount = payload.bid_amount
    campaign.landing_url = payload.landing_url
    campaign.category = payload.category
    await db.flush()
    return CampaignOut.model_validate(campaign)


@router.delete("/advertiser/campaigns/{id}")
async def delete_campaign(id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    campaign = await db.scalar(select(Campaign).where(Campaign.id == uuid.UUID(id), Campaign.user_id == current_user.id))
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    await db.delete(campaign)
    return {"deleted": True}


@router.get("/advertiser/campaigns/{id}/ads", response_model=list[AdOut])
async def list_ads(id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    campaign = await db.scalar(select(Campaign).where(Campaign.id == uuid.UUID(id), Campaign.user_id == current_user.id))
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    result = await db.execute(select(Ad).where(Ad.campaign_id == campaign.id).order_by(Ad.created_at.desc()))
    return [AdOut.model_validate(a) for a in result.scalars().all()]


@router.post("/advertiser/campaigns/{id}/ads", response_model=AdOut, status_code=status.HTTP_201_CREATED)
async def create_ad(id: str, payload: AdIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    campaign = await db.scalar(select(Campaign).where(Campaign.id == uuid.UUID(id), Campaign.user_id == current_user.id))
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    ad = Ad(campaign_id=campaign.id, **payload.model_dump())
    db.add(ad)
    await db.flush()
    return AdOut.model_validate(ad)


@router.put("/advertiser/ads/{id}", response_model=AdOut)
async def update_ad(id: str, payload: AdIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Ad, Campaign).join(Campaign, Campaign.id == Ad.campaign_id).where(Ad.id == uuid.UUID(id), Campaign.user_id == current_user.id))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Ad not found")
    ad = row[0]
    ad.headline = payload.headline
    ad.body = payload.body
    ad.cta = payload.cta
    ad.image_url = payload.image_url
    await db.flush()
    return AdOut.model_validate(ad)


@router.delete("/advertiser/ads/{id}")
async def delete_ad(id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Ad, Campaign).join(Campaign, Campaign.id == Ad.campaign_id).where(Ad.id == uuid.UUID(id), Campaign.user_id == current_user.id))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Ad not found")
    await db.delete(row[0])
    return {"deleted": True}


@router.get("/advertiser/wallet", response_model=WalletOut)
async def wallet(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    wallet = await db.scalar(select(AdvertiserWallet).where(AdvertiserWallet.user_id == current_user.id))
    if not wallet:
        workspace = await _get_workspace(db, current_user.id)
        wallet = AdvertiserWallet(user_id=current_user.id, workspace_id=workspace.id)
        db.add(wallet)
        await db.flush()
    return WalletOut.model_validate(wallet)


@router.post("/advertiser/wallet/deposit", response_model=WalletOut)
async def wallet_deposit(payload: DepositIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    wallet = await db.scalar(select(AdvertiserWallet).where(AdvertiserWallet.user_id == current_user.id))
    if not wallet:
        workspace = await _get_workspace(db, current_user.id)
        wallet = AdvertiserWallet(user_id=current_user.id, workspace_id=workspace.id)
        db.add(wallet)
        await db.flush()
    wallet.balance += payload.amount
    wallet.total_deposit += payload.amount
    db.add(AdvertiserTransaction(wallet_id=wallet.id, tx_type="deposit", amount=payload.amount, description="Wallet deposit"))
    await db.flush()
    return WalletOut.model_validate(wallet)


@router.get("/advertiser/finance/dashboard")
async def finance_dashboard(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    wallet = await db.scalar(select(AdvertiserWallet).where(AdvertiserWallet.user_id == current_user.id))
    spend = await db.scalar(select(func.coalesce(func.sum(Campaign.spent_amount), 0)).where(Campaign.user_id == current_user.id))
    active = await db.scalar(select(func.count(Campaign.id)).where(Campaign.user_id == current_user.id, Campaign.status == CampaignStatus.ACTIVE))
    return {"balance": getattr(wallet, "balance", Decimal("0")), "total_spent": spend, "active_campaigns": active}


@router.get("/publisher/earnings")
async def publisher_earnings(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = await db.scalar(select(PublisherProfile).where(PublisherProfile.user_id == current_user.id))
    profile_id = profile.id if profile else uuid.uuid4()
    result = await db.execute(select(PublisherEarning).where(PublisherEarning.publisher_id == profile_id).order_by(PublisherEarning.created_at.desc()))
    return [{"id": str(e.id), "amount": e.amount, "event_type": e.event_type, "paid_out": e.paid_out} for e in result.scalars().all()]


@router.get("/publisher/earnings/dashboard")
async def publisher_earnings_dashboard(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = await db.scalar(select(PublisherProfile).where(PublisherProfile.user_id == current_user.id))
    if not profile:
        return {"total_earned": Decimal("0"), "available": Decimal("0"), "paid_out": Decimal("0")}
    total = await db.scalar(select(func.coalesce(func.sum(PublisherEarning.amount), 0)).where(PublisherEarning.publisher_id == profile.id))
    available = await db.scalar(select(func.coalesce(func.sum(PublisherEarning.amount), 0)).where(PublisherEarning.publisher_id == profile.id, PublisherEarning.paid_out.is_(False)))
    paid = total - available
    return {"total_earned": total, "available": available, "paid_out": paid}


@router.post("/publisher/payout/request", response_model=PayoutOut, status_code=status.HTTP_201_CREATED)
async def payout_request(payload: PayoutIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    profile = await db.scalar(select(PublisherProfile).where(PublisherProfile.user_id == current_user.id))
    if not profile:
        raise HTTPException(status_code=404, detail="Publisher profile not found")
    available = await db.scalar(select(func.coalesce(func.sum(PublisherEarning.amount), 0)).where(PublisherEarning.publisher_id == profile.id, PublisherEarning.paid_out.is_(False)))
    if payload.amount > available:
        raise HTTPException(status_code=400, detail="Insufficient available earnings")
    payout = PublisherPayout(publisher_id=profile.id, amount=payload.amount, status=PayoutStatus.PENDING)
    db.add(payout)
    await db.flush()
    return PayoutOut.model_validate(payout)


@router.get("/publisher/payouts", response_model=list[PayoutOut])
async def payout_list(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = await db.scalar(select(PublisherProfile).where(PublisherProfile.user_id == current_user.id))
    profile_id = profile.id if profile else uuid.uuid4()
    result = await db.execute(select(PublisherPayout).where(PublisherPayout.publisher_id == profile_id).order_by(PublisherPayout.created_at.desc()))
    return [PayoutOut.model_validate(p) for p in result.scalars().all()]


@router.patch("/admin/payouts/{id}/approve", response_model=PayoutOut)
async def approve_payout(id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _ensure_admin(current_user)
    payout = await db.scalar(select(PublisherPayout).where(PublisherPayout.id == uuid.UUID(id)))
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    payout.status = PayoutStatus.APPROVED
    result = await db.execute(select(PublisherEarning).where(PublisherEarning.publisher_id == payout.publisher_id, PublisherEarning.paid_out.is_(False)).order_by(PublisherEarning.created_at.asc()))
    remaining = Decimal(str(payout.amount))
    for earning in result.scalars().all():
        if remaining <= 0:
            break
        earning.paid_out = True
        remaining -= Decimal(str(earning.amount))
    await db.flush()
    return PayoutOut.model_validate(payout)


@router.get("/admin/payouts", response_model=list[PayoutOut])
async def all_payouts(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _ensure_admin(current_user)
    result = await db.execute(select(PublisherPayout).order_by(PublisherPayout.created_at.desc()))
    return [PayoutOut.model_validate(p) for p in result.scalars().all()]


@router.get("/adnet/campaigns", response_model=list[CampaignOut])
async def campaigns_alias(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await list_campaigns(db=db, current_user=current_user)
