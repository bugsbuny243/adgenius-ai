# FULL FILE
from fastapi import APIRouter

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/advertiser")
async def advertiser_report(): return {"spend": 0, "impressions": 0, "clicks": 0}
@router.get("/publisher")
async def publisher_report(): return {"earnings": 0, "impressions": 0, "clicks": 0}
