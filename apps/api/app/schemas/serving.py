from pydantic import BaseModel


class ServeAdResponse(BaseModel):
    request_id: str
    ad_id: str
    campaign_id: str
    headline: str
    body: str
    cta: str
    image_url: str | None = None
    click_url: str
    impression_url: str
    format: str
    tracking_data: dict


class ImpressionTrackRequest(BaseModel):
    request_id: str
    session_id: str | None = None


class ImpressionTrackResponse(BaseModel):
    impression_id: str
    recorded: bool
