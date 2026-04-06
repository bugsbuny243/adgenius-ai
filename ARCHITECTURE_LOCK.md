# KOSCHEI AI — ARCHITECTURE LOCK

Bu belge Koschei AI projesinin tek doğru ürün mimarisidir.
Bundan sonraki tüm geliştirmeler buna sadık kalacaktır.

## Ürün Tanımı
Koschei AI, Türkçe konuşan bireyler ve ekipler için görev odaklı AI çalışma alanıdır.
Kullanıcı bir agent ile “chat” etmek için değil, belirli bir işi üretmek için sisteme gelir.
Ana merkez `workspace`tir.
Ana etkileşim alanı `task composer + result editor + save/history/project flow`dur.

## Ürünün Çekirdek Akışı
1. Kullanıcı landing sayfasına gelir
2. Agent katalogunu görür
3. Kayıt olur / giriş yapar
4. Workspace bootstrap olur
5. Dashboard’a düşer
6. Bir agent seçer
7. Task composer içine isteğini yazar
8. Sistem sonucu üretir
9. Kullanıcı sonucu düzenler, kopyalar, kaydeder, projeye ekler
10. Sonuç geçmişte ve saved outputs içinde tutulur
11. Kullanıcı tekrar gelir, önceki işlerini açar, çoğaltır, yeniden çalıştırır
12. Ücretsiz limit dolarsa plan yükseltme akışına girer

## Ana Ürün Blokları
### A. Marketing
- /
- /agents
- /pricing
- /about
- /contact
- /privacy
- /terms
- /signin
- /signup
- /reset-password
- /update-password

### B. Authenticated App
- /dashboard
- /agents/[type]
- /runs
- /saved
- /projects
- /projects/[id]
- /settings
- /upgrade
- /billing
- /workspace

### C. Core Experience
- Agent catalog
- Task composer
- Result viewer/editor
- Save output
- Run history
- Project-based organization
- Workspace settings
- Subscription and usage meter

### D. Monetization
- Free plan
- Starter plan
- Pro plan
- Shopier ödeme akışı
- AdSense sadece destekleyici gelir modeli, ana gelir modeli değildir

## Teknik Kabuller
- Stack: Node.js + Next.js 16.2.9 + React + TypeScript strict
- Backend: Supabase full backend
- Deploy: Railway
- Root directory: /apps/web
- Output: standalone
- UI dili: Türkçe
- Kod içi loglar ve teknik açıklamalar: İngilizce olabilir
- Marka adı: sadece “Koschei” / “Koschei AI”
- UI içinde “Gemini”, “Google GenAI”, “AdGenius” adı görünmeyecek
- Server Actions zorunlu değil; kritik akışlarda route handler + fetch tercih edilir
- Auth bypass, demo bypass, fake login, mock production flow yasaktır
- Boş kullanıcı-facing dosya/dizin bırakılmaz
- Placeholder sayfa bırakılmaz
- Her route çalışan içerik üretir
- Middleware ve Supabase auth birlikte çalışır

## Bilgi Mimarisi
### 1. Workspace
- Her kullanıcı en az 1 workspace ile yaşar
- Bootstrap idempotent olmalıdır
- `workspace_members` ile yetki kontrolü yapılır

### 2. Agent System
- `agent_types` tablosu merkezdir
- Her run bir `agent_type` ile ilişkilidir
- Agent çalışma ekranı bir “chat ekranı” değil, “single-task execution workspace” olmalıdır

### 3. Outputs
- `agent_runs` = çalışma geçmişi
- `saved_outputs` = kullanıcı tarafından kaydedilen sonuçlar
- `projects` = uzun işlerin klasörlenmiş hali
- `project_items` = projeye bağlı çıktılar/dokümanlar

### 4. Billing
- `subscriptions` = aktif plan
- `usage_counters` = aylık kullanım
- `payments` = Shopier ödeme kayıtları

### 5. Ads
- AdSense sadece marketing ve bazı public content alanlarında
- Authenticated çalışma ekranının merkezine reklam gömülmez
- Kullanıcı üretim akışı bozulmaz

## Hedef Versiyonlar
### MVP
- Sağlam auth
- Çalışan agent run flow
- Saved outputs
- Dashboard
- Pricing
- Error/not-found
- Temiz brand geçişi

### v1.0
- İlk çalışan ürün
- İlk gelir
- Project sistemi
- Güçlü composer
- Daha iyi dashboard ve usage görünürlüğü

### v1.5
- Tutundurma
- Şifre sıfırlama
- Favoriler
- Duplicate/re-run
- Saved → Project akışı
- Daha iyi boş durumlar ve skeleton UX

### v2.0
- Platform
- Workspace içi rol bazlı yapı
- Ortak çalışma
- Comment / activity / share link
- Team müşterisi hazırlığı

### v3.0
- Otomasyon
- Şablonlar
- Tekrar kullanılabilir workflow
- Çok adımlı agent zinciri
- Scheduled runs
- Webhook / external trigger foundation

### v4.0
- Ekosistem
- Template marketplace
- Public template gallery
- Clone-to-workspace
- Creator profilleri
- Network effect

### v5.0
- AI Native
- Multi-agent orchestration
- Goal-based execution
- Project memory
- Knowledge attachments
- Approval checkpoints
- Autonomous but auditable execution

## Tasarım Prensipleri
- Koyu tema ana tema
- Minimal, üretim odaklı arayüz
- Landing ayrı, app ayrı hissedilmeli
- Dashboard “iş başlatma merkezi” olmalı
- Agent run sayfası ürünün kalbi olmalı
- Sonuç kutusu editlenebilir ve kopyalanabilir olmalı
- Mobilde güçlü kullanılabilirlik şart

## Kırmızı Çizgiler
- Auth bypass yok
- Fake data ile production feature varmış gibi gösterme yok
- Marka karışıklığı yok
- AdSense için ürün kalitesini bozma yok
- “Chatbot” gibi genel amaçlı boş bir ekran yok
- Kullanıcı sisteme girince karşısında net bir iş üretim akışı olacak
