import enum
import uuid
from sqlalchemy import String, Enum, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import UUIDBase


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"
    OPS_MANAGER = "OPS_MANAGER"
    ADVERTISER = "ADVERTISER"
    PUBLISHER = "PUBLISHER"

    @classmethod
    def from_input(cls, value: str | None) -> "UserRole":
        raw = (value or "ADVERTISER").strip().upper()
        aliases = {
            "ADMIN": cls.ADMIN,
            "SUPER_ADMIN": cls.SUPER_ADMIN,
            "OPS_MANAGER": cls.OPS_MANAGER,
            "ADVERTISER": cls.ADVERTISER,
            "PUBLISHER": cls.PUBLISHER,
        }
        return aliases.get(raw, cls.ADVERTISER)


class User(UUIDBase):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255), default="")
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="userrole"), default=UserRole.ADVERTISER)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Workspace(UUIDBase):
    __tablename__ = "workspaces"

    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))


class WorkspaceMember(UUIDBase):
    __tablename__ = "workspace_members"

    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    role: Mapped[str] = mapped_column(String(50), default="member")
