from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.supabase_client import get_supabase

router = APIRouter(prefix="/publishers", tags=["publishers"])


class CampaignIn(BaseModel):
    title: str
    budget: float
    landing_url: str


@router.get("/campaigns")
async def list_campaigns(current_user=Depends(get_current_user)):
    response = get_supabase().table("campaigns").select("*").order("created_at", desc=True).execute()
    return response.data or []


@router.post("/campaigns", status_code=status.HTTP_201_CREATED)
async def create_campaign(payload: CampaignIn, current_user=Depends(get_current_user)):
    response = get_supabase().table("campaigns").insert({**payload.model_dump(), "publisher_user_id": current_user["id"]}).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Campaign create failed")
    return response.data[0]


@router.patch("/campaigns/{id}")
async def update_campaign(id: str, payload: CampaignIn, current_user=Depends(get_current_user)):
    response = get_supabase().table("campaigns").update(payload.model_dump()).eq("id", id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return response.data[0]


@router.delete("/campaigns/{id}")
async def delete_campaign(id: str, current_user=Depends(get_current_user)):
    response = get_supabase().table("campaigns").delete().eq("id", id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"deleted": True}
