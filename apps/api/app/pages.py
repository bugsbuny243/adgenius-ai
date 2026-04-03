from pathlib import Path
import uuid

from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_db, get_optional_user, is_admin_role
from app.models.adnet import AdRequest, Campaign, Click, Impression
from app.models.briefing import AdBrief, BriefGeneratedOutput, BriefStatus, GeneratedItemType
from app.models.publisher import AdSlot, Placement, PublisherProfile, PublisherSite
from app.models.user import User, UserRole, Workspace, WorkspaceMember
from app.services.auth_service import create_access_token, hash_password, verify_password

router = APIRouter(tags=["pages"])

_templates_dir = Path(__file__).resolve().parent / "templates"
templates = Jinja2Templates(directory=str(_templates_dir))


def get_whatsapp_url() -> str:
    whatsapp_url = settings.WHATSAPP_URL.strip()
    return whatsapp_url if whatsapp_url else "/brief"


def render_page(request: Request, template_name: str, context: dict) -> HTMLResponse:
    base_context = {
        "active_page": context.get("active_page"),
        "whatsapp_url": get_whatsapp_url(),
        "current_user": context.get("current_user"),
        "is_authenticated": context.get("current_user") is not None,
    }
    base_context.update(context)
    return templates.TemplateResponse(request, template_name, base_context)


def redirect_to_login(next_url: str) -> RedirectResponse:
    return RedirectResponse(url=f"/login?next={next_url}", status_code=status.HTTP_303_SEE_OTHER)


def _require_auth_page(user: User | None, next_url: str) -> User | RedirectResponse:
    if user is None:
        return redirect_to_login(next_url)
    return user


def _require_roles_page(user: User, *roles: UserRole) -> None:
    if user.role in roles:
        return
    if UserRole.ADMIN in roles and is_admin_role(user.role):
        return
    raise HTTPException(status_code=403, detail="Forbidden")


@router.get("/", response_class=HTMLResponse)
async def landing_page(request: Request, current_user: User | None = Depends(get_optional_user)) -> HTMLResponse:
    return render_page(request, "landing.html", {"page_title": "AdGenius", "active_page": "home", "current_user": current_user})


@router.get("/packages", response_class=HTMLResponse)
async def packages_page(request: Request, current_user: User | None = Depends(get_optional_user)) -> HTMLResponse:
    return render_page(request, "pricing.html", {"page_title": "AdGenius Packages", "active_page": "packages", "current_user": current_user})


@router.get("/pricing")
async def pricing_redirect() -> RedirectResponse:
    return RedirectResponse(url="/packages", status_code=307)


@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request, current_user: User | None = Depends(get_optional_user)) -> HTMLResponse:
    if current_user:
        return RedirectResponse(url="/dashboard", status_code=status.HTTP_303_SEE_OTHER)
    return render_page(request, "login.html", {"page_title": "Login", "active_page": "login", "current_user": None})


@router.post("/login")
async def login_submit(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    next: str = Form(default="/dashboard"),
    db: AsyncSession = Depends(get_db),
):
    user = await db.scalar(select(User).where(User.email == email.strip().lower()))
    if not user or not verify_password(password, user.hashed_password) or not user.is_active:
        return render_page(
            request,
            "login.html",
            {"page_title": "Login", "active_page": "login", "error": "Invalid email or password", "current_user": None},
        )

    workspace = await db.scalar(select(Workspace).where(Workspace.owner_id == user.id))
    if workspace is None:
        member = await db.scalar(select(WorkspaceMember).where(WorkspaceMember.user_id == user.id))
        if member is not None:
            workspace = await db.scalar(select(Workspace).where(Workspace.id == member.workspace_id))
    if workspace is None:
        workspace = Workspace(name=f"{user.full_name or user.email} Workspace", slug=f"ws-{user.id.hex[:8]}", owner_id=user.id)
        db.add(workspace)
        await db.flush()

    token = create_access_token(user.id, workspace.id)
    response = RedirectResponse(url=next if next.startswith("/") else "/dashboard", status_code=status.HTTP_303_SEE_OTHER)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
    )
    return response


