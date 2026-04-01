# FULL FILE
from app.models.adnet import Click

def record_click(ad_id: str, slot_id: str, request_id: str) -> Click:
    return Click(ad_id=ad_id, slot_id=slot_id, request_id=request_id)
