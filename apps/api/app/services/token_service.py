# FULL FILE
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from app.config import settings

def create_click_token(payload: dict, minutes: int = 30) -> str:
    data = payload.copy(); data["exp"] = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    return jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def verify_click_token(token: str) -> dict | None:
    try: return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError: return None
