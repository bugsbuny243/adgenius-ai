# FULL FILE
from pydantic import BaseModel

class ServeAdResponse(BaseModel):
    request_id: str
    ad_id: str
    campaign_id: str
    title: str
    body: str
    cta: str

class ImpressionTrackRequest(BaseModel):
    request_id: str
    ad_id: str
    slot_id: str

class ImpressionTrackResponse(BaseModel):
    ok: bool = True
