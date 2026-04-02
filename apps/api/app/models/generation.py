import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import UUIDBase


class GenerationJobStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class GenerationJob(UUIDBase):
    """Gemini generation orchestration job spawned from campaign briefs."""

    __tablename__ = "generation_jobs"

    campaign_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("campaigns.id"))
    campaign_brief_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("campaign_briefs.id"), nullable=True)
    status: Mapped[GenerationJobStatus] = mapped_column(
        Enum(GenerationJobStatus, name="generation_job_status_enum", create_type=False),
        default=GenerationJobStatus.QUEUED,
    )
    prompt: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(100), default="gemini-2.5-pro")
    error_message: Mapped[str | None] = mapped_column(String(1000), nullable=True)


class GeneratedAdSet(UUIDBase):
    __tablename__ = "generated_ad_sets"

    job_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("generation_jobs.id"))
    title: Mapped[str] = mapped_column(String(255), default="")
    audience: Mapped[str | None] = mapped_column(String(255), nullable=True)
    output_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class GeneratedAdVariant(UUIDBase):
    __tablename__ = "generated_ad_variants"

    ad_set_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("generated_ad_sets.id"))
    headline: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(String(1000))
    cta: Mapped[str | None] = mapped_column(String(255), nullable=True)
    landing_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class ExportBundle(UUIDBase):
    __tablename__ = "export_bundles"

    job_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("generation_jobs.id"))
    url: Mapped[str] = mapped_column(String(500), default="")
    version: Mapped[int] = mapped_column(Integer, default=1)
