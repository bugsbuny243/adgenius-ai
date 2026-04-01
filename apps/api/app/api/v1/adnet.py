# FULL FILE
from fastapi import APIRouter

router = APIRouter(tags=["adnet"])

@router.get("/campaigns")
async def list_campaigns(): return []
@router.post("/campaigns")
async def create_campaign(payload: dict): return payload
@router.get("/ads")
async def list_ads(): return []
@router.post("/ads")
async def create_ad(payload: dict): return payload
@router.get("/advertiser/wallet")
async def wallet(): return {"balance": 0}
@router.post("/advertiser/wallet/deposit")
async def wallet_deposit(amount: float): return {"ok": True, "amount": amount}
@router.get("/publisher/earnings")
async def publisher_earnings(): return {"total": 0}
@router.post("/publisher/payout/request")
async def payout_request(amount: float): return {"ok": True, "amount": amount}
