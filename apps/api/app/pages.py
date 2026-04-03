from pathlib import Path
import uuid

from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_db
from app.models.adnet import AdRequest, Campaign, Click, Impression
from app.models.briefing import AdBrief, BriefGeneratedOutput, BriefStatus, GeneratedItemType
from app.models.publisher import AdSlot, Placement, PublisherProfile, PublisherSite
from app.services.brief_service import get_or_create_demo_user
from app.models.user import UserRole

router = APIRouter(tags=["pages"])

_templates_dir = Path(__file__).resolve().parent / "templates"
templates = Jinja2Templates(directory=str(_templates_dir))


def get_whatsapp_url() -> str:
    whatsapp_url = settings.WHATSAPP_URL.strip()
    return whatsapp_url if whatsapp_url else "/brief"


@router.get("/", response_class=HTMLResponse)
async def landing_page(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "landing.html", {"page_title": "AdGenius", "active_page": "home", "whatsapp_url": get_whatsapp_url()})


@router.get("/packages", response_class=HTMLResponse)
async def packages_page(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "pricing.html", {"page_title": "AdGenius Packages", "active_page": "packages", "whatsapp_url": get_whatsapp_url()})


@router.get("/pricing")
async def pricing_redirect() -> RedirectResponse:
    return RedirectResponse(url="/packages", status_code=307)


@router.get("/brief", response_class=HTMLResponse)
async def brief_form_page(request: Request, submitted: int = 0, db: AsyncSession = Depends(get_db)) -> HTMLResponse:
    advertiser = await get_or_create_demo_user(db)
    briefs = (await db.execute(select(AdBrief).where(AdBrief.advertiser_id == advertiser.id).order_by(AdBrief.created_at.desc()).limit(10))).scalars().all()
    return templates.TemplateResponse(
        request,
        "brief.html",
        {
            "page_title": "Brief",
            "active_page": "brief",
            "submitted": bool(submitted),
            "whatsapp_url": get_whatsapp_url(),
            "briefs": briefs,
        },
    )


