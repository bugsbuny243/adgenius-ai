# FULL FILE
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import UUIDBase

class GenerationJob(UUIDBase): __tablename__="generation_jobs"; campaign_id: Mapped[str]=mapped_column(ForeignKey("campaigns.id")); status: Mapped[str]=mapped_column(String(50), default="queued")
class GeneratedAdSet(UUIDBase): __tablename__="generated_ad_sets"; job_id: Mapped[str]=mapped_column(ForeignKey("generation_jobs.id")); name: Mapped[str]=mapped_column(String(255), default="")
class GeneratedAdVariant(UUIDBase): __tablename__="generated_ad_variants"; ad_set_id: Mapped[str]=mapped_column(ForeignKey("generated_ad_sets.id")); headline: Mapped[str]=mapped_column(String(255)); body: Mapped[str]=mapped_column(String(1000))
class ExportBundle(UUIDBase): __tablename__="export_bundles"; job_id: Mapped[str]=mapped_column(ForeignKey("generation_jobs.id")); url: Mapped[str]=mapped_column(String(500), default="")
