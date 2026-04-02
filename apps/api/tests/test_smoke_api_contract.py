from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "app" / "api" / "v1"


def _load(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def _assert_route(source: str, method: str, path: str) -> None:
    needle = f'@router.{method}("{path}"'
    assert needle in source, f"Missing route decorator: {needle}"


def test_campaign_create_list_detail_routes_exist():
    src = _load("adnet.py")
    _assert_route(src, "post", "/advertiser/campaigns")
    _assert_route(src, "get", "/advertiser/campaigns")
    _assert_route(src, "get", "/advertiser/campaigns/{id}")


def test_wallet_routes_exist():
    src = _load("adnet.py")
    _assert_route(src, "get", "/advertiser/wallet")
    _assert_route(src, "post", "/advertiser/wallet/deposit")


def test_serve_impression_click_routes_exist():
    src = _load("serving.py")
    _assert_route(src, "get", "/serve/ad")
    _assert_route(src, "post", "/track/impression")
    _assert_route(src, "get", "/track/click/{click_token}")


def test_publisher_payout_routes_exist():
    src = _load("adnet.py")
    _assert_route(src, "post", "/publisher/payout/request")
    _assert_route(src, "get", "/publisher/payouts")
    _assert_route(src, "patch", "/admin/payouts/{id}/approve")
