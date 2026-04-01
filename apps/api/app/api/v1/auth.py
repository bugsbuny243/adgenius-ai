# FULL FILE
from fastapi import APIRouter, Response, Depends, HTTPException
from app.schemas.auth import SignupRequest, LoginRequest
from app.services.auth_service import hash_password, verify_password, create_access_token
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])
_users = {}

@router.post("/signup")
async def signup(payload: SignupRequest):
    if payload.email in _users:
        raise HTTPException(status_code=400, detail="User exists")
    _users[payload.email] = {"password": hash_password(payload.password), "full_name": payload.full_name, "role": payload.role}
    return {"ok": True}

@router.post("/login")
async def login(payload: LoginRequest, response: Response):
    user = _users.get(payload.email)
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(payload.email)
    response.set_cookie("access_token", token, httponly=True, samesite="lax", secure=(settings.ENVIRONMENT=="production"))
    return {"ok": True}

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"ok": True}

@router.get("/me")
async def me():
    return {"ok": True}
