import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.briefing import AdBrief, BriefGeneratedOutput, BriefStatus, GeneratedItemType
from app.services.brief_service import create_campaign_from_brief, generate_for_brief, get_or_create_demo_user

router = APIRouter(tags=["briefs"])


class BriefIn(BaseModel):
    business_name: str
    sector: str
    offer_summary: str
    target_audience: str
    goal: str
    competitor_examples: str | None = None
    tone_notes: str | None = None
    selected_package: str | None = None
    status: str = "submitted"


class BriefOut(BriefIn):
    id: str


class BriefOutputSelectionIn(BaseModel):
    output_id: str
    selected: bool = True


@router.post("/briefs", response_model=BriefOut, status_code=status.HTTP_201_CREATED)
async def create_brief(payload: BriefIn, db: AsyncSession = Depends(get_db)):
    advertiser = await get_or_create_demo_user(db)
    brief = AdBrief(advertiser_id=advertiser.id, **payload.model_dump())
    brief.status = BriefStatus(payload.status.lower())
    db.add(brief)
    await db.flush()
    return BriefOut(id=str(brief.id), **payload.model_dump())


@router.get("/briefs", response_model=list[BriefOut])
async def list_briefs(db: AsyncSession = Depends(get_db)):
    advertiser = await get_or_create_demo_user(db)
    rows = await db.execute(select(AdBrief).where(AdBrief.advertiser_id == advertiser.id).order_by(AdBrief.created_at.desc()))
    items = rows.scalars().all()
    return [
        BriefOut(
            id=str(item.id),
            business_name=item.business_name,
            sector=item.sector,
            offer_summary=item.offer_summary,
            target_audience=item.target_audience,
            goal=item.goal,
            competitor_examples=item.competitor_examples,
            tone_notes=item.tone_notes,
            selected_package=item.selected_package,
            status=item.status.value,
        )
        for item in items
    ]


@router.get("/briefs/{id}", response_model=BriefOut)
async def get_brief(id: str, db: AsyncSession = Depends(get_db)):
    brief = await db.scalar(select(AdBrief).where(AdBrief.id == uuid.UUID(id)))
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")
    return BriefOut(
        id=str(brief.id),
        business_name=brief.business_name,
        sector=brief.sector,
        offer_summary=brief.offer_summary,
        target_audience=brief.target_audience,
        goal=brief.goal,
        competitor_examples=brief.competitor_examples,
        tone_notes=brief.tone_notes,
        selected_package=brief.selected_package,
        status=brief.status.value,
    )


@router.post("/briefs/{id}/generate")
async def generate_brief_outputs(id: str, db: AsyncSession = Depends(get_db)):
    brief = await db.scalar(select(AdBrief).where(AdBrief.id == uuid.UUID(id)))
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")
    try:
        run = await generate_for_brief(db, brief)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"run_id": str(run.id), "status": run.status.value}


@router.post("/briefs/{id}/outputs/select")
async def select_output(id: str, payload: BriefOutputSelectionIn, db: AsyncSession = Depends(get_db)):
    brief = await db.scalar(select(AdBrief).where(AdBrief.id == uuid.UUID(id)))
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")

    output = await db.scalar(
        select(BriefGeneratedOutput).where(
            BriefGeneratedOutput.id == uuid.UUID(payload.output_id),
            BriefGeneratedOutput.brief_id == brief.id,
        )
    )
    if not output:
        raise HTTPException(status_code=404, detail="Output not found")

    if payload.selected:
        existing = await db.execute(
            select(BriefGeneratedOutput).where(
                BriefGeneratedOutput.brief_id == brief.id,
                BriefGeneratedOutput.output_type == output.output_type,
                BriefGeneratedOutput.id != output.id,
            )
        )
        for item in existing.scalars().all():
            item.is_selected = False

    output.is_selected = payload.selected
    if output.output_type == GeneratedItemType.ANGLE:
        brief.selected_angle_id = output.id if payload.selected else None
    elif output.output_type == GeneratedItemType.COPY:
        brief.selected_copy_id = output.id if payload.selected else None
    elif output.output_type == GeneratedItemType.CONCEPT:
        brief.selected_concept_id = output.id if payload.selected else None

    await db.flush()
    return {"ok": True}


@router.post("/briefs/{id}/create-campaign")
async def create_campaign(id: str, db: AsyncSession = Depends(get_db)):
    brief = await db.scalar(select(AdBrief).where(AdBrief.id == uuid.UUID(id)))
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")
    advertiser = await get_or_create_demo_user(db)
    result = await create_campaign_from_brief(db, brief, advertiser.id)
    return result
