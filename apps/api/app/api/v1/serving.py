"""Ad serving engine: slot request, impression tracking, click tracking."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.dependencies import get_db
from app.schemas.serving import ServeAdResponse, ImpressionTrackRequest, ImpressionTrackResponse
from app.services.ad_selection import select_best_ad
from app.services.impression_service import record_impression
from app.services.click_service import record_click

router = APIRouter(tags=["serving"])
logger = structlog.get_logger()


@router.get("/serve/ad", response_model=ServeAdResponse)
async def serve_ad(
    slot_key: str,
    page_url: Optional[str] = None,
    session_id: Optional[str] = None,
    country: Optional[str] = None,
    device: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    payload = await select_best_ad(
        db=db, slot_key=slot_key, page_url=page_url,
        session_id=session_id, country=country, device=device,
    )
    if payload is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    return ServeAdResponse(**payload)


@router.post("/track/impression", response_model=ImpressionTrackResponse)
async def track_impression(data: ImpressionTrackRequest, db: AsyncSession = Depends(get_db)):
    try:
        impression = await record_impression(db=db, ad_request_id=data.ad_request_id, session_id=data.session_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ImpressionTrackResponse(impression_id=str(impression.id), recorded=True)


@router.get("/track/click/{click_token}")
async def track_click(click_token: str, db: AsyncSession = Depends(get_db)):
    try:
        _, landing_url = await record_click(db=db, token=click_token)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return RedirectResponse(url=landing_url, status_code=302)
