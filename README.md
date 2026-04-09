# Koschei x Gemini x Supabase Starter

Bu repo, **Koschei ön paneli + Gemini ajan orkestrasyonu + Supabase backend** mimarisini gerçek tablo yapısına hizalanmış şekilde başlatır.

## Mimari (güncel)

- **Frontend (`apps/web`)**
  - Premium UI (cam efekt, metrik paneli)
  - Canlı web editör + anlık preview
  - AdSense script + reklam slotu
- **Backend (`supabase`)**
  - Workspace tabanlı çok kiracılı veri modeli
  - `agent_types`, `agent_runs`, `projects`, `project_items`, `saved_outputs`, `subscriptions`, `usage_counters`, `usage_metering`
  - `profiles`, `workspaces`, `workspace_members`, `workspace_users`
- **AI Orkestrasyon (`gemini-orchestrator`)**
  - `agent_types.slug` ile aktif ajanı bulur
  - `agent_runs` kaydını `running` olarak açar
  - Gemini çağrısından sonra `completed/failed` olarak günceller

## Çalıştırma

```bash
cd apps/web
npm start
```

Sonra `http://localhost:4173` aç.

## Supabase Kurulum

1. Supabase projesi oluştur.
2. `supabase/schema.sql` dosyasını SQL Editor ile çalıştır.
3. Edge Function olarak `supabase/functions/gemini-orchestrator/index.ts` deploy et.
4. Ortam değişkenlerini `.env.example` dosyasına göre doldur.
5. `agent_types` tablosuna en az bir aktif kayıt ekle (ör. `slug='campaign-strategist'`).

## Edge Function Beklenen Payload

```json
{
  "workspaceId": "uuid",
  "userId": "uuid",
  "agentTypeSlug": "campaign-strategist",
  "userInput": "Yeni ürün için büyüme planı üret",
  "modelName": "gemini-2.5-pro",
  "metadata": { "channel": "ads" }
}
```

## 1M kullanıcı için ölçek notları

- Supabase: PgBouncer + read replica + partitioning (agent_runs).
- Gemini: caching, queue-based execution, retry/backoff.
- Frontend: CDN, static asset cache, event-streamed run logs.
