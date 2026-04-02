# AdGenius Network

AI-powered independent ad network. Advertisers create campaigns, AI generates creatives, the network serves ads across publisher sites, tracks impressions/clicks, and handles revenue sharing.

## Stack
- **Backend**: FastAPI, SQLAlchemy async, PostgreSQL (Supabase), Redis (Upstash), Celery, Gemini AI
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query v5

## Structure
```
apps/
├── api/     # FastAPI backend
├── web/     # Next.js frontend
└── worker/  # Celery worker
```

## Quick Start
```bash
# Backend
cd apps/api
pip install .
uvicorn app.main:app --reload

# Frontend
cd apps/web
npm install
npm run dev
```

## Ad Stack Kurulumu (Google Ads + Gemini)
Dünyanın en büyük reklam ağı (Google Ads) ile Gemini AI katmanını birleştirmek için:

1. `.env` veya `apps/api/.env` içine aşağıdaki değişkenleri girin:
   - `GEMINI_API_KEY`
   - `GOOGLE_ADS_DEVELOPER_TOKEN`
   - `GOOGLE_ADS_CUSTOMER_ID`
   - `GOOGLE_ADS_LOGIN_CUSTOMER_ID`
   - `GOOGLE_ADS_CLIENT_ID`
   - `GOOGLE_ADS_CLIENT_SECRET`
   - `GOOGLE_ADS_REFRESH_TOKEN`
2. API'yi başlatın.
3. Kurulum durumunu kontrol edin:

```bash
curl http://localhost:8000/api/v1/adstack/setup
```

Bu endpoint, eksik env değişkenlerini ve bir sonraki adımları döndürür.
