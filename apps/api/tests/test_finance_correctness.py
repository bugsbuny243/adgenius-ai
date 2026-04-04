from __future__ import annotations

import asyncio
import sys
import uuid
from datetime import datetime
from decimal import Decimal
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.api.v1.adnet import DepositIn, PayoutIn, payout_request, wallet_deposit
from app.models.adnet import (
    AdvertiserTransaction,
    AdvertiserWallet,
    Campaign,
    CampaignStatus,
    PublisherEarning,
    PublisherPayout,
)
from app.models.delivery import BudgetLedger, PacingCounter
from app.models.finance import AdvertiserInvoice, SpendReservation
from app.models.publisher import AdSlot, Placement
from app.models.user import User, UserRole
from app.services.finance_service import apply_ad_spend


class _ScalarExecuteResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


class FakeFinanceSession:
    def __init__(self):
        self.wallet: AdvertiserWallet | None = None
        self.placement: Placement | None = None
        self.reservation: SpendReservation | None = None
        self.pacing_counter: PacingCounter | None = None
        self.scalar_queue: list[object] = []
        self.added: list[object] = []

    async def execute(self, query):
        entity = query.column_descriptions[0].get("entity")
        if entity is AdvertiserWallet:
            return _ScalarExecuteResult(self.wallet)
        if entity is Placement:
            return _ScalarExecuteResult(self.placement)
        return _ScalarExecuteResult(None)

    async def scalar(self, query):
        entity = query.column_descriptions[0].get("entity")
        if entity is AdvertiserWallet:
            return self.wallet
        if entity is PacingCounter:
            return self.pacing_counter
        if entity is SpendReservation:
            return self.reservation if self.reservation and self.reservation.released_at is None else None
        if self.scalar_queue:
            return self.scalar_queue.pop(0)
        return None

    def add(self, obj):
        if hasattr(obj, "id") and getattr(obj, "id", None) is None:
            setattr(obj, "id", str(uuid.uuid4()))
        if isinstance(obj, PublisherPayout) and isinstance(obj.publisher_id, uuid.UUID):
            obj.publisher_id = str(obj.publisher_id)
        self.added.append(obj)
        if isinstance(obj, AdvertiserWallet):
            obj.balance = Decimal(str(obj.balance or 0))
            obj.total_deposited = Decimal(str(obj.total_deposited or 0))
            obj.total_spent = Decimal(str(obj.total_spent or 0))
            self.wallet = obj
        elif isinstance(obj, PacingCounter):
            self.pacing_counter = obj

    async def flush(self):
        return None


def test_wallet_deposit_updates_wallet_and_writes_transaction():
    db = FakeFinanceSession()
    user = User(email="adv@example.com", hashed_password="x", role=UserRole.ADVERTISER)

    result = asyncio.run(wallet_deposit(DepositIn(amount=Decimal("125.500000")), db=db, current_user=user))

    tx = next(obj for obj in db.added if isinstance(obj, AdvertiserTransaction))
    assert tx.tx_type == "deposit"
    assert tx.amount == Decimal("125.500000")
    assert db.wallet is not None
    assert db.wallet.balance == Decimal("125.500000")
    assert db.wallet.total_deposited == Decimal("125.500000")
    assert db.wallet.total_spent == Decimal("0")
    assert result.balance == Decimal("125.500000")


def test_apply_ad_spend_capture_writes_ledger_and_publisher_earning():
    db = FakeFinanceSession()
    campaign = Campaign(
        user_id=uuid.uuid4(),
        title="Finance campaign",
        total_budget=Decimal("25"),
        spent_amount=Decimal("0"),
        bid_amount=Decimal("1.00"),
        landing_url="https://example.com",
        status=CampaignStatus.ACTIVE,
        is_active=True,
        impressions_count=0,
        clicks_count=0,
    )
    db.wallet = AdvertiserWallet(
        user_id=campaign.user_id,
        balance=Decimal("10.000000"),
        total_deposited=Decimal("10.000000"),
        total_spent=Decimal("0"),
    )
    publisher_id = uuid.uuid4()
    placement = Placement(publisher_id=publisher_id, name="Top", is_active=True)
    slot = AdSlot(placement_id=placement.id, slot_key="slot-1", revenue_share_percent=Decimal("70.00"))
    db.placement = placement
    db.reservation = SpendReservation(campaign_id=uuid.uuid4(), reserved_amount=Decimal("5.000000"), actual_spend=Decimal("0"))

    captured, publisher_share = asyncio.run(
        apply_ad_spend(
            db=db,
            campaign=campaign,
            slot=slot,
            gross_cost=Decimal("2.500000"),
            event_type="impression",
            reference_id="req-1",
            live_campaign_id=db.reservation.campaign_id,
        )
    )

    assert captured is True
    assert publisher_share == Decimal("1.750000")
    assert db.wallet.balance == Decimal("7.500000")
    assert db.wallet.total_spent == Decimal("2.500000")
    assert db.reservation.actual_spend == Decimal("2.500000")
    assert any(isinstance(obj, BudgetLedger) and obj.amount == Decimal("-2.500000") for obj in db.added)
    assert any(isinstance(obj, PublisherEarning) and obj.amount == Decimal("1.750000") for obj in db.added)


