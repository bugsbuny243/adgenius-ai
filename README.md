# AdGenius Single Runtime Baseline

AdGenius is now deployed as **one Python/FastAPI application** from `apps/api`.

## Canonical app

- `apps/api` is the only runtime and deployment unit.
- API endpoints remain under `/api/v1`.
- Server-rendered product pages are served from the same FastAPI app via templates/static assets.
- `apps/web` is no longer required for deployment.

## Included product flow

- landing
- brief intake
- campaigns
- ads
- publisher inventory
- serve ad
- impression
- click
- wallet
- payouts

## Local run

```bash
cd apps/api
pip install -e .
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Then open:

- `http://localhost:8000/` (landing page)
- `http://localhost:8000/pricing`
- `http://localhost:8000/brief`
- `http://localhost:8000/dashboard`
- `http://localhost:8000/admin`
- `http://localhost:8000/api/v1/health`
