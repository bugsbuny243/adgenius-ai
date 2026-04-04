from pathlib import Path

from fastapi import APIRouter, Depends, Form, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from app.dependencies import clear_auth_cookie, get_optional_user, set_auth_cookie
from app.supabase_client import get_supabase

router = APIRouter(tags=["pages"])

_templates_dir = Path(__file__).resolve().parent / "templates"
templates = Jinja2Templates(directory=str(_templates_dir))


def render_page(request: Request, template_name: str, context: dict) -> HTMLResponse:
    return templates.TemplateResponse(request, template_name, context)


@router.get("/", response_class=HTMLResponse)
async def landing_page(request: Request, current_user=Depends(get_optional_user)) -> HTMLResponse:
    return render_page(request, "landing.html", {"request": request, "current_user": current_user})


@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request, current_user=Depends(get_optional_user)) -> HTMLResponse:
    if current_user:
        return RedirectResponse(url="/dashboard", status_code=status.HTTP_303_SEE_OTHER)
    return render_page(request, "login.html", {"request": request, "current_user": None})


@router.post("/login")
async def login_submit(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    next: str = Form(default="/dashboard"),
):
    result = get_supabase().auth.sign_in_with_password({"email": email.strip().lower(), "password": password})
    session = getattr(result, "session", None)
    if not session or not session.access_token:
        return render_page(
            request,
            "login.html",
            {"request": request, "error": "Invalid email or password", "current_user": None},
        )

    response = RedirectResponse(url=next if next.startswith("/") else "/dashboard", status_code=status.HTTP_303_SEE_OTHER)
    set_auth_cookie(response, session.access_token)
    return response


@router.get("/signup", response_class=HTMLResponse)
async def signup_page(request: Request, current_user=Depends(get_optional_user)) -> HTMLResponse:
    if current_user:
        return RedirectResponse(url="/dashboard", status_code=status.HTTP_303_SEE_OTHER)
    return render_page(request, "signup.html", {"request": request, "current_user": None})


@router.post("/signup")
async def signup_submit(
    request: Request,
    full_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
):
    result = get_supabase().auth.sign_up(
        {
            "email": email.strip().lower(),
            "password": password,
            "options": {"data": {"full_name": full_name.strip(), "role": "advertiser"}},
        }
    )
    user = getattr(result, "user", None)
    if not user:
        return render_page(
            request,
            "signup.html",
            {"request": request, "error": "Sign up failed", "current_user": None},
        )

    sign_in = get_supabase().auth.sign_in_with_password({"email": email.strip().lower(), "password": password})
    session = getattr(sign_in, "session", None)
    response = RedirectResponse(url="/dashboard", status_code=status.HTTP_303_SEE_OTHER)
    if session and session.access_token:
        set_auth_cookie(response, session.access_token)
    return response


@router.post("/logout")
async def logout_page() -> RedirectResponse:
    get_supabase().auth.sign_out()
    response = RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
    clear_auth_cookie(response)
    return response


@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(request: Request, current_user=Depends(get_optional_user)) -> HTMLResponse:
    if not current_user:
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)
    return render_page(request, "dashboard.html", {"request": request, "current_user": current_user, "summary": {}})
