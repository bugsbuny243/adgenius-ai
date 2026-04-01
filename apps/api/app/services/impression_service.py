# FULL FILE
from app.models.adnet import Impression

def record_impression(ad_id: str, slot_id: str) -> Impression:
    return Impression(ad_id=ad_id, slot_id=slot_id)
