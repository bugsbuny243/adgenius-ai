# Finance staging smoke validation (2026-04-04)

## Scope executed
Attempted to execute the existing finance service-level test module and then progress to app-flow smoke checks.

## Commands run
1. `cd apps/api && pytest -q tests/test_finance_correctness.py`

## Blocking results observed
- Test collection fails before finance logic executes because runtime dependency `supabase` is missing in the environment.
- Repository currently does not contain `app/models/*` modules referenced by:
  - `app/services/finance_service.py`
  - `tests/test_finance_correctness.py`
- Repository currently does not expose `DepositIn`, `PayoutIn`, `wallet_deposit`, `payout_request` in `app/api/v1/adnet.py`, so the current service-level finance tests cannot run against this checkout as-is.

## Staging smoke status
Because the finance model layer and endpoint contracts referenced by the tests are absent from this checkout, end-to-end DB-backed finance smoke execution could not be completed in this environment.

Status: **NO-GO (blocked by repository/runtime mismatch)**.

## Minimal next unblock steps (no redesign)
1. Restore/confirm the `app.models` package expected by finance services.
2. Ensure finance API functions referenced by tests are present in `app/api/v1/adnet.py` (or update test imports to canonical location).
3. Install runtime deps for test env: `pip install -e .[test]` from `apps/api`.
4. Re-run smoke flow validation with real staging DB credentials.
