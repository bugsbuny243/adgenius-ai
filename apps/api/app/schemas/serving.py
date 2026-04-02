from pydantic import AliasChoices, BaseModel, Field


class ServeAdResponse(BaseModel):
    ad_request_id: str = Field(validation_alias=AliasChoices("ad_request_id", "request_id"))
    campaign_id: str
    live_campaign_id: str | None = None
    ad_id: str
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
