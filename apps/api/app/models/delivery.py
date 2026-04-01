from app.models.base import UUIDBase
class LiveCampaign(UUIDBase): __tablename__="live_campaigns"
class DeliveryRule(UUIDBase): __tablename__="delivery_rules"
class AdImpression(UUIDBase): __tablename__="ad_impressions"
class AdClick(UUIDBase): __tablename__="ad_clicks"
class ConversionEvent(UUIDBase): __tablename__="conversion_events"
class BudgetLedger(UUIDBase): __tablename__="budget_ledgers"
class PacingCounter(UUIDBase): __tablename__="pacing_counters"
