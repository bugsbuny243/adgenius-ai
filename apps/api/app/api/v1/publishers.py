import secrets
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, AliasChoices
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, is_admin_role
from app.models.user import User, UserRole
from app.models.publisher import (
    PublisherProfile,
    PublisherSite,
    PublisherApp,
    Placement,
    AdSlot,
    PublisherStatus,
    SlotFormat,
)

router = APIRouter(prefix="/publishers", tags=["publishers"])


class ProfileIn(BaseModel):
    company_name: str
    website_url: str | None = Field(default=None, validation_alias=AliasChoices("website_url", "website"))
    contact_email: str | None = None
    description: str | None = Field(default=None, validation_alias=AliasChoices("description", "notes"))


class ProfileOut(BaseModel):
    id: str
    user_id: str
    company_name: str
    website_url: str | None = None
    contact_email: str | None = None
    description: str | None = None
    rejection_reason: str | None = None
    revenue_share_pct: float
    status: str

    model_config = {"from_attributes": True}


class SiteIn(BaseModel):
    domain: str
    name: str = ""
    category: str | None = None
    allowed_categories: list[str] | None = None
    description: str | None = None
    is_verified: bool = False


class SiteOut(BaseModel):
    id: str
    publisher_id: str
    domain: str
    name: str
    category: str | None = None
    allowed_categories: list[str] | None = None
    description: str | None = None
    is_verified: bool
    is_active: bool

    model_config = {"from_attributes": True}


class AppIn(BaseModel):
    name: str
    bundle_id: str
    platform: str = "web"


class AppOut(BaseModel):
    id: str
    publisher_id: str
    name: str
    bundle_id: str
    platform: str
    is_active: bool

    model_config = {"from_attributes": True}


class PlacementIn(BaseModel):
    name: str
    site_id: str | None = None
    app_id: str | None = None
    page_path: str | None = None
    context_tags: list[str] | None = None


class PlacementOut(BaseModel):
    id: str
    publisher_id: str
    site_id: str | None = None
    app_id: str | None = None
    name: str
    page_path: str | None = None
    context_tags: list[str] | None = None
    is_active: bool

    model_config = {"from_attributes": True}


class SlotIn(BaseModel):
    name: str = ""
    slot_key: str | None = None
    format: str = "BANNER"
    category: str | None = None
    allowed_formats: list[str] | None = None
    width: int | None = None
    height: int | None = None


class SlotOut(BaseModel):
    id: str
    placement_id: str
    name: str
    slot_key: str
    format: str
    category: str | None = None
    allowed_formats: list[str] | None = None
    width: int | None = None
    height: int | None = None
    is_active: bool

    model_config = {"from_attributes": True}




def _require_publisher_or_admin(user: User) -> None:
    if user.role not in {UserRole.PUBLISHER} and not is_admin_role(user.role):
        raise HTTPException(status_code=403, detail="Publisher only")


def _profile_scope_filter(user: User):
    return True if is_admin_role(user.role) else (PublisherProfile.user_id == user.id)


async def _get_profile_or_404(db: AsyncSession, user: User) -> PublisherProfile:
    _require_publisher_or_admin(user)
    profile = await db.scalar(select(PublisherProfile).where(_profile_scope_filter(user)))
    if not profile:
        raise HTTPException(status_code=404, detail="Publisher profile not found")
    return profile


