# FULL FILE
from app.models.adnet import DeliveryLog

def split_revenue(cost: float, publisher_share: float = 0.7) -> tuple[float, float]:
    pub = round(cost * publisher_share, 4)
    return pub, round(cost - pub, 4)

def apply_ad_spend(balance: float, cost: float) -> float:
    return round(max(0, balance - cost), 4)

def write_delivery_log(campaign_id: str, slot_id: str, cost: float) -> DeliveryLog:
    return DeliveryLog(campaign_id=campaign_id, slot_id=slot_id, cost=cost)
