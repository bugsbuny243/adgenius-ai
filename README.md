# AdGenius Network

**Bağımsız, AI destekli reklam ağı.**

Google Ads yok. Meta Ads yok. TikTok Ads yok.
Kendi kuralların, kendi panelin, kendi dağıtım ağın, kendi gelir modelin.

---

## Ne Yapıyor?

AdGenius Network, reklamveren ile yayıncıyı kendi altyapısında buluşturan tam bağımsız bir reklam ekosistemidir.

### Reklamveren (Advertiser)
- Panel üzerinden kampanya oluşturur
- Bütçe yükler (wallet sistemi)
- AI ile reklam metni/kreatifi üretir
- Kampanya submit eder → admin onayı → reklam yayına girer
- Gösterim, tıklama, harcama takibi yapar

### Yayıncı (Publisher)
- Sitesini/uygulamasını sisteme ekler
- Placement ve ad slot tanımlar
- embed.js kodunu sitesine yapıştırır
- Reklamlar otomatik görünür, gelir birikir
- Payout talep eder → admin onaylar → ödeme alır

### Sistem (AdGenius Engine)
- Hangi reklamın hangi slot'a gideceğine karar verir (AI matching)
- Budget takibi yapar, exhausted kampanyayı otomatik durdurur
- Impression ve click'i loglar, para akışını otomatik yönetir
- 15 dakikada bir AI ile bid optimizasyonu yapar
- 10 dakikada bir fraud detection çalıştırır

---

## Para Akışı

```
Advertiser → Wallet'a para yükler
→ Kampanya aktif olunca impression/click başına harcama düşer
→ Publisher'ın slot'u gösterim aldıkça earning birikir
→ Publisher payout talep eder → Admin onaylar → Ödeme çıkar
→ Aradaki marj AdGenius'un geliri
```

---

## Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Backend API | FastAPI (Python 3.12), SQLAlchemy async |
| Veritabanı | PostgreSQL (Supabase) |
| Cache/Queue | Redis (Upstash), Celery |
| AI | Google Gemini (reklam üretimi, bid optimizasyonu, fraud analizi, eşleştirme) |
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui |
| Auth | JWT cookie (httponly) |

---

## Repo Yapısı

```
adgenius-ai/
├── apps/
│   ├── api/          # FastAPI backend
│   ├── web/          # Next.js 15 frontend
│   └── worker/       # Celery worker (AI optimizer + fraud detector)
└── infra/
    └── docker-compose.yml
```

---

## Kurulum

### Backend
```bash
cd apps/api
cp .env.example .env
# .env dosyasını düzenle
pip install .
uvicorn app.main:app --reload
```

### Frontend
```bash
cd apps/web
cp .env.example .env
npm install
npm run dev
```

### Environment Variables

**apps/api/.env:**
```
DATABASE_URL=postgresql+asyncpg://postgres:SIFRE@db.PROJE.supabase.co:5432/postgres
REDIS_URL=rediss://default:SIFRE@HOST.upstash.io:6379
SECRET_KEY=minimum-32-karakter-rastgele-string
GEMINI_API_KEY=gemini-api-anahtarin
CORS_ORIGINS=http://localhost:3000
ENVIRONMENT=production
```

**apps/web/.env:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## API Endpoint'leri

### Auth
- `POST /api/v1/auth/signup` — Kayıt (ADVERTISER veya PUBLISHER)
- `POST /api/v1/auth/login` — Giriş
- `POST /api/v1/auth/logout` — Çıkış
- `GET /api/v1/auth/me` — Mevcut kullanıcı

### Advertiser
- `GET/POST /api/v1/advertiser/campaigns` — Kampanyalar
- `GET/PUT/DELETE /api/v1/advertiser/campaigns/{id}` — Kampanya detay
- `GET/POST /api/v1/advertiser/campaigns/{id}/ads` — Reklamlar
- `GET /api/v1/advertiser/wallet` — Bakiye
- `POST /api/v1/advertiser/wallet/deposit` — Para yükle
- `GET /api/v1/advertiser/finance/dashboard` — Finansal özet

### Publisher
- `GET/POST /api/v1/publishers/profile` — Publisher profili
- `GET/POST /api/v1/publishers/sites` — Siteler
- `GET/POST /api/v1/publishers/placements` — Placement'lar
- `GET/POST /api/v1/publishers/placements/{id}/slots` — Ad slot'lar
- `GET /api/v1/publisher/earnings` — Kazançlar
- `POST /api/v1/publisher/payout/request` — Payout talebi
- `GET /api/v1/publisher/payouts` — Payout geçmişi

### Ad Serving (Publisher embed'inden çağrılır)
- `GET /api/v1/serve/ad?slot_key=XXX` — Reklam serve et
- `POST /api/v1/track/impression` — Impression kayıt
- `GET /api/v1/track/click/{token}` — Click kayıt + redirect

### Admin
- `GET /api/v1/admin/overview` — Network özeti
- `GET/POST /api/v1/admin/campaigns` — Kampanya yönetimi
- `POST /api/v1/admin/campaigns/{id}/activate` — Aktivasyon
- `GET /api/v1/admin/publishers` — Publisher listesi
- `POST /api/v1/admin/publishers/{id}/approve` — Onay
- `GET /api/v1/admin/fraud/signals` — Fraud sinyalleri
- `GET /api/v1/admin/finance` — Finans özeti
- `PATCH /api/v1/admin/payouts/{id}/approve` — Payout onayla

### AI Raporlar
- `POST /api/v1/ai/reports/campaign` — Kampanya AI analizi
- `POST /api/v1/ai/reports/publisher` — Publisher AI analizi
- `POST /api/v1/ai/reports/chat` — Admin AI chat

---

## Publisher Entegrasyon

Yayıncı sitesine eklenecek kod:
```html
<div data-adgenius-slot="SLOT_KEY_BURAYA"></div>
<script src="https://api.adgenius.ai/static/embed.js" async></script>
```

---

## Lisans

Tüm hakları saklıdır. © AdGenius Network