@router.post("/profile", response_model=ProfileOut, status_code=status.HTTP_201_CREATED)
async def create_profile(payload: ProfileIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_publisher_or_admin(current_user)
    exists = await db.scalar(select(PublisherProfile).where(PublisherProfile.user_id == current_user.id))
    if exists:
        raise HTTPException(status_code=409, detail="Publisher profile already exists")
    profile = PublisherProfile(user_id=current_user.id, status=PublisherStatus.PENDING, **payload.model_dump())
    db.add(profile)
    await db.flush()
    return ProfileOut.model_validate(profile)


@router.get("/profile", response_model=ProfileOut)
async def get_profile(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = await _get_profile_or_404(db, current_user)
    return ProfileOut.model_validate(profile)


@router.patch("/profile", response_model=ProfileOut)
async def update_profile(payload: ProfileIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = await _get_profile_or_404(db, current_user)
    for key, value in payload.model_dump().items():
        setattr(profile, key, value)
    await db.flush()
    return ProfileOut.model_validate(profile)


@router.get("/sites", response_model=list[SiteOut])
async def list_sites(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_publisher_or_admin(current_user)
    query = select(PublisherSite).order_by(PublisherSite.created_at.desc())
    if not is_admin_role(current_user.role):
        profile = await _get_profile_or_404(db, current_user)
        query = query.where(PublisherSite.publisher_id == profile.id)
    result = await db.execute(query)
    return [SiteOut.model_validate(row) for row in result.scalars().all()]


@router.post("/sites", response_model=SiteOut, status_code=status.HTTP_201_CREATED)
async def create_site(payload: SiteIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = await _get_profile_or_404(db, current_user)
    site = PublisherSite(publisher_id=profile.id, **payload.model_dump())
    db.add(site)
    await db.flush()
    return SiteOut.model_validate(site)


@router.get("/sites/{id}", response_model=SiteOut)
async def get_site(id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_publisher_or_admin(current_user)
    query = select(PublisherSite).where(PublisherSite.id == uuid.UUID(id))
    if not is_admin_role(current_user.role):
        profile = await _get_profile_or_404(db, current_user)
        query = query.where(PublisherSite.publisher_id == profile.id)
    site = await db.scalar(query)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return SiteOut.model_validate(site)


@router.patch("/sites/{id}", response_model=SiteOut)
async def update_site(id: str, payload: SiteIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = await _get_profile_or_404(db, current_user)
    site = await db.scalar(select(PublisherSite).where(PublisherSite.id == uuid.UUID(id), PublisherSite.publisher_id == profile.id))
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    for key, value in payload.model_dump().items():
        setattr(site, key, value)
    await db.flush()
    return SiteOut.model_validate(site)


@router.delete("/sites/{id}")
async def delete_site(id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = await _get_profile_or_404(db, current_user)
    site = await db.scalar(select(PublisherSite).where(PublisherSite.id == uuid.UUID(id), PublisherSite.publisher_id == profile.id))
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    await db.delete(site)
    return {"deleted": True}


@router.get("/apps", response_model=list[AppOut])
async def list_apps(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_publisher_or_admin(current_user)
    query = select(PublisherApp).order_by(PublisherApp.created_at.desc())
    if not is_admin_role(current_user.role):
        profile = await _get_profile_or_404(db, current_user)
        query = query.where(PublisherApp.publisher_id == profile.id)
    result = await db.execute(query)
    return [AppOut.model_validate(row) for row in result.scalars().all()]


@router.post("/apps", response_model=AppOut, status_code=status.HTTP_201_CREATED)
async def create_app(payload: AppIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = await _get_profile_or_404(db, current_user)
    app = PublisherApp(publisher_id=profile.id, **payload.model_dump())
    db.add(app)
    await db.flush()
    return AppOut.model_validate(app)


@router.patch("/apps/{id}", response_model=AppOut)
async def update_app(id: str, payload: AppIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = await _get_profile_or_404(db, current_user)
    app = await db.scalar(select(PublisherApp).where(PublisherApp.id == uuid.UUID(id), PublisherApp.publisher_id == profile.id))
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    for key, value in payload.model_dump().items():
        setattr(app, key, value)
    await db.flush()
    return AppOut.model_validate(app)


@router.delete("/apps/{id}")
async def delete_app(id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = await _get_profile_or_404(db, current_user)
    app = await db.scalar(select(PublisherApp).where(PublisherApp.id == uuid.UUID(id), PublisherApp.publisher_id == profile.id))
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    await db.delete(app)
    return {"deleted": True}


@router.get("/placements", response_model=list[PlacementOut])
async def list_placements(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_publisher_or_admin(current_user)
    query = select(Placement).order_by(Placement.created_at.desc())
    if not is_admin_role(current_user.role):
        profile = await _get_profile_or_404(db, current_user)
        query = query.where(Placement.publisher_id == profile.id)
    result = await db.execute(query)
    return [PlacementOut.model_validate(row) for row in result.scalars().all()]


@router.post("/placements", response_model=PlacementOut, status_code=status.HTTP_201_CREATED)
async def create_placement(payload: PlacementIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = await _get_profile_or_404(db, current_user)
    if payload.site_id:
        site = await db.scalar(select(PublisherSite).where(PublisherSite.id == uuid.UUID(payload.site_id), PublisherSite.publisher_id == profile.id))
        if not site:
            raise HTTPException(status_code=404, detail="Site not found")
    if payload.app_id:
        app = await db.scalar(select(PublisherApp).where(PublisherApp.id == uuid.UUID(payload.app_id), PublisherApp.publisher_id == profile.id))
        if not app:
            raise HTTPException(status_code=404, detail="App not found")
    placement = Placement(
        publisher_id=profile.id,
        site_id=uuid.UUID(payload.site_id) if payload.site_id else None,
        app_id=uuid.UUID(payload.app_id) if payload.app_id else None,
        name=payload.name,
        page_path=payload.page_path,
        context_tags=payload.context_tags,
    )
    db.add(placement)
    await db.flush()
    return PlacementOut.model_validate(placement)


@router.get("/placements/{id}", response_model=PlacementOut)
async def get_placement(id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_publisher_or_admin(current_user)
    query = select(Placement).where(Placement.id == uuid.UUID(id))
    if not is_admin_role(current_user.role):
        profile = await _get_profile_or_404(db, current_user)
        query = query.where(Placement.publisher_id == profile.id)
    placement = await db.scalar(query)
    if not placement:
        raise HTTPException(status_code=404, detail="Placement not found")
    return PlacementOut.model_validate(placement)


@router.patch("/placements/{id}", response_model=PlacementOut)
async def update_placement(id: str, payload: PlacementIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = await _get_profile_or_404(db, current_user)
    placement = await db.scalar(select(Placement).where(Placement.id == uuid.UUID(id), Placement.publisher_id == profile.id))
    if not placement:
        raise HTTPException(status_code=404, detail="Placement not found")
    if payload.site_id:
        site = await db.scalar(select(PublisherSite).where(PublisherSite.id == uuid.UUID(payload.site_id), PublisherSite.publisher_id == profile.id))
        if not site:
            raise HTTPException(status_code=404, detail="Site not found")
    if payload.app_id:
        app = await db.scalar(select(PublisherApp).where(PublisherApp.id == uuid.UUID(payload.app_id), PublisherApp.publisher_id == profile.id))
        if not app:
            raise HTTPException(status_code=404, detail="App not found")
    placement.name = payload.name
    placement.site_id = uuid.UUID(payload.site_id) if payload.site_id else None
    placement.app_id = uuid.UUID(payload.app_id) if payload.app_id else None
    placement.page_path = payload.page_path
    placement.context_tags = payload.context_tags
    await db.flush()
    return PlacementOut.model_validate(placement)


@router.get("/placements/{id}/slots", response_model=list[SlotOut])
async def list_slots(id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = await _get_profile_or_404(db, current_user)
    placement = await db.scalar(select(Placement).where(Placement.id == uuid.UUID(id), Placement.publisher_id == profile.id))
    if not placement:
        raise HTTPException(status_code=404, detail="Placement not found")
    result = await db.execute(select(AdSlot).where(AdSlot.placement_id == placement.id).order_by(AdSlot.created_at.desc()))
    return [SlotOut.model_validate(row) for row in result.scalars().all()]


@router.post("/placements/{id}/slots", response_model=SlotOut, status_code=status.HTTP_201_CREATED)
async def create_slot(id: str, payload: SlotIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = await _get_profile_or_404(db, current_user)
    placement = await db.scalar(select(Placement).where(Placement.id == uuid.UUID(id), Placement.publisher_id == profile.id))
    if not placement:
        raise HTTPException(status_code=404, detail="Placement not found")
    slot = AdSlot(
        placement_id=placement.id,
        name=payload.name,
        slot_key=payload.slot_key or secrets.token_urlsafe(12),
        format=SlotFormat(payload.format.upper()),
        category=payload.category,
        allowed_formats=payload.allowed_formats,
        width=payload.width,
        height=payload.height,
    )
    db.add(slot)
    await db.flush()
    return SlotOut.model_validate(slot)


@router.patch("/slots/{id}", response_model=SlotOut)
async def update_slot(id: str, payload: SlotIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = await _get_profile_or_404(db, current_user)
    result = await db.execute(select(AdSlot, Placement).join(Placement, Placement.id == AdSlot.placement_id).where(AdSlot.id == uuid.UUID(id), Placement.publisher_id == profile.id))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Slot not found")
    slot = row[0]
    slot.name = payload.name
    if payload.slot_key:
        slot.slot_key = payload.slot_key
    slot.format = SlotFormat(payload.format.upper())
    slot.category = payload.category
    slot.allowed_formats = payload.allowed_formats
    slot.width = payload.width
    slot.height = payload.height
    await db.flush()
    return SlotOut.model_validate(slot)


@router.delete("/slots/{id}")
async def delete_slot(id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = await _get_profile_or_404(db, current_user)
    result = await db.execute(select(AdSlot, Placement).join(Placement, Placement.id == AdSlot.placement_id).where(AdSlot.id == uuid.UUID(id), Placement.publisher_id == profile.id))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Slot not found")
    await db.delete(row[0])
    return {"deleted": True}


class SlotCreateIn(SlotIn):
    placement_id: str


@router.get("/slots", response_model=list[SlotOut])
async def list_slots_flat(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_publisher_or_admin(current_user)
    query = select(AdSlot).join(Placement, Placement.id == AdSlot.placement_id).order_by(AdSlot.created_at.desc())
    if not is_admin_role(current_user.role):
        profile = await _get_profile_or_404(db, current_user)
        query = query.where(Placement.publisher_id == profile.id)
    rows = await db.execute(query)
    return [SlotOut.model_validate(row) for row in rows.scalars().all()]


@router.post("/slots", response_model=SlotOut, status_code=status.HTTP_201_CREATED)
async def create_slot_flat(payload: SlotCreateIn, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_publisher_or_admin(current_user)
    query = select(Placement).where(Placement.id == uuid.UUID(payload.placement_id))
    if not is_admin_role(current_user.role):
        profile = await _get_profile_or_404(db, current_user)
        query = query.where(Placement.publisher_id == profile.id)
    placement = await db.scalar(query)
    if not placement:
        raise HTTPException(status_code=404, detail="Placement not found")
    slot = AdSlot(
        placement_id=placement.id,
        name=payload.name,
        slot_key=payload.slot_key or secrets.token_urlsafe(12),
        format=SlotFormat(payload.format.upper()),
        category=payload.category,
        allowed_formats=payload.allowed_formats,
        width=payload.width,
        height=payload.height,
    )
    db.add(slot)
    await db.flush()
    return SlotOut.model_validate(slot)
