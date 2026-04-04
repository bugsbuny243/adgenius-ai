from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user, is_admin_role
from app.supabase_client import get_supabase

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(user: dict):
    if not is_admin_role(user.get("role")):
        raise HTTPException(status_code=403, detail="Admin only")


@router.get("/campaigns")
async def list_campaigns(current_user=Depends(get_current_user)):
    _require_admin(current_user)
    response = get_supabase().table("campaigns").select("*").order("created_at", desc=True).execute()
    return response.data or []


@router.post("/campaigns/{campaign_id}/activate")
async def activate_campaign(campaign_id: str, current_user=Depends(get_current_user)):
    _require_admin(current_user)
    response = get_supabase().table("campaigns").update({"status": "ACTIVE", "is_active": True}).eq("id", campaign_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return response.data[0]


@router.post("/campaigns/{campaign_id}/pause")
async def pause_campaign(campaign_id: str, current_user=Depends(get_current_user)):
    _require_admin(current_user)
    response = get_supabase().table("campaigns").update({"status": "PAUSED", "is_active": False}).eq("id", campaign_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return response.data[0]


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, current_user=Depends(get_current_user)):
    _require_admin(current_user)
    response = get_supabase().table("campaigns").delete().eq("id", campaign_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"deleted": True}
