from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    role: str = "advertiser"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    slug: str

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    workspace: WorkspaceResponse | None = None

    model_config = {"from_attributes": True}
