from pydantic import BaseModel, Field, AliasChoices


class ServeAdResponse(BaseModel):
    ad_request_id: str = Field(validation_alias=AliasChoices("ad_request_id", "request_id"))
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
    ad_request_id: str = Field(validation_alias=AliasChoices("ad_request_id", "request_id"))
    session_id: str | None = None


class ImpressionTrackResponse(BaseModel):
    impression_id: str
    recorded: bool
