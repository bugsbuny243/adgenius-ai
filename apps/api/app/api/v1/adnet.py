from datetime import datetime, timedelta, timezone
from decimal import Decimal
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import AliasChoices, BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, is_admin_role
from app.models.user import User, UserRole
from app.models.publisher import PublisherProfile
from app.models.adnet import (
    Campaign,
    CampaignStatus,
    PricingModel,
    Ad,
    AdvertiserWallet,
    AdvertiserTransaction,
    PublisherEarning,
    PublisherPayout,
    PayoutStatus,
)

router = APIRouter(tags=["adnet"])


class CampaignIn(BaseModel):
    title: str = Field(validation_alias=AliasChoices("title", "name"))
    budget: Decimal = Field(validation_alias=AliasChoices("budget", "total_budget"))
    daily_budget: Decimal | None = None
    pricing_model: str = "CPC"
    bid_amount: Decimal = Decimal("0.01")
    targeting: dict | None = None
    target_countries: list[str] | None = None
    target_devices: list[str] | None = None
    landing_url: str
    category: str | None = None
    status: str = "DRAFT"


class CampaignOut(BaseModel):
    id: str
    title: str
    status: str
    budget: Decimal = Field(serialization_alias="budget")
    daily_budget: Decimal | None = None
    pricing_model: str
    spent_amount: Decimal
    bid_amount: Decimal
    targeting: dict | None = None
    target_countries: list[str] | None = None
    target_devices: list[str] | None = None
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
    total_deposited: Decimal
    total_spent: Decimal

    model_config = {"from_attributes": True}


class DepositIn(BaseModel):
    amount: Decimal


class PayoutIn(BaseModel):
    amount: Decimal | None = None


class PayoutOut(BaseModel):
    id: str
    publisher_id: str
    gross_earnings: Decimal
    platform_share: Decimal
    publisher_share: Decimal
    impressions_count: int
    clicks_count: int
    period_start: datetime
    period_end: datetime
    paid_at: datetime | None = None
    status: str

    model_config = {"from_attributes": True}


def _ensure_admin(user: User):
    if not is_admin_role(user.role):
        raise HTTPException(status_code=403, detail="Admin only")


def _ensure_advertiser_or_admin(user: User):
    if user.role not in {UserRole.ADVERTISER} and not is_admin_role(user.role):
        raise HTTPException(status_code=403, detail="Advertiser only")


def _ensure_publisher_or_admin(user: User):
    if user.role not in {UserRole.PUBLISHER} and not is_admin_role(user.role):
        raise HTTPException(status_code=403, detail="Publisher only")


def _campaign_scope_filter(user: User):
    return True if is_admin_role(user.role) else (Campaign.user_id == user.id)


def _publisher_scope_filter(user: User):
    return True if is_admin_role(user.role) else (PublisherProfile.user_id == user.id)


def _campaign_to_out(campaign: Campaign) -> CampaignOut:
    return CampaignOut.model_validate({
        **campaign.__dict__,
        "budget": campaign.total_budget,
        "status": campaign.status.value if hasattr(campaign.status, "value") else str(campaign.status),
        "pricing_model": campaign.pricing_model.value if hasattr(campaign.pricing_model, "value") else str(campaign.pricing_model),
    })


