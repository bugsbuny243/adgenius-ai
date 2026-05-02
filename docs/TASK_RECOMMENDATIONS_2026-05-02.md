# Kod İnceleme Sonrası Görev Önerileri (2026-05-02)

Bu doküman, hızlı bir depo taraması sonrası açılabilecek 4 ayrı görevi içerir.

## 1) Yazım hatası düzeltme görevi
**Başlık:** `docs: TradePiGloball marka/yazım tutarlılığını düzelt`

**Gözlem:** Farklı dosyalarda `tradepigloball` ifadesi geçiyor; bu adın bilinçli marka tercihi mi yoksa yazım hatası mı belirsiz. Özellikle public domain, robots/sitemap ve iletişim e-posta alanlarında aynı biçim tekrar ediyor.

**Önerilen kapsam:**
- Ürün/marka adının tek bir canonical yazımı belirlensin.
- `README.md`, `RAILWAY_DEPLOYMENT.md`, `frontend/app/robots.ts`, `frontend/app/sitemap.ts`, `frontend/app/contact/page.tsx` ve ilgili metinler bu canonical biçime eşitlensin.
- Değişiklik sonrası kırık link ve e-posta kontrolü yapılsın.

## 2) Hata düzeltme görevi
**Başlık:** `fix(api): proxyToBackend için body taşıma ve method kenar durumlarını sağlamlaştır`

**Gözlem:** `frontend/lib/backend-api.ts` içinde sadece `GET` için body kaldırılıyor. HTTP semantiğine göre `HEAD` için de body olmamalı; ayrıca boş string body ve content-type set etme davranışı bazı backend'lerde beklenmedik sonuç üretebilir.

**Önerilen kapsam:**
- `GET` + `HEAD` için body gönderimini kesin olarak devre dışı bırak.
- Body forwarding kararını `request.body` varlığına göre daha deterministik hale getir.
- Proxy response header geçirimi için `content-type` fallback davranışını gözden geçir.

## 3) Kod yorumu / dokümantasyon tutarsızlığı görevi
**Başlık:** `docs/backend: Game Factory topolojisi ve backend rolü açıklamalarını netleştir`

**Gözlem:** Kök `README.md` içinde “Game Factory API frontend/app/api içinde çalışır, BACKEND_API_URL gerekmez” deniyor. Buna karşılık repo içinde hâlâ ayrı `backend/` servisi ve `proxyToBackend` yardımcıları bulunuyor. Yeni geliştirici için “backend artık kullanılmıyor mu, yoksa kısmi mi?” sorusu doğuyor.

**Önerilen kapsam:**
- `README.md` ve `backend/README` benzeri dokümanlarda “aktif üretim yolu” ve “legacy/opsiyonel yol” net şekilde ayrıştırılsın.
- `BACKEND_API_URL` değişkeninin hangi route/özelliklerde hâlâ gerekli olduğu tabloyla belirtilebilsin.

## 4) Test iyileştirme görevi
**Başlık:** `test(frontend): backend-api proxy davranışı için birim testleri ekle`

**Gözlem:** `frontend/lib/backend-api.ts` için method/body/header forwarding, trailing slash temizleme ve status/content-type taşıma davranışlarını doğrulayan test görünmüyor.

**Önerilen kapsam:**
- `getBackendApiUrl()` için env var boş/dolu/trailing slash senaryolarını test et.
- `proxyToBackend()` için en az şu senaryoları kapsa:
  - Authorization header forward ediliyor mu?
  - GET/HEAD için body gönderilmiyor mu?
  - POST için content-type ve body doğru taşınıyor mu?
  - Backend status ve content-type response'a doğru yansıyor mu?
