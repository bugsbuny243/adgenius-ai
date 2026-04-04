from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import AliasChoices, BaseModel, Field

from app.dependencies import get_current_user
from app.supabase_client import get_supabase

router = APIRouter(tags=["adnet"])


class CampaignIn(BaseModel):
    title: str = Field(validation_alias=AliasChoices("title", "name"))
    budget: float = Field(validation_alias=AliasChoices("budget", "total_budget"))
    daily_budget: float | None = None
    pricing_model: str = "CPC"
    bid_amount: float = 0.01
    targeting: dict | None = None
    target_countries: list[str] | None = None
    target_devices: list[str] | None = None
    landing_url: str
    category: str | None = None
    status: str = "DRAFT"


@router.get("/advertiser/campaigns")
async def list_campaigns(current_user=Depends(get_current_user)):
    response = (
        get_supabase()
        .table("campaigns")
        .select("*")
        .eq("user_id", current_user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


@router.post("/advertiser/campaigns", status_code=status.HTTP_201_CREATED)
async def create_campaign(payload: CampaignIn, current_user=Depends(get_current_user)):
    data = {**payload.model_dump(), "user_id": current_user["id"]}
    response = get_supabase().table("campaigns").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Campaign create failed")
    return response.data[0]


@router.get("/advertiser/campaigns/{id}")
async def get_campaign(id: str, current_user=Depends(get_current_user)):
    response = get_supabase().table("campaigns").select("*").eq("id", id).eq("user_id", current_user["id"]).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return response.data[0]


@router.put("/advertiser/campaigns/{id}")
async def update_campaign(id: str, payload: CampaignIn, current_user=Depends(get_current_user)):
    response = (
        get_supabase()
        .table("campaigns")
        .update(payload.model_dump())
        .eq("id", id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return response.data[0]


@router.delete("/advertiser/campaigns/{id}")
async def delete_campaign(id: str, current_user=Depends(get_current_user)):
    response = get_supabase().table("campaigns").delete().eq("id", id).eq("user_id", current_user["id"]).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"deleted": True}
