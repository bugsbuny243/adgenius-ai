from app.models.base import UUIDBase
class PublisherProfile(UUIDBase): __tablename__="publisher_profiles"
class PublisherSite(UUIDBase): __tablename__="publisher_sites"
class PublisherApp(UUIDBase): __tablename__="publisher_apps"
class Placement(UUIDBase): __tablename__="placements"
class AdSlot(UUIDBase): __tablename__="ad_slots"
