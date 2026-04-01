from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.config import settings
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
def hash_password(password): return pwd_context.hash(password)
def verify_password(plain, hashed): return pwd_context.verify(plain, hashed)
def create_access_token(user_id, workspace_id):
    return jwt.encode({"sub":str(user_id),"workspace_id":str(workspace_id) if workspace_id else None,"exp":datetime.now(timezone.utc)+timedelta(days=settings.ACCESS_TOKEN_EXPIRE_DAYS)}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
def decode_access_token(token):
    try: return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError: return None
