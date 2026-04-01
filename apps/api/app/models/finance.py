from app.models.base import UUIDBase
class AdvertiserInvoice(UUIDBase): __tablename__="advertiser_invoices"
class PublisherPayout(UUIDBase): __tablename__="publisher_payouts"
class SpendReservation(UUIDBase): __tablename__="spend_reservations"
class ModerationReview(UUIDBase): __tablename__="moderation_reviews"
class PolicyFlag(UUIDBase): __tablename__="policy_flags"
class FraudSignal(UUIDBase): __tablename__="fraud_signals"
