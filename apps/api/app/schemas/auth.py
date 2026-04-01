# FULL FILE
from pydantic import BaseModel, EmailStr

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "ADVERTISER"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class WorkspaceResponse(BaseModel):
    id: str
    name: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
