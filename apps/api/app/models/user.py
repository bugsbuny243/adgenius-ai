# FULL FILE
import enum
from sqlalchemy import String, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import UUIDBase


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    ADVERTISER = "ADVERTISER"
    PUBLISHER = "PUBLISHER"


class User(UUIDBase):
    __tablename__ = "users"
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255), default="")
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.ADVERTISER)


class Workspace(UUIDBase):
    __tablename__ = "workspaces"
    name: Mapped[str] = mapped_column(String(255))
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"))


class WorkspaceMember(UUIDBase):
    __tablename__ = "workspace_members"
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.ADVERTISER)