@router.post("/brief")
async def submit_brief(
    business_name: str = Form(...),
    sector: str = Form(...),
    offer_summary: str = Form(...),
    target_audience: str = Form(...),
    goal: str = Form(...),
    competitor_examples: str = Form(""),
    tone_notes: str = Form(""),
    selected_package: str = Form(...),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    advertiser = await get_or_create_demo_user(db)
    db.add(
        AdBrief(
            advertiser_id=advertiser.id,
            business_name=business_name.strip(),
            sector=sector.strip(),
            offer_summary=offer_summary.strip(),
            target_audience=target_audience.strip(),
            goal=goal.strip(),
            competitor_examples=competitor_examples.strip(),
            tone_notes=tone_notes.strip(),
            selected_package=selected_package.strip(),
            status=BriefStatus.SUBMITTED,
        )
    )
    await db.flush()
    return RedirectResponse(url="/brief?submitted=1", status_code=303)


@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(request: Request, db: AsyncSession = Depends(get_db)) -> HTMLResponse:
    advertiser = await get_or_create_demo_user(db)
    publisher_user = await get_or_create_demo_user(db, role=UserRole.PUBLISHER)
    brief_count = await db.scalar(select(func.count(AdBrief.id)).where(AdBrief.advertiser_id == advertiser.id))
    campaign_count = await db.scalar(select(func.count(Campaign.id)).where(Campaign.user_id == advertiser.id))
    slot_count = await db.scalar(
        select(func.count(AdSlot.id)).join(Placement, Placement.id == AdSlot.placement_id).join(PublisherProfile, PublisherProfile.id == Placement.publisher_id).where(PublisherProfile.user_id == publisher_user.id)
    )
    serve_events = await db.scalar(select(func.count(AdRequest.id)))
    return templates.TemplateResponse(
        request,
        "dashboard.html",
        {
            "page_title": "AdGenius Dashboard",
            "active_page": "dashboard",
            "summary": {
                "brief_count": brief_count or 0,
                "campaign_count": campaign_count or 0,
                "slot_count": slot_count or 0,
                "serve_events": serve_events or 0,
            },
            "recent_briefs": (await db.execute(select(AdBrief).order_by(AdBrief.created_at.desc()).limit(5))).scalars().all(),
            "recent_campaigns": (await db.execute(select(Campaign).order_by(Campaign.created_at.desc()).limit(5))).scalars().all(),
            "recent_outputs": (await db.execute(select(BriefGeneratedOutput).order_by(BriefGeneratedOutput.created_at.desc()).limit(8))).scalars().all(),
        },
    )


@router.get("/dashboard/briefs", response_class=HTMLResponse)
async def dashboard_briefs(request: Request, db: AsyncSession = Depends(get_db)):
    advertiser = await get_or_create_demo_user(db)
    briefs = (await db.execute(select(AdBrief).where(AdBrief.advertiser_id == advertiser.id).order_by(AdBrief.created_at.desc()))).scalars().all()
    return templates.TemplateResponse(request, "dashboard_briefs.html", {"page_title": "Briefs", "active_page": "dashboard", "briefs": briefs})


@router.get("/dashboard/briefs/{id}", response_class=HTMLResponse)
async def brief_detail_page(id: str, request: Request, db: AsyncSession = Depends(get_db)):
    brief = await db.scalar(select(AdBrief).where(AdBrief.id == uuid.UUID(id)))
    if not brief:
        raise HTTPException(status_code=404)
    outputs = (await db.execute(select(BriefGeneratedOutput).where(BriefGeneratedOutput.brief_id == brief.id).order_by(BriefGeneratedOutput.created_at.desc()))).scalars().all()
    return templates.TemplateResponse(request, "dashboard_brief_detail.html", {"page_title": "Brief Detail", "brief": brief, "outputs": outputs})


@router.get("/dashboard/briefs/{id}/studio", response_class=HTMLResponse)
async def studio_page(id: str, request: Request, db: AsyncSession = Depends(get_db)):
    brief = await db.scalar(select(AdBrief).where(AdBrief.id == uuid.UUID(id)))
    if not brief:
        raise HTTPException(status_code=404)
    outputs = (await db.execute(select(BriefGeneratedOutput).where(BriefGeneratedOutput.brief_id == brief.id))).scalars().all()
    return templates.TemplateResponse(
        request,
        "studio.html",
        {
            "page_title": "AI Creative Studio",
            "brief": brief,
            "angles": [o for o in outputs if o.output_type == GeneratedItemType.ANGLE],
            "copies": [o for o in outputs if o.output_type == GeneratedItemType.COPY],
            "concepts": [o for o in outputs if o.output_type == GeneratedItemType.CONCEPT],
        },
    )


@router.get("/dashboard/briefs/{id}/preview", response_class=HTMLResponse)
async def preview_page(id: str, request: Request, db: AsyncSession = Depends(get_db)):
    brief = await db.scalar(select(AdBrief).where(AdBrief.id == uuid.UUID(id)))
    if not brief:
        raise HTTPException(status_code=404)
    selected = (await db.execute(select(BriefGeneratedOutput).where(BriefGeneratedOutput.brief_id == brief.id, BriefGeneratedOutput.is_selected.is_(True)))).scalars().all()
    selected_angle = next((x for x in selected if x.output_type == GeneratedItemType.ANGLE), None)
    selected_copy = next((x for x in selected if x.output_type == GeneratedItemType.COPY), None)
    selected_concept = next((x for x in selected if x.output_type == GeneratedItemType.CONCEPT), None)
    return templates.TemplateResponse(request, "preview.html", {"page_title": "Preview Studio", "brief": brief, "angle": selected_angle, "copy": selected_copy, "concept": selected_concept})


@router.get("/dashboard/campaigns", response_class=HTMLResponse)
async def campaigns_page(request: Request, db: AsyncSession = Depends(get_db)):
    advertiser = await get_or_create_demo_user(db)
    campaigns = (await db.execute(select(Campaign).where(Campaign.user_id == advertiser.id).order_by(Campaign.created_at.desc()))).scalars().all()
    return templates.TemplateResponse(request, "campaigns.html", {"page_title": "Campaigns", "campaigns": campaigns})


@router.get("/dashboard/campaigns/{id}", response_class=HTMLResponse)
async def campaign_detail_page(id: str, request: Request, db: AsyncSession = Depends(get_db)):
    campaign = await db.scalar(select(Campaign).where(Campaign.id == uuid.UUID(id)))
    if not campaign:
        raise HTTPException(status_code=404)
    return templates.TemplateResponse(request, "campaign_detail.html", {"page_title": "Campaign Detail", "campaign": campaign})


@router.get("/dashboard/publisher", response_class=HTMLResponse)
async def publisher_page(request: Request, db: AsyncSession = Depends(get_db)):
    publisher_user = await get_or_create_demo_user(db, role=UserRole.PUBLISHER)
    profile = await db.scalar(select(PublisherProfile).where(PublisherProfile.user_id == publisher_user.id))
    return templates.TemplateResponse(request, "publisher.html", {"page_title": "Publisher", "profile": profile})


@router.get("/dashboard/publisher/sites", response_class=HTMLResponse)
async def publisher_sites_page(request: Request, db: AsyncSession = Depends(get_db)):
    sites = (await db.execute(select(PublisherSite).order_by(PublisherSite.created_at.desc()))).scalars().all()
    return templates.TemplateResponse(request, "publisher_sites.html", {"page_title": "Publisher Sites", "sites": sites})


@router.get("/dashboard/publisher/placements", response_class=HTMLResponse)
async def publisher_placements_page(request: Request, db: AsyncSession = Depends(get_db)):
    placements = (await db.execute(select(Placement).order_by(Placement.created_at.desc()))).scalars().all()
    return templates.TemplateResponse(request, "publisher_placements.html", {"page_title": "Publisher Placements", "placements": placements})


@router.get("/dashboard/publisher/slots", response_class=HTMLResponse)
async def publisher_slots_page(request: Request, db: AsyncSession = Depends(get_db)):
    slots = (await db.execute(select(AdSlot).order_by(AdSlot.created_at.desc()))).scalars().all()
    return templates.TemplateResponse(request, "publisher_slots.html", {"page_title": "Publisher Slots", "slots": slots})


@router.get("/dashboard/activity", response_class=HTMLResponse)
async def activity_page(request: Request, db: AsyncSession = Depends(get_db)):
    ad_requests = (await db.execute(select(AdRequest).order_by(AdRequest.created_at.desc()).limit(25))).scalars().all()
    impressions = (await db.execute(select(Impression).order_by(Impression.created_at.desc()).limit(25))).scalars().all()
    clicks = (await db.execute(select(Click).order_by(Click.created_at.desc()).limit(25))).scalars().all()
    return templates.TemplateResponse(request, "activity.html", {"page_title": "Activity", "ad_requests": ad_requests, "impressions": impressions, "clicks": clicks})


@router.get("/contact")
async def contact_redirect() -> RedirectResponse:
    return RedirectResponse(url=get_whatsapp_url(), status_code=307)


@router.get("/admin", response_class=HTMLResponse)
async def admin_page(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "admin.html", {"page_title": "AdGenius Admin", "active_page": "admin"})
