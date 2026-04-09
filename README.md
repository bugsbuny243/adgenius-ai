# Koschei x Gemini x Supabase Starter

Bu kurulum, Koschei'yi premium bir ön yüz olarak kullanıp Gemini'yi arka planda çok-ajans motoru şeklinde konumlandırır.

## Neler var?

- **Premium Frontend:** Cam efekti, metrik panosu ve canlı web editör.
- **Gemini Orchestrator:** Supabase Edge Function üzerinden Gemini API çağrısı.
- **Supabase Backend:** Kullanıcı, proje, ajan koşusu ve kullanım metrikleri için şema.
- **AdSense Hazırlığı:** HTML içinde script + reklam slotu hazır.

## Çalıştırma

```bash
cd apps/web
npm start
```

Ardından `http://localhost:4173` aç.

## Supabase Deploy

1. Supabase projesi aç.
2. `supabase/schema.sql` dosyasını SQL Editor'de çalıştır.
3. Edge function olarak `supabase/functions/gemini-orchestrator/index.ts` yükle.
4. Environment değişkenlerini `.env.example`'e göre tanımla.

## Ölçek notları (1M kullanıcı hedefi)

- Supabase üzerinde read replica + connection pooling.
- Edge function için regional dağıtım ve kuyruk tabanlı agent işleme.
- Gemini çağrılarında response caching + token budget limitleme.
- Frontend tarafında CDN ve image optimization.
