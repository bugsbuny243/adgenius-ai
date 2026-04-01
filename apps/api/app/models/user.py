import enum
from sqlalchemy import String, Boolean, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import UUIDBase
class UserRole(str, enum.Enum): SUPER_ADMIN="SUPER_ADMIN"; OPS_MANAGER="OPS_MANAGER"; ADVERTISER="ADVERTISER"; PUBLISHER="PUBLISHER"
class User(UUIDBase): __tablename__="users"; email: Mapped[str]=mapped_column(String(255), unique=True); hashed_password: Mapped[str]=mapped_column(String(255)); full_name: Mapped[str]=mapped_column(String(255)); role: Mapped[UserRole]=mapped_column(Enum(UserRole), default=UserRole.ADVERTISER); is_active: Mapped[bool]=mapped_column(Boolean, default=True)
class Workspace(UUIDBase): __tablename__="workspaces"; name: Mapped[str]=mapped_column(String(255)); slug: Mapped[str]=mapped_column(String(255), unique=True); owner_id = mapped_column(ForeignKey("users.id"))
class WorkspaceMember(UUIDBase): __tablename__="workspace_members"; workspace_id = mapped_column(ForeignKey("workspaces.id")); user_id = mapped_column(ForeignKey("users.id")); role: Mapped[str]=mapped_column(String(100), default="member")