@router.get("/signup", response_class=HTMLResponse)
async def signup_page(request: Request, current_user: User | None = Depends(get_optional_user)) -> HTMLResponse:
    if current_user:
        return RedirectResponse(url="/dashboard", status_code=status.HTTP_303_SEE_OTHER)
    return render_page(request, "signup.html", {"page_title": "Sign Up", "active_page": "signup", "current_user": None})


@router.post("/signup")
async def signup_submit(
    request: Request,
    full_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(default="advertiser"),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.scalar(select(User).where(User.email == email.strip().lower()))
    if existing:
        return render_page(
            request,
            "signup.html",
            {"page_title": "Sign Up", "active_page": "signup", "error": "Email already exists", "current_user": None},
        )

    user_role = UserRole.from_input(role)
    if user_role not in {UserRole.ADVERTISER, UserRole.PUBLISHER}:
        user_role = UserRole.ADVERTISER

    user = User(
        full_name=full_name.strip(),
        email=email.strip().lower(),
        hashed_password=hash_password(password),
        role=user_role,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    workspace = Workspace(name=f"{user.full_name}'s Workspace", slug=f"ws-{user.id.hex[:8]}", owner_id=user.id)
    db.add(workspace)
    await db.flush()

    db.add(WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role="owner"))
    await db.flush()

    token = create_access_token(user.id, workspace.id)
    response = RedirectResponse(url="/dashboard", status_code=status.HTTP_303_SEE_OTHER)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
    )
    return response


@router.post("/logout")
async def logout_page() -> RedirectResponse:
    response = RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
    response.delete_cookie("access_token")
    return response


@router.get("/brief", response_class=HTMLResponse)
async def brief_form_page(request: Request, submitted: int = 0, db: AsyncSession = Depends(get_db), current_user: User | None = Depends(get_optional_user)) -> HTMLResponse:
    user = _require_auth_page(current_user, "/brief")
    if isinstance(user, RedirectResponse):
        return user
    _require_roles_page(user, UserRole.ADVERTISER, UserRole.ADMIN)
    query = select(AdBrief).order_by(AdBrief.created_at.desc()).limit(10)
    if not is_admin_role(user.role):
        query = query.where(AdBrief.advertiser_id == user.id)
    briefs = (await db.execute(query)).scalars().all()
    return render_page(request, "brief.html", {"page_title": "Brief", "active_page": "brief", "submitted": bool(submitted), "briefs": briefs, "current_user": user})


