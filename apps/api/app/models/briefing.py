import enum
import uuid

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import UUIDBase


class BriefStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class GeneratedItemType(str, enum.Enum):
    ANGLE = "angle"
    COPY = "copy"
    CONCEPT = "concept"


class AdBrief(UUIDBase):
    __tablename__ = "ad_briefs"

    advertiser_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    business_name: Mapped[str] = mapped_column(String(255))
    sector: Mapped[str] = mapped_column(String(255), default="")
    offer_summary: Mapped[str] = mapped_column(Text, default="")
    target_audience: Mapped[str] = mapped_column(Text, default="")
    goal: Mapped[str] = mapped_column(Text, default="")
    competitor_examples: Mapped[str | None] = mapped_column(Text, nullable=True)
    tone_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    selected_package: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[BriefStatus] = mapped_column(
        Enum(BriefStatus, name="brief_status_enum", create_type=False),
        default=BriefStatus.DRAFT,
    )
    selected_angle_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("brief_generated_outputs.id"), nullable=True)
    selected_copy_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("brief_generated_outputs.id"), nullable=True)
    selected_concept_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("brief_generated_outputs.id"), nullable=True)
    metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class BriefGenerationRun(UUIDBase):
    __tablename__ = "brief_generation_runs"

    brief_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ad_briefs.id"), index=True)
    status: Mapped[BriefStatus] = mapped_column(
        Enum(BriefStatus, name="brief_run_status_enum", create_type=False),
        default=BriefStatus.PROCESSING,
    )
    model_name: Mapped[str] = mapped_column(String(100), default="gemini-2.5-pro")
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)


class BriefGeneratedOutput(UUIDBase):
    __tablename__ = "brief_generated_outputs"

    brief_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ad_briefs.id"), index=True)
    run_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("brief_generation_runs.id"), index=True)
    output_type: Mapped[GeneratedItemType] = mapped_column(
        Enum(GeneratedItemType, name="generated_item_type_enum", create_type=False),
    )
    title: Mapped[str] = mapped_column(String(255), default="")
    content: Mapped[str] = mapped_column(Text, default="")
    extra_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_selected: Mapped[bool] = mapped_column(default=False)