def test_apply_ad_spend_blocks_on_insufficient_balance_without_side_effects():
    db = FakeFinanceSession()
    campaign = Campaign(
        user_id=uuid.uuid4(),
        title="Low balance",
        total_budget=Decimal("25"),
        spent_amount=Decimal("0"),
        bid_amount=Decimal("1.00"),
        landing_url="https://example.com",
        status=CampaignStatus.ACTIVE,
        is_active=True,
        impressions_count=0,
        clicks_count=0,
    )
    db.wallet = AdvertiserWallet(
        user_id=campaign.user_id,
        balance=Decimal("1.000000"),
        total_deposited=Decimal("1.000000"),
        total_spent=Decimal("0"),
    )
    placement = Placement(publisher_id=uuid.uuid4(), name="Top", is_active=True)
    slot = AdSlot(placement_id=placement.id, slot_key="slot-2", revenue_share_percent=Decimal("70.00"))
    db.placement = placement

    captured, publisher_share = asyncio.run(
        apply_ad_spend(
            db=db,
            campaign=campaign,
            slot=slot,
            gross_cost=Decimal("2.000000"),
            event_type="click",
            reference_id="req-2",
            live_campaign_id=uuid.uuid4(),
        )
    )

    assert captured is False
    assert publisher_share == Decimal("0")
    assert db.wallet.balance == Decimal("1.000000")
    assert campaign.status == CampaignStatus.ENDED
    assert campaign.is_active is False
    assert not any(isinstance(obj, BudgetLedger) for obj in db.added)
    assert not any(isinstance(obj, PublisherEarning) for obj in db.added)


def test_spend_reservation_release_after_fully_spent_is_consistent():
    db = FakeFinanceSession()
    campaign = Campaign(
        user_id=uuid.uuid4(),
        title="Reservation",
        total_budget=Decimal("50"),
        spent_amount=Decimal("0"),
        bid_amount=Decimal("1.00"),
        landing_url="https://example.com",
        status=CampaignStatus.ACTIVE,
        is_active=True,
        impressions_count=0,
        clicks_count=0,
    )
    db.wallet = AdvertiserWallet(user_id=campaign.user_id, balance=Decimal("9.000000"), total_deposited=Decimal("9.000000"), total_spent=Decimal("0"))
    placement = Placement(publisher_id=uuid.uuid4(), name="Top", is_active=True)
    slot = AdSlot(placement_id=placement.id, slot_key="slot-3", revenue_share_percent=Decimal("60.00"))
    db.placement = placement
    db.reservation = SpendReservation(campaign_id=uuid.uuid4(), reserved_amount=Decimal("3.000000"), actual_spend=Decimal("2.000000"))

    captured, _ = asyncio.run(
        apply_ad_spend(
            db=db,
            campaign=campaign,
            slot=slot,
            gross_cost=Decimal("1.000000"),
            event_type="click",
            reference_id="req-3",
            live_campaign_id=db.reservation.campaign_id,
        )
    )

    assert captured is True
    assert db.reservation.actual_spend == Decimal("3.000000")
    assert isinstance(db.reservation.released_at, datetime)


def test_invoice_model_defaults_and_payout_aggregation_light():
    invoice = AdvertiserInvoice(
        workspace_id=uuid.uuid4(),
        campaign_id=uuid.uuid4(),
        invoice_number="INV-1000",
        gross_amount=Decimal("100.000000"),
        platform_fee=Decimal("20.000000"),
        ad_budget_allocated=Decimal("80.000000"),
        notes="test",
        paid_at=None,
    )
    assert AdvertiserInvoice.__table__.c.status.default.arg == "PENDING"
    assert AdvertiserInvoice.__table__.c.invoice_number.unique is True

    db = FakeFinanceSession()
    publisher_user = User(email="pub@example.com", hashed_password="x", role=UserRole.PUBLISHER)
    profile = type("Profile", (), {"id": uuid.uuid4()})()
    db.scalar_queue = [
        profile,
        Decimal("12.000000"),
        Decimal("2.000000"),
    ]

    payout = asyncio.run(payout_request(payload=PayoutIn(amount=None), db=db, current_user=publisher_user))

    created = next(obj for obj in db.added if isinstance(obj, PublisherPayout))
    assert created.gross_earnings == Decimal("10.000000")
    assert created.platform_share == Decimal("0")
    assert created.publisher_share == Decimal("10.000000")
    assert created.impressions_count == 0
    assert created.clicks_count == 0
    assert payout.publisher_share == Decimal("10.000000")
