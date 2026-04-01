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
