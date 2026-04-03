from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

router = APIRouter(tags=["pages"])

templates = Jinja2Templates(directory="app/templates")


@router.get("/", response_class=HTMLResponse)
async def landing_page(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "landing.html",
        {
            "page_title": "AdGenius | AI Ad Network",
            "active_page": "landing",
        },
    )


@router.get("/pricing", response_class=HTMLResponse)
async def pricing_page(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "pricing.html",
        {
            "page_title": "AdGenius Pricing",
            "active_page": "pricing",
        },
    )


@router.get("/brief", response_class=HTMLResponse)
async def brief_form_page(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "brief.html",
        {
            "page_title": "Campaign Brief Intake",
            "active_page": "brief",
        },
    )


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
