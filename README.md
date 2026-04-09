# Koschei x Gemini x Supabase Starter

Bu repo, **Koschei premium frontend + Gemini ajan orkestrasyonu + Supabase backend** kombinasyonunu hızlıca ayağa kaldırmak için hazırlandı.

## Özellikler

- **Premium Frontend:** Glassmorphism panel, canlı web editör, görev prompt çalıştırma, JSON çıktı ekranı.
- **Gemini Orchestrator:** Supabase Edge Function ile Gemini 2.5 Pro çağrısı ve ajan çıktılarının DB'ye yazılması.
- **Supabase Backend:** Proje, ajan koşuları ve reklam olayları için ölçeklenebilir şema + index + RLS politikaları.
- **AdSense Hazırlığı:** HTML içinde ad slotu, repo kökünde `Ads.txt`, local server'da `/ads.txt` route.

## Hızlı Başlangıç

```bash
cd apps/web
npm start
```

Ardından `http://localhost:4173` aç.

## Supabase Kurulumu

1. Supabase projesi oluştur.
2. `supabase/schema.sql` dosyasını SQL Editor'de çalıştır.
3. Edge Function olarak `supabase/functions/gemini-orchestrator/index.ts` dosyasını deploy et.
4. Aşağıdaki environment değişkenlerini tanımla:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`

## Frontend Üzerinden Gemini Çalıştırma

Panelde şu alanları doldur:

- `Function URL`: `https://<project-ref>.functions.supabase.co/gemini-orchestrator`
- `Function Key`: Supabase anon key (veya güvenli gateway key)
- `Project ID`
- `User ID`
- `Prompt`

`Gemini Görev Çalıştır` ile edge function çağrılır ve sonuç arayüzde görüntülenir.

## 1M kullanıcı hedefi için altyapı notları

- **DB:** partitioning/archiving (agent_runs), read replicas, pooling.
- **Queue:** uzun ajan görevlerini kuyruk sistemiyle asenkron çalıştır.
- **Cache:** sık prompt/sonuçlar için Redis cache katmanı.
- **Observability:** p95 latency, token kullanım, maliyet budget alarmı.
