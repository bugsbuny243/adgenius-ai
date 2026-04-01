# FULL FILE
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import UUIDBase

class Brand(UUIDBase): __tablename__="brands"; workspace_id: Mapped[str]=mapped_column(ForeignKey("workspaces.id")); name: Mapped[str]=mapped_column(String(255))
class Product(UUIDBase): __tablename__="products"; brand_id: Mapped[str]=mapped_column(ForeignKey("brands.id")); name: Mapped[str]=mapped_column(String(255))
class Audience(UUIDBase): __tablename__="audiences"; brand_id: Mapped[str]=mapped_column(ForeignKey("brands.id")); name: Mapped[str]=mapped_column(String(255)); description: Mapped[str]=mapped_column(String(500), default="")
