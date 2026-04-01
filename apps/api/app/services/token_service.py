from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from app.config import settings
def create_click_token(request_id, campaign_id, ad_id, slot_id, landing_url):
    return jwt.encode({"type":"click","request_id":str(request_id),"campaign_id":str(campaign_id),"ad_id":str(ad_id),"slot_id":str(slot_id),"landing_url":landing_url,"exp":datetime.now(timezone.utc)+timedelta(hours=24)}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
def verify_click_token(token):
    try: return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError: return None
