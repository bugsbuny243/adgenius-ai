# FULL FILE
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db, is_admin_role
from app.models.adnet import Campaign
from app.models.publisher import PublisherProfile
from app.models.user import User, UserRole

router = APIRouter(prefix="/ai-reports", tags=["ai-reports"])


@router.get("/campaign/{campaign_id}")
async def ai_campaign_report(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = await db.scalar(select(Campaign).where(Campaign.id == uuid.UUID(campaign_id)))
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if not is_admin_role(current_user.role):
        if current_user.role != UserRole.ADVERTISER or campaign.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden")

    return {"campaign_id": campaign_id, "insight": "Increase bid by 12% on top slots."}


@router.get("/publisher/{publisher_id}")
async def ai_publisher_report(
    publisher_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = await db.scalar(select(PublisherProfile).where(PublisherProfile.id == uuid.UUID(publisher_id)))
    if not profile:
        raise HTTPException(status_code=404, detail="Publisher not found")

    if not is_admin_role(current_user.role):
        if current_user.role != UserRole.PUBLISHER or profile.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden")

    return {"publisher_id": publisher_id, "insight": "Enable native placements for higher CTR."}


@router.post("/admin/chat")
async def admin_chat(payload: dict, current_user: User = Depends(get_current_user)):
    if not is_admin_role(current_user.role):
        raise HTTPException(status_code=403, detail="Admin access required")
    return {"answer": "AI assistant response", "input": payload}
