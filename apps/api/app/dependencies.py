import uuid
from typing import AsyncGenerator

from fastapi import Cookie, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.user import User, UserRole, Workspace
from app.services.auth_service import decode_access_token


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def _auth_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def is_admin_role(role: UserRole) -> bool:
    return role in {UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER}


async def _resolve_user_from_token(token: str | None, db: AsyncSession) -> User | None:
    if not token:
        return None

    payload = decode_access_token(token)
    if not payload:
        return None

    user_id_str = payload.get("sub")
    if not user_id_str:
        return None

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        return None

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        return None
    return user


async def get_optional_user(
    access_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    return await _resolve_user_from_token(access_token, db)


async def get_current_user(
    access_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await _resolve_user_from_token(access_token, db)
    if not user:
        raise _auth_exception()
    return user


async def get_current_user_or_redirect(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await _resolve_user_from_token(request.cookies.get("access_token"), db)
    if not user:
        raise HTTPException(status_code=status.HTTP_303_SEE_OTHER, headers={"Location": "/login"})
    return user


async def get_current_workspace(
    access_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> Workspace:
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    if not access_token:
        raise credentials_exception
    payload = decode_access_token(access_token)
    if not payload:
        raise credentials_exception
    workspace_id_str = payload.get("workspace_id")
    if not workspace_id_str:
        raise credentials_exception
    try:
        workspace_id = uuid.UUID(workspace_id_str)
    except ValueError:
        raise credentials_exception
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise credentials_exception
    return workspace


def require_roles(*roles: UserRole):
    allowed = set(roles)

    def _checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role in allowed or (UserRole.ADMIN in allowed and is_admin_role(current_user.role)):
            return current_user
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    return _checker
