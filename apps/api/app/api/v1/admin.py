# FULL FILE
from fastapi import APIRouter

router = APIRouter(prefix="/admin", tags=["admin"])

@router.patch("/campaigns/{campaign_id}/approve")
async def approve_campaign(campaign_id: str): return {"approved": campaign_id}
@router.patch("/publishers/{publisher_id}/approve")
async def approve_publisher(publisher_id: str): return {"approved": publisher_id}
@router.get("/fraud-signals")
async def fraud_signals(): return []
@router.get("/overview")
async def overview(): return {"campaigns": 0, "publishers": 0}
@router.patch("/payouts/{id}/approve")
async def approve_payout(id: str): return {"approved_payout": id}
