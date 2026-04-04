# FULL FILE
from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user, is_admin_role
from app.models.user import User, UserRole

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/advertiser")
async def advertiser_report(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADVERTISER and not is_admin_role(current_user.role):
        raise HTTPException(status_code=403, detail="Advertiser access required")
    return {"spend": 0, "impressions": 0, "clicks": 0}


@router.get("/publisher")
async def publisher_report(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.PUBLISHER and not is_admin_role(current_user.role):
        raise HTTPException(status_code=403, detail="Publisher access required")
    return {"earnings": 0, "impressions": 0, "clicks": 0}
