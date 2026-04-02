import uuid
from typing import AsyncGenerator
from fastapi import Depends, HTTPException, Cookie, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from app.database import AsyncSessionLocal
from app.models.user import User, Workspace
from app.services.auth_service import decode_access_token

logger = structlog.get_logger()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_current_user(
    access_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not access_token:
        raise credentials_exception
    payload = decode_access_token(access_token)
    if not payload:
        raise credentials_exception
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise credentials_exception
    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise credentials_exception
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise credentials_exception
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
