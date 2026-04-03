from pathlib import Path

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_db
from app.models.lead import LeadBrief

router = APIRouter(tags=["pages"])

_templates_dir = Path(__file__).resolve().parent / "templates"
templates = Jinja2Templates(directory=str(_templates_dir))


def get_whatsapp_url() -> str:
    whatsapp_url = settings.WHATSAPP_URL.strip()
    if whatsapp_url:
        return whatsapp_url
    return "/brief"


@router.get("/", response_class=HTMLResponse)
async def landing_page(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "landing.html",
        {
            "page_title": "TradePi Global | Yerel İşletmeler için Reklam İçerikleri",
            "active_page": "home",
            "whatsapp_url": get_whatsapp_url(),
        },
    )


@router.get("/packages", response_class=HTMLResponse)
async def packages_page(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "pricing.html",
        {
            "page_title": "TradePi Global Paketleri",
            "active_page": "packages",
            "whatsapp_url": get_whatsapp_url(),
        },
    )


@router.get("/pricing")
async def pricing_redirect() -> RedirectResponse:
    return RedirectResponse(url="/packages", status_code=307)


@router.get("/brief", response_class=HTMLResponse)
async def brief_form_page(request: Request, submitted: int = 0) -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "brief.html",
        {
            "page_title": "Brief Formu",
            "active_page": "brief",
            "submitted": bool(submitted),
            "whatsapp_url": get_whatsapp_url(),
        },
    )


@router.post("/brief")
async def submit_brief(
    business_name: str = Form(...),
    sector: str = Form(...),
    what_do_you_sell: str = Form(...),
    target_audience: str = Form(...),
    advertising_goal: str = Form(...),
    website_or_social_link: str = Form(""),
    competitor_examples: str = Form(""),
    interested_package: str = Form(...),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    lead = LeadBrief(
        business_name=business_name.strip(),
        sector=sector.strip(),
        what_do_you_sell=what_do_you_sell.strip(),
        target_audience=target_audience.strip(),
        advertising_goal=advertising_goal.strip(),
        website_or_social_link=website_or_social_link.strip(),
        competitor_examples=competitor_examples.strip(),
        interested_package=interested_package.strip(),
    )
    db.add(lead)
    await db.flush()
    return RedirectResponse(url="/brief?submitted=1", status_code=303)


@router.get("/contact")
async def contact_redirect() -> RedirectResponse:
    return RedirectResponse(url=get_whatsapp_url(), status_code=307)


@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "dashboard.html",
        {
            "page_title": "Advertiser Dashboard",
            "active_page": "dashboard",
        },
    )


@router.get("/admin", response_class=HTMLResponse)
async def admin_page(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "admin.html",
        {
            "page_title": "AdGenius Admin",
            "active_page": "admin",
        },
    )