@router.get("/advertiser/campaigns", response_model=list[CampaignOut])
async def list_campaigns(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _ensure_advertiser_or_admin(current_user)
    result = await db.execute(select(Campaign).where(_campaign_scope_filter(current_user)).order_by(Campaign.created_at.desc()))
    return [_campaign_to_out(c) for c in result.scalars().all()]


@router.post("/advertiser/campaigns", response_model=CampaignOut, status_code=status.HTTP_201_CREATED)
async def create_campaign(payload: CampaignIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _ensure_advertiser_or_admin(current_user)
    campaign = Campaign(
        user_id=current_user.id,
        title=payload.title,
        total_budget=payload.budget,
        daily_budget=payload.daily_budget,
        pricing_model=PricingModel(payload.pricing_model.upper()),
        bid_amount=payload.bid_amount,
        landing_url=payload.landing_url,
        category=payload.category,
        targeting=payload.targeting,
        target_countries=payload.target_countries,
        target_devices=payload.target_devices,
        status=CampaignStatus(payload.status.upper()),
    )
    db.add(campaign)
    await db.flush()
    await db.refresh(campaign)
    return _campaign_to_out(campaign)


@router.get("/advertiser/campaigns/{id}", response_model=CampaignOut)
async def get_campaign(id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _ensure_advertiser_or_admin(current_user)
    campaign = await db.scalar(select(Campaign).where(Campaign.id == uuid.UUID(id), _campaign_scope_filter(current_user)))
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return _campaign_to_out(campaign)


@router.put("/advertiser/campaigns/{id}", response_model=CampaignOut)
async def update_campaign(id: str, payload: CampaignIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _ensure_advertiser_or_admin(current_user)
    campaign = await db.scalar(select(Campaign).where(Campaign.id == uuid.UUID(id), _campaign_scope_filter(current_user)))
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status == CampaignStatus.ACTIVE and not is_admin_role(current_user.role):
        raise HTTPException(status_code=403, detail="Active campaigns can only be set by admin")
    campaign.title = payload.title
    campaign.total_budget = payload.budget
    campaign.daily_budget = payload.daily_budget
    campaign.pricing_model = PricingModel(payload.pricing_model.upper())
    campaign.bid_amount = payload.bid_amount
    campaign.landing_url = payload.landing_url
    campaign.category = payload.category
    campaign.targeting = payload.targeting
    campaign.target_countries = payload.target_countries
    campaign.target_devices = payload.target_devices
    campaign.status = CampaignStatus(payload.status.upper())
    await db.flush()
    return _campaign_to_out(campaign)


@router.delete("/advertiser/campaigns/{id}")
async def delete_campaign(id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _ensure_advertiser_or_admin(current_user)
    campaign = await db.scalar(select(Campaign).where(Campaign.id == uuid.UUID(id), _campaign_scope_filter(current_user)))
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    await db.delete(campaign)
    return {"deleted": True}


@router.get("/advertiser/campaigns/{id}/ads", response_model=list[AdOut])
async def list_ads(id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _ensure_advertiser_or_admin(current_user)
    campaign = await db.scalar(select(Campaign).where(Campaign.id == uuid.UUID(id), _campaign_scope_filter(current_user)))
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    result = await db.execute(select(Ad).where(Ad.campaign_id == campaign.id).order_by(Ad.created_at.desc()))
    return [AdOut.model_validate(a) for a in result.scalars().all()]


@router.post("/advertiser/campaigns/{id}/ads", response_model=AdOut, status_code=status.HTTP_201_CREATED)
async def create_ad(id: str, payload: AdIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _ensure_advertiser_or_admin(current_user)
    campaign = await db.scalar(select(Campaign).where(Campaign.id == uuid.UUID(id), _campaign_scope_filter(current_user)))
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    ad = Ad(campaign_id=campaign.id, **payload.model_dump())
    db.add(ad)
    await db.flush()
    return AdOut.model_validate(ad)


@router.put("/advertiser/ads/{id}", response_model=AdOut)
async def update_ad(id: str, payload: AdIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _ensure_advertiser_or_admin(current_user)
    result = await db.execute(select(Ad, Campaign).join(Campaign, Campaign.id == Ad.campaign_id).where(Ad.id == uuid.UUID(id), _campaign_scope_filter(current_user)))
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
    _ensure_advertiser_or_admin(current_user)
    result = await db.execute(select(Ad, Campaign).join(Campaign, Campaign.id == Ad.campaign_id).where(Ad.id == uuid.UUID(id), _campaign_scope_filter(current_user)))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Ad not found")
    await db.delete(row[0])
    return {"deleted": True}


@router.get("/advertiser/wallet", response_model=WalletOut)
async def wallet(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _ensure_advertiser_or_admin(current_user)
    query = select(AdvertiserWallet).where(AdvertiserWallet.user_id == current_user.id)
    wallet_obj = await db.scalar(query)
    if not wallet_obj:
        wallet_obj = AdvertiserWallet(user_id=current_user.id)
        db.add(wallet_obj)
        await db.flush()
    return WalletOut.model_validate(wallet_obj)


@router.post("/advertiser/wallet/deposit", response_model=WalletOut)
async def wallet_deposit(payload: DepositIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _ensure_advertiser_or_admin(current_user)
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    wallet_obj = await db.scalar(select(AdvertiserWallet).where(AdvertiserWallet.user_id == current_user.id))
    if not wallet_obj:
        wallet_obj = AdvertiserWallet(user_id=current_user.id)
        db.add(wallet_obj)
        await db.flush()
    wallet_obj.balance += payload.amount
    wallet_obj.total_deposited += payload.amount
    db.add(AdvertiserTransaction(wallet_id=wallet_obj.id, tx_type="deposit", amount=payload.amount, description="Wallet deposit"))
    await db.flush()
    return WalletOut.model_validate(wallet_obj)


@router.get("/advertiser/finance/dashboard")
async def finance_dashboard(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _ensure_advertiser_or_admin(current_user)
    wallet_obj = await db.scalar(select(AdvertiserWallet).where(AdvertiserWallet.user_id == current_user.id))
    spend = await db.scalar(select(func.coalesce(func.sum(Campaign.spent_amount), 0)).where(Campaign.user_id == current_user.id))
    active = await db.scalar(select(func.count(Campaign.id)).where(Campaign.user_id == current_user.id, Campaign.status == CampaignStatus.ACTIVE))
    return {"balance": getattr(wallet_obj, "balance", Decimal("0")), "total_spent": spend, "active_campaigns": active}


@router.get("/publisher/earnings")
async def publisher_earnings(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _ensure_publisher_or_admin(current_user)
    result = await db.execute(
        select(PublisherEarning)
        .join(PublisherProfile, PublisherProfile.id == PublisherEarning.publisher_id)
        .where(_publisher_scope_filter(current_user))
        .order_by(PublisherEarning.created_at.desc())
    )
    return [{"id": str(e.id), "amount": e.amount, "event_type": e.event_type} for e in result.scalars().all()]


@router.get("/publisher/earnings/dashboard")
async def publisher_earnings_dashboard(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _ensure_publisher_or_admin(current_user)
    if is_admin_role(current_user.role):
        total = await db.scalar(select(func.coalesce(func.sum(PublisherEarning.amount), 0)))
        settled = await db.scalar(select(func.coalesce(func.sum(PublisherPayout.publisher_share), 0)).where(PublisherPayout.status == PayoutStatus.APPROVED))
    else:
        profile = await db.scalar(select(PublisherProfile).where(PublisherProfile.user_id == current_user.id))
        if not profile:
            return {"total_earned": Decimal("0"), "available": Decimal("0"), "settled": Decimal("0")}
        total = await db.scalar(select(func.coalesce(func.sum(PublisherEarning.amount), 0)).where(PublisherEarning.publisher_id == profile.id))
        settled = await db.scalar(select(func.coalesce(func.sum(PublisherPayout.publisher_share), 0)).where(PublisherPayout.publisher_id == profile.id, PublisherPayout.status == PayoutStatus.APPROVED))
    available = Decimal(str(total or 0)) - Decimal(str(settled or 0))
    return {"total_earned": total, "available": available, "settled": settled}


@router.post("/publisher/payout/request", response_model=PayoutOut, status_code=status.HTTP_201_CREATED)
async def payout_request(payload: PayoutIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _ensure_publisher_or_admin(current_user)
    profile = await db.scalar(select(PublisherProfile).where(PublisherProfile.user_id == current_user.id))
    if not profile:
        raise HTTPException(status_code=404, detail="Publisher profile not found")

    period_end = datetime.now(timezone.utc)
    period_start = period_end - timedelta(days=30)
    gross = await db.scalar(
        select(func.coalesce(func.sum(PublisherEarning.amount), 0)).where(
            PublisherEarning.publisher_id == profile.id,
            PublisherEarning.created_at >= period_start,
            PublisherEarning.created_at <= period_end,
        )
    )
    already_requested = await db.scalar(
        select(func.coalesce(func.sum(PublisherPayout.publisher_share), 0)).where(
            PublisherPayout.publisher_id == profile.id,
            PublisherPayout.period_start >= period_start,
            PublisherPayout.period_end <= period_end,
            PublisherPayout.status.in_([PayoutStatus.PENDING, PayoutStatus.APPROVED]),
        )
    )
    available_amount = Decimal(str(gross or 0)) - Decimal(str(already_requested or 0))
    requested_amount = Decimal(str(payload.amount)) if payload.amount is not None else available_amount
    if requested_amount <= 0:
        raise HTTPException(status_code=400, detail="No earnings available for payout period")
    if requested_amount > available_amount:
        raise HTTPException(status_code=400, detail="Insufficient available earnings")
    publisher_share = requested_amount
    platform_share = Decimal("0")

    payout = PublisherPayout(
        publisher_id=profile.id,
        gross_earnings=publisher_share + platform_share,
        platform_share=platform_share,
        publisher_share=publisher_share,
        period_start=period_start,
        period_end=period_end,
        impressions_count=0,
        clicks_count=0,
        status=PayoutStatus.PENDING,
    )
    db.add(payout)
    await db.flush()
    return PayoutOut.model_validate(payout)


@router.get("/publisher/payouts", response_model=list[PayoutOut])
async def payout_list(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _ensure_publisher_or_admin(current_user)
    result = await db.execute(
        select(PublisherPayout)
        .join(PublisherProfile, PublisherProfile.id == PublisherPayout.publisher_id)
        .where(_publisher_scope_filter(current_user))
        .order_by(PublisherPayout.created_at.desc())
    )
    return [PayoutOut.model_validate(p) for p in result.scalars().all()]


@router.patch("/admin/payouts/{id}/approve", response_model=PayoutOut)
async def approve_payout(id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _ensure_admin(current_user)
    payout = await db.scalar(select(PublisherPayout).where(PublisherPayout.id == uuid.UUID(id)))
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    payout.status = PayoutStatus.APPROVED
    payout.paid_at = datetime.now(timezone.utc)
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
