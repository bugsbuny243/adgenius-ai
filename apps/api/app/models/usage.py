from app.models.base import UUIDBase
class UsageLog(UUIDBase): __tablename__="usage_logs"
class ApiUsageCounter(UUIDBase): __tablename__="api_usage_counters"
