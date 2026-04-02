import re
import uuid
from fastapi import APIRouter, Depends, HTTPException, Response, status, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from app.dependencies import get_db
from app.models.user import User, Workspace, WorkspaceMember, UserRole
from app.schemas.auth import SignupRequest, LoginRequest, UserResponse, WorkspaceResponse
from app.services.auth_service import hash_password, verify_password, create_access_token
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])
logger = structlog.get_logger()


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text[:50]


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(data: SignupRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    allowed_roles = {UserRole.ADVERTISER.value, UserRole.PUBLISHER.value}
    role_str = (data.role or "ADVERTISER").upper()
    if role_str not in allowed_roles:
        role_str = UserRole.ADVERTISER.value
    role = UserRole(role_str)

    user = User(email=data.email, hashed_password=hash_password(data.password), full_name=data.full_name, role=role)
    db.add(user)
    await db.flush()

    base_slug = slugify(f"{data.full_name} workspace")
    slug = base_slug
    counter = 1
    while True:
        result = await db.execute(select(Workspace).where(Workspace.slug == slug))
        if not result.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    workspace = Workspace(name=f"{data.full_name}'s Workspace", slug=slug, owner_id=user.id)
    db.add(workspace)
    await db.flush()

    member = WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role="owner")
    db.add(member)
    await db.flush()
    await db.refresh(user)
    await db.refresh(workspace)

    token = create_access_token(user.id, workspace.id)
    response.set_cookie(key="access_token", value=token, httponly=True,
                        secure=settings.ENVIRONMENT == "production", samesite="lax", max_age=7 * 24 * 60 * 60)

    user_response = UserResponse.model_validate(user)
    user_response.workspace = WorkspaceResponse.model_validate(workspace)
    return user_response


@router.post("/login", response_model=UserResponse)
async def login(data: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    result = await db.execute(select(Workspace).where(Workspace.owner_id == user.id))
    workspace = result.scalar_one_or_none()
    if not workspace:
        result = await db.execute(select(WorkspaceMember).where(WorkspaceMember.user_id == user.id))
        member = result.scalar_one_or_none()
        if member:
            result = await db.execute(select(Workspace).where(Workspace.id == member.workspace_id))
            workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=500, detail="No workspace found")

    token = create_access_token(user.id, workspace.id)
    response.set_cookie(key="access_token", value=token, httponly=True,
                        secure=settings.ENVIRONMENT == "production", samesite="lax", max_age=7 * 24 * 60 * 60)

    user_response = UserResponse.model_validate(user)
    user_response.workspace = WorkspaceResponse.model_validate(workspace)
    return user_response


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def me(access_token: str | None = Cookie(default=None), db: AsyncSession = Depends(get_db)):
    from app.services.auth_service import decode_access_token
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_access_token(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = uuid.UUID(payload["sub"])
    workspace_id = uuid.UUID(payload["workspace_id"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one_or_none()
    user_response = UserResponse.model_validate(user)
    if workspace:
        user_response.workspace = WorkspaceResponse.model_validate(workspace)
    return user_response
