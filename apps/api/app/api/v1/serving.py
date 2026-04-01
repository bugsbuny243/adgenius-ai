# FULL FILE
from uuid import uuid4
from fastapi import APIRouter
from app.schemas.serving import ServeAdResponse, ImpressionTrackRequest
from app.services.token_service import create_click_token

router = APIRouter(prefix="/serving", tags=["serving"])

@router.get("/serve", response_model=ServeAdResponse)
async def serve_ad(slot_id: str):
    req_id = str(uuid4())
    return ServeAdResponse(request_id=req_id, ad_id="demo-ad", campaign_id="demo-campaign", title="Grow with AdGenius", body="AI-powered ad delivery for your audience.", cta="Get Started")

@router.post("/impression")
async def track_impression(payload: ImpressionTrackRequest):
    return {"ok": True, "request_id": payload.request_id}

@router.post("/click")
async def track_click(request_id: str, ad_id: str, slot_id: str):
    token = create_click_token({"request_id": request_id, "ad_id": ad_id, "slot_id": slot_id})
    return {"ok": True, "click_token": token}
