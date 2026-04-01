from app.models.base import UUIDBase
class GenerationJob(UUIDBase): __tablename__="generation_jobs"
class GeneratedAdSet(UUIDBase): __tablename__="generated_ad_sets"
class GeneratedAdVariant(UUIDBase): __tablename__="generated_ad_variants"
class ExportBundle(UUIDBase): __tablename__="export_bundles"
