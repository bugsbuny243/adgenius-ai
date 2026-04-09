# Koschei AI Command Center

Bu repo artık **Next.js 16 + React + TypeScript + Tailwind + Supabase Auth** mimarisine hizalanmıştır.

## Neler düzeltildi?

- Vanilla `index.html/main.js` demodan **App Router** tabanlı Next.js uygulamasına geçildi.
- Koschei branding “Koschei AI Command Center” olarak netleştirildi.
- Supabase auth ile **login + protected pages + middleware** akışı eklendi.
- `/dashboard` ve `/agents` sayfaları auth korumalı hale getirildi.
- Railway benzeri platformlarda deploy edilebilir standart Next.js çalışma modeli (`next build && next start`) benimsendi.

## Proje yapısı

- `apps/web/app` → Next.js App Router sayfaları
- `apps/web/middleware.ts` → auth koruması
- `apps/web/lib/supabase-*.ts` → Supabase istemci yardımcıları
- `supabase/functions/gemini-orchestrator/index.ts` → Edge Function orchestrator (opsiyonel backend görevleri)

## Hızlı başlangıç

```bash
cd apps/web
npm install
npm run dev
```

Sonra: `http://localhost:3000`

## Gerekli environment değişkenleri

`.env.local` örneği:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
GEMINI_API_KEY=YOUR_GEMINI_KEY
```

## Auth akışı

1. Kullanıcı `/login` sayfasında email ile magic-link ister.
2. Supabase session cookie’si set edilir.
3. `middleware.ts`, `/dashboard` ve `/agents` için session kontrolü yapar.
4. Session yoksa `/login`’e redirect eder.

## Not

Eski demo dosyaları (`server.mjs`, `src/index.html`, `src/main.js`) repo içinde geçmiş referans olarak tutuldu, ancak yeni ana akış Next.js uygulamasıdır.
