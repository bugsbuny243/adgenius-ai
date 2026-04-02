from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from app.config import settings


def create_click_token(request_id: str, campaign_id: str, ad_id: str, slot_id: str, landing_url: str, minutes: int = 60) -> str:
    payload = {
        "request_id": request_id,
        "campaign_id": campaign_id,
        "ad_id": ad_id,
        "slot_id": slot_id,
        "landing_url": landing_url,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=minutes),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_click_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