@router.post("/brief")
async def submit_brief(
    request: Request,
    business_name: str = Form(...),
    sector: str = Form(...),
    offer_summary: str = Form(...),
    target_audience: str = Form(...),
    goal: str = Form(...),
    competitor_examples: str = Form(""),
    tone_notes: str = Form(""),
    selected_package: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> RedirectResponse:
    user = _require_auth_page(current_user, "/brief")
    if isinstance(user, RedirectResponse):
        return user
    _require_roles_page(user, UserRole.ADVERTISER, UserRole.ADMIN)

    db.add(
        AdBrief(
            advertiser_id=user.id,
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
async def dashboard_page(request: Request, db: AsyncSession = Depends(get_db), current_user: User | None = Depends(get_optional_user)) -> HTMLResponse:
    user = _require_auth_page(current_user, "/dashboard")
    if isinstance(user, RedirectResponse):
        return user

    brief_filter = True if is_admin_role(user.role) else (AdBrief.advertiser_id == user.id)
    campaign_filter = True if is_admin_role(user.role) else (Campaign.user_id == user.id)

    profile = await db.scalar(select(PublisherProfile).where(PublisherProfile.user_id == user.id))
    slot_filter = (
        True
        if is_admin_role(user.role)
        else (PublisherProfile.id == profile.id if profile else PublisherProfile.id == uuid.uuid4())
    )

    brief_count = await db.scalar(select(func.count(AdBrief.id)).where(brief_filter))
    campaign_count = await db.scalar(select(func.count(Campaign.id)).where(campaign_filter))
    slot_count = await db.scalar(
        select(func.count(AdSlot.id)).join(Placement, Placement.id == AdSlot.placement_id).join(PublisherProfile, PublisherProfile.id == Placement.publisher_id).where(slot_filter)
    )
    serve_events = await db.scalar(select(func.count(AdRequest.id)))

    recent_briefs_query = select(AdBrief).order_by(AdBrief.created_at.desc()).limit(5)
    recent_campaigns_query = select(Campaign).order_by(Campaign.created_at.desc()).limit(5)
    recent_outputs_query = (
        select(BriefGeneratedOutput)
        .join(AdBrief, AdBrief.id == BriefGeneratedOutput.brief_id)
        .order_by(BriefGeneratedOutput.created_at.desc())
        .limit(8)
    )
    if not is_admin_role(user.role):
        recent_briefs_query = recent_briefs_query.where(AdBrief.advertiser_id == user.id)
        recent_campaigns_query = recent_campaigns_query.where(Campaign.user_id == user.id)
        recent_outputs_query = recent_outputs_query.where(AdBrief.advertiser_id == user.id)

    return render_page(
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
            "recent_briefs": (await db.execute(recent_briefs_query)).scalars().all(),
            "recent_campaigns": (await db.execute(recent_campaigns_query)).scalars().all(),
            "recent_outputs": (await db.execute(recent_outputs_query)).scalars().all(),
            "current_user": user,
        },
    )


@router.get("/campaigns")
async def campaigns_shortcut() -> RedirectResponse:
    return RedirectResponse(url="/dashboard/campaigns", status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.get("/publisher")
async def publisher_shortcut() -> RedirectResponse:
    return RedirectResponse(url="/dashboard/publisher", status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.get("/dashboard/briefs", response_class=HTMLResponse)
async def dashboard_briefs(request: Request, db: AsyncSession = Depends(get_db), current_user: User | None = Depends(get_optional_user)):
    user = _require_auth_page(current_user, "/dashboard/briefs")
    if isinstance(user, RedirectResponse):
        return user
    _require_roles_page(user, UserRole.ADVERTISER, UserRole.ADMIN)

    briefs_query = select(AdBrief).order_by(AdBrief.created_at.desc())
    if not is_admin_role(user.role):
        briefs_query = briefs_query.where(AdBrief.advertiser_id == user.id)
    briefs = (await db.execute(briefs_query)).scalars().all()
    return render_page(request, "dashboard_briefs.html", {"page_title": "Briefs", "active_page": "dashboard", "briefs": briefs, "current_user": user})


@router.get("/dashboard/briefs/{id}", response_class=HTMLResponse)
async def brief_detail_page(id: str, request: Request, db: AsyncSession = Depends(get_db), current_user: User | None = Depends(get_optional_user)):
    user = _require_auth_page(current_user, f"/dashboard/briefs/{id}")
    if isinstance(user, RedirectResponse):
        return user
    _require_roles_page(user, UserRole.ADVERTISER, UserRole.ADMIN)

    query = select(AdBrief).where(AdBrief.id == uuid.UUID(id))
    if not is_admin_role(user.role):
        query = query.where(AdBrief.advertiser_id == user.id)
    brief = await db.scalar(query)
    if not brief:
        raise HTTPException(status_code=404)
    outputs = (await db.execute(select(BriefGeneratedOutput).where(BriefGeneratedOutput.brief_id == brief.id).order_by(BriefGeneratedOutput.created_at.desc()))).scalars().all()
    return render_page(request, "dashboard_brief_detail.html", {"page_title": "Brief Detail", "brief": brief, "outputs": outputs, "current_user": user})


@router.get("/dashboard/briefs/{id}/studio", response_class=HTMLResponse)
async def studio_page(id: str, request: Request, db: AsyncSession = Depends(get_db), current_user: User | None = Depends(get_optional_user)):
    user = _require_auth_page(current_user, f"/dashboard/briefs/{id}/studio")
    if isinstance(user, RedirectResponse):
        return user
    _require_roles_page(user, UserRole.ADVERTISER, UserRole.ADMIN)

    query = select(AdBrief).where(AdBrief.id == uuid.UUID(id))
    if not is_admin_role(user.role):
        query = query.where(AdBrief.advertiser_id == user.id)
    brief = await db.scalar(query)
    if not brief:
        raise HTTPException(status_code=404)
    outputs = (await db.execute(select(BriefGeneratedOutput).where(BriefGeneratedOutput.brief_id == brief.id))).scalars().all()
    return render_page(
        request,
        "studio.html",
        {
            "page_title": "AI Creative Studio",
            "brief": brief,
            "angles": [o for o in outputs if o.output_type == GeneratedItemType.ANGLE],
            "copies": [o for o in outputs if o.output_type == GeneratedItemType.COPY],
            "concepts": [o for o in outputs if o.output_type == GeneratedItemType.CONCEPT],
            "current_user": user,
        },
    )


@router.get("/dashboard/briefs/{id}/preview", response_class=HTMLResponse)
async def preview_page(id: str, request: Request, db: AsyncSession = Depends(get_db), current_user: User | None = Depends(get_optional_user)):
    user = _require_auth_page(current_user, f"/dashboard/briefs/{id}/preview")
    if isinstance(user, RedirectResponse):
        return user
    _require_roles_page(user, UserRole.ADVERTISER, UserRole.ADMIN)

    query = select(AdBrief).where(AdBrief.id == uuid.UUID(id))
    if not is_admin_role(user.role):
        query = query.where(AdBrief.advertiser_id == user.id)
    brief = await db.scalar(query)
    if not brief:
        raise HTTPException(status_code=404)
    selected = (await db.execute(select(BriefGeneratedOutput).where(BriefGeneratedOutput.brief_id == brief.id, BriefGeneratedOutput.is_selected.is_(True)))).scalars().all()
    selected_angle = next((x for x in selected if x.output_type == GeneratedItemType.ANGLE), None)
    selected_copy = next((x for x in selected if x.output_type == GeneratedItemType.COPY), None)
    selected_concept = next((x for x in selected if x.output_type == GeneratedItemType.CONCEPT), None)
    return render_page(request, "preview.html", {"page_title": "Preview Studio", "brief": brief, "angle": selected_angle, "copy": selected_copy, "concept": selected_concept, "current_user": user})


@router.get("/dashboard/campaigns", response_class=HTMLResponse)
async def campaigns_page(request: Request, db: AsyncSession = Depends(get_db), current_user: User | None = Depends(get_optional_user)):
    user = _require_auth_page(current_user, "/dashboard/campaigns")
    if isinstance(user, RedirectResponse):
        return user
    _require_roles_page(user, UserRole.ADVERTISER, UserRole.ADMIN)

    query = select(Campaign).order_by(Campaign.created_at.desc())
    if not is_admin_role(user.role):
        query = query.where(Campaign.user_id == user.id)
    campaigns = (await db.execute(query)).scalars().all()
    return render_page(request, "campaigns.html", {"page_title": "Campaigns", "campaigns": campaigns, "current_user": user})


@router.get("/dashboard/campaigns/{id}", response_class=HTMLResponse)
async def campaign_detail_page(id: str, request: Request, db: AsyncSession = Depends(get_db), current_user: User | None = Depends(get_optional_user)):
    user = _require_auth_page(current_user, f"/dashboard/campaigns/{id}")
    if isinstance(user, RedirectResponse):
        return user
    _require_roles_page(user, UserRole.ADVERTISER, UserRole.ADMIN)

    query = select(Campaign).where(Campaign.id == uuid.UUID(id))
    if not is_admin_role(user.role):
        query = query.where(Campaign.user_id == user.id)
    campaign = await db.scalar(query)
    if not campaign:
        raise HTTPException(status_code=404)
    return render_page(request, "campaign_detail.html", {"page_title": "Campaign Detail", "campaign": campaign, "current_user": user})


@router.get("/dashboard/publisher", response_class=HTMLResponse)
async def publisher_page(request: Request, db: AsyncSession = Depends(get_db), current_user: User | None = Depends(get_optional_user)):
    user = _require_auth_page(current_user, "/dashboard/publisher")
    if isinstance(user, RedirectResponse):
        return user
    _require_roles_page(user, UserRole.PUBLISHER, UserRole.ADMIN)

    profile = await db.scalar(select(PublisherProfile).where(PublisherProfile.user_id == user.id)) if not is_admin_role(user.role) else None
    return render_page(request, "publisher.html", {"page_title": "Publisher", "profile": profile, "current_user": user})


@router.get("/dashboard/publisher/sites", response_class=HTMLResponse)
async def publisher_sites_page(request: Request, db: AsyncSession = Depends(get_db), current_user: User | None = Depends(get_optional_user)):
    user = _require_auth_page(current_user, "/dashboard/publisher/sites")
    if isinstance(user, RedirectResponse):
        return user
    _require_roles_page(user, UserRole.PUBLISHER, UserRole.ADMIN)

    query = select(PublisherSite).order_by(PublisherSite.created_at.desc())
    if not is_admin_role(user.role):
        profile = await db.scalar(select(PublisherProfile).where(PublisherProfile.user_id == user.id))
        query = query.where(PublisherSite.publisher_id == (profile.id if profile else uuid.uuid4()))
    sites = (await db.execute(query)).scalars().all()
    return render_page(request, "publisher_sites.html", {"page_title": "Publisher Sites", "sites": sites, "current_user": user})


@router.get("/dashboard/publisher/placements", response_class=HTMLResponse)
async def publisher_placements_page(request: Request, db: AsyncSession = Depends(get_db), current_user: User | None = Depends(get_optional_user)):
    user = _require_auth_page(current_user, "/dashboard/publisher/placements")
    if isinstance(user, RedirectResponse):
        return user
    _require_roles_page(user, UserRole.PUBLISHER, UserRole.ADMIN)

    query = select(Placement).order_by(Placement.created_at.desc())
    if not is_admin_role(user.role):
        profile = await db.scalar(select(PublisherProfile).where(PublisherProfile.user_id == user.id))
        query = query.where(Placement.publisher_id == (profile.id if profile else uuid.uuid4()))
    placements = (await db.execute(query)).scalars().all()
    return render_page(request, "publisher_placements.html", {"page_title": "Publisher Placements", "placements": placements, "current_user": user})


@router.get("/dashboard/publisher/slots", response_class=HTMLResponse)
async def publisher_slots_page(request: Request, db: AsyncSession = Depends(get_db), current_user: User | None = Depends(get_optional_user)):
    user = _require_auth_page(current_user, "/dashboard/publisher/slots")
    if isinstance(user, RedirectResponse):
        return user
    _require_roles_page(user, UserRole.PUBLISHER, UserRole.ADMIN)

    query = select(AdSlot).order_by(AdSlot.created_at.desc())
    if not is_admin_role(user.role):
        profile = await db.scalar(select(PublisherProfile).where(PublisherProfile.user_id == user.id))
        if profile:
            query = query.join(Placement, Placement.id == AdSlot.placement_id).where(Placement.publisher_id == profile.id)
        else:
            query = query.where(AdSlot.id == uuid.uuid4())
    slots = (await db.execute(query)).scalars().all()
    return render_page(request, "publisher_slots.html", {"page_title": "Publisher Slots", "slots": slots, "current_user": user})


@router.get("/dashboard/activity", response_class=HTMLResponse)
async def activity_page(request: Request, db: AsyncSession = Depends(get_db), current_user: User | None = Depends(get_optional_user)):
    user = _require_auth_page(current_user, "/dashboard/activity")
    if isinstance(user, RedirectResponse):
        return user
    _require_roles_page(user, UserRole.ADMIN)

    ad_requests = (await db.execute(select(AdRequest).order_by(AdRequest.created_at.desc()).limit(25))).scalars().all()
    impressions = (await db.execute(select(Impression).order_by(Impression.created_at.desc()).limit(25))).scalars().all()
    clicks = (await db.execute(select(Click).order_by(Click.created_at.desc()).limit(25))).scalars().all()
    return render_page(request, "activity.html", {"page_title": "Activity", "ad_requests": ad_requests, "impressions": impressions, "clicks": clicks, "current_user": user})


@router.get("/contact")
async def contact_redirect() -> RedirectResponse:
    return RedirectResponse(url=get_whatsapp_url(), status_code=307)


@router.get("/admin", response_class=HTMLResponse)
async def admin_page(request: Request, current_user: User | None = Depends(get_optional_user)) -> HTMLResponse:
    user = _require_auth_page(current_user, "/admin")
    if isinstance(user, RedirectResponse):
        return user
    _require_roles_page(user, UserRole.ADMIN)
    return render_page(request, "admin.html", {"page_title": "AdGenius Admin", "active_page": "admin", "current_user": user})
