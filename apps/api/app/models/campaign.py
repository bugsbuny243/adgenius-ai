import enum
from app.models.base import UUIDBase
class CampaignObjective(str, enum.Enum): TRAFFIC="TRAFFIC"; LEADS="LEADS"; SALES="SALES"; ENGAGEMENT="ENGAGEMENT"; AWARENESS="AWARENESS"
class ToneOfVoice(str, enum.Enum): PROFESSIONAL="PROFESSIONAL"; PREMIUM="PREMIUM"; CASUAL="CASUAL"; AGGRESSIVE="AGGRESSIVE"; EDUCATIONAL="EDUCATIONAL"
class AdFormat(str, enum.Enum): BANNER="BANNER"; NATIVE_CARD="NATIVE_CARD"; PROMOTED_LISTING="PROMOTED_LISTING"; FEED_CARD="FEED_CARD"; VIDEO="VIDEO"
class CampaignBrief(UUIDBase): __tablename__="campaign_briefs"
