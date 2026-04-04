from typing import Any

from fastapi import Cookie, Depends, HTTPException, Request, Response, status

from app.config import settings
from app.supabase_client import get_supabase

AUTH_COOKIE_KEY = "access_token"
AUTH_COOKIE_MAX_AGE = settings.ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=AUTH_COOKIE_KEY,
        value=token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=AUTH_COOKIE_MAX_AGE,
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=AUTH_COOKIE_KEY,
        path="/",
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
    )


def _auth_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def is_admin_role(role: str | None) -> bool:
    return (role or "").lower() in {"super_admin", "ops_manager", "admin"}


def _resolve_user_from_token(token: str | None) -> dict[str, Any] | None:
    if not token:
        return None

    response = get_supabase().auth.get_user(token)
    user = getattr(response, "user", None)
    if not user:
        return None
    metadata = getattr(user, "user_metadata", {}) or {}
    return {
        "id": str(user.id),
        "email": user.email,
        "role": metadata.get("role", "advertiser"),
        "metadata": metadata,
    }


async def get_optional_user(
    access_token: str | None = Cookie(default=None, alias=AUTH_COOKIE_KEY),
) -> dict[str, Any] | None:
    return _resolve_user_from_token(access_token)


async def get_current_user(
    access_token: str | None = Cookie(default=None, alias=AUTH_COOKIE_KEY),
) -> dict[str, Any]:
    user = _resolve_user_from_token(access_token)
    if not user:
        raise _auth_exception()
    return user


async def get_current_user_or_redirect(
    request: Request,
) -> dict[str, Any]:
    user = _resolve_user_from_token(request.cookies.get(AUTH_COOKIE_KEY))
    if not user:
        raise HTTPException(status_code=status.HTTP_303_SEE_OTHER, headers={"Location": "/login"})
    return user


def require_roles(*roles: str):
    allowed = {r.lower() for r in roles}

    def _checker(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        if (current_user.get("role") or "").lower() in allowed:
            return current_user
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    return _checker
