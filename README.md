# Koschei Monorepo (Canonical: `apps/web`)

Bu repo için **tek kanonik ürün**: **Koschei — AI Agent Platform**.

- ✅ **Deploy hedefi:** `apps/web`
- ✅ **Stack:** Next.js 16.2.9 + TypeScript + App Router
- ✅ **Backend/Data platform:** Supabase (auth, DB, RLS, storage)
- ✅ **AI engine:** Gemini (`@google/genai`)
- ⚠️ `apps/api` ve `apps/worker` legacy/reference olarak tutulur; kanonik runtime değildir.

## Monorepo

- `apps/web` — ana ürün
- `apps/api` — legacy FastAPI (non-canonical)
- `apps/worker` — legacy worker (non-canonical)
- `infra/` — altyapı yardımcıları

## Koschei V1 kapsamı

- Agent türlerini listeleme ve seçme
- Agent prompt girip Gemini ile run çalıştırma
- Sonucu Supabase'e kaydetme
- Run geçmişi ve saved outputs görüntüleme
- Plan/kullanım limiti farkındalığı

## Geliştirme

```bash
cd apps/web
npm install
npm run dev
```

## Build

```bash
cd apps/web
npm install
npm run build
npm run start
```

## Ortam değişkenleri

`apps/web/.env.example` dosyasını kullanın:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

## Supabase schema

Temel migration dosyası:

- `apps/web/supabase/migrations/20260405_koschei_core.sql`

Bu dosya; tabloları, RLS politikalarını ve V1 agent katalog seed'ini içerir.

## Deploy notu

Platform ayarlarında kök dizin olarak **yalnızca `apps/web`** seçin.
