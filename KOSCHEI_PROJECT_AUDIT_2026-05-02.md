# Koschei Project Audit — 2026-05-02

## 1) Genel İstatistikler

- Toplam izlenen dosya: **160** (`rg --files | wc -l`).
- Yaklaşık toplam satır: **18,790** (metin dosyalarında satır toplamı, script ile hesaplandı).
- Not: Bu sayı dokümantasyon, config, lock dosyaları ve Unity asset metinlerini de içerir; “saf uygulama kodu” satırı bundan daha düşüktür.

---

## 2) Klasör Mimarisi (Frontend & Backend)

> Aşağıdaki ağaç, odaklı görünürlük için `node_modules` hariç mantıksal yapıyı özetler.

```text
frontend/
  app/                  # Next.js App Router UI + API route'lar
  lib/                  # Ortak iş mantığı (env, auth yardımcıları, backend proxy, unity/google entegrasyon yardımcıları)
  components/           # Paylaşılan React bileşenleri
  scripts/              # Env/doğrulama scriptleri
  public/               # Statik varlıklar

backend/
  src/                  # Express API (Game Factory, Unity bridge, Google Play publish, owner işlemleri)
  scripts/              # Şema/env doğrulama yardımcıları
  workers/unity/        # Worker sözleşmesi/README var, implementasyon repo içinde yok

supabase/
  migrations/           # Additive migration dosyaları
  *.md                  # Şema/checklist dokümantasyonu

unity-client/
  Assets/               # Unity sahneleri ve editor scriptleri
  ProjectSettings/      # Unity proje ayarları
```

**Mimari yorumu (kısa):**
- Üretimde ana trafik `frontend/app/api/**` üzerinden ilerliyor; bazı backend fonksiyonları doğrudan frontend API katmanına taşınmış durumda.
- Ayrı `backend/` servisi hâlâ mevcut ve işlevsel; bu da “tek servis vs çift servis” topolojisinde netleştirme ihtiyacı yaratıyor.

---

## 3) Kritik Dosya Analizi (En Hayati 5 Dosya)

1. **`frontend/app/api/game-factory/brief/route.ts`**
   - Game Factory içerik üretimi/brief hattının en büyük API route’u.
   - Uygulamanın “AI üretim” çekirdeği burada toplandığı için işlevsel olarak kritik.
   - Boyutun çok büyük olması (tek route içinde yoğun sorumluluk) bakım riski oluşturuyor.

2. **`frontend/lib/backend-api.ts`**
   - Frontend’den backend’e proxy taşıma, header/body forwarding ve gateway davranışının merkezi.
   - Method/body handling semantiği (özellikle GET/HEAD ayrımı) entegrasyon güvenilirliği için kritik.

3. **`frontend/lib/supabase-server.ts`**
   - Server tarafı Supabase client üretimi ve cookie write/read davranışını kontrol ediyor.
   - Supabase env yoksa fail-fast yapıyor; auth/session sürekliliği açısından kritik dosya.

4. **`backend/src/index.ts`**
   - Express API’nin omurgası: `/game-factory/generate`, `/build`, `/builds/refresh`, owner ve publish uçları.
   - Unity build lifecycle ve DB status geçişleri bu dosyada yönetiliyor.

5. **`backend/src/google-play.ts`**
   - Google Play publish akışının (JWT/OAuth token + edits/upload/commit) teknik kalbi.
   - Unity → release pipeline’ın production değeri bu dosyanın doğruluğuna bağlı.

---

## 4) Tamamlanan Özellikler (Kod Kanıtına Göre “Bitti” Seviyesi Yüksek Olanlar)

> “%100 hatasız” ifadesi için canlı prod, test raporu ve monitoring gerekir. Repo içi koda bakarak “yüksek tamamlanma” düzeyinde olanları listeliyorum:

- Auth korumalı Game Factory proje oluşturma ve build tetikleme akışı (`generate`, `build`).
- Unity build status refresh + job/project status senkronizasyonu.
- Unity callback/webhook hattı (frontend API katmanında route mevcut).
- Google OAuth callback/auth route’ları (frontend tarafında mevcut).
- Google Play entegrasyon ayar ekranı + action akışı (settings/integrations/google-play).
- Owner panelde ödeme yönetimi için backend route + UI bileşenleri.

---

## 5) Eksik ve Kritik Konular

### 5.1 Yarım Kalmış / Riskli API Uçları

- **Legacy + yeni akış paralelliği:**
  - `frontend/app/api/builds/*` ile `frontend/app/api/game-factory/builds/*` birlikte yaşıyor.
  - Bu durum istemci tarafında yanlış endpoint kullanımına ve veri modeli dağınıklığına yol açabilir.

- **Aşırı büyük route riski:**
  - `game-factory/brief/route.ts` ve `app-factory/generate/route.ts` gibi dosyalarda sorumlulukların bölünmemesi, bug izolasyonunu zorlaştırıyor.

### 5.2 Unity → Google Play Console Otonom Akışı İçin Eksikler

- **Worker implementasyonu yok:** `backend/workers/unity/` altında sadece README + örnek payload var.
- **Unity client tarafı minimal:** `unity-client/` içinde gerçek build pipeline’ı besleyecek kapsamlı editor otomasyon kodu çok sınırlı.
- **Pipeline orkestrasyonu parçalı:** Unity build job üretimi var, fakat uçtan uca “build tamamlandı → artifact doğrulandı → Play publish → rollback/alert” otomasyonu tek yerde tam kapanmıyor.

### 5.3 Çakışma / Hata Riski Taşıyan Alanlar

- **Topoloji çakışması riski:** README “Game Factory API frontend’de” derken repo’da aktif `backend/` da var; operasyonel sahiplik ve rota yönlendirmesi belirsizleşebilir.
- **Veri modeli ayrışması riski:** `game_projects` vs `unity_game_projects` izleri aynı ürün alanında bulunuyor; yanlış tabloya yazım/okuma riski var.
- **Proxy davranış riski:** Backend proxy katmanında method/body forwarding kenar durumları (özellikle HEAD/boş body) sertleştirilmeli.

---

## 6) Teknik Borç (Technical Debt)

1. **Monolitik API route dosyaları**
   - Büyük route’lar domain servislerine ayrılmalı (validation/service/repository katmanları).

2. **Legacy endpoint birikimi**
   - `builds/*` legacy yolları kaldırılıp tek contract’a indirilmeli.

3. **Şema geçmişi güvenilirliği**
   - Additive patch yaklaşımı var; sıfırdan kurulum için tek-pass güvenilir migration zinciri güçlendirilmeli.

4. **Dokümantasyon-topoloji tutarsızlığı**
   - “Tek service” ve “ayrı backend service” anlatımı net bir karar dokümanına bağlanmalı.

5. **Placeholder/redirect owner sayfaları**
   - `owner/system`, `owner/unity`, `login` gibi sayfalar operasyonel panel beklentisi için yetersiz.

---

## 7) CTO Seviyesi Kısa Sonuç

- Proje, **MVP+** olgunlukta: çekirdek Game Factory + Unity build + Play publish bileşenleri kodda mevcut.
- En büyük risk, özellik eksikliğinden çok **mimari netlik ve operasyonel standardizasyon** (tek API topolojisi, tek veri modeli, tek pipeline contract).
- Önümüzdeki sprint için en yüksek ROI:
  1) Endpoint konsolidasyonu,
  2) Worker implementasyonu,
  3) Veri modeli tekilleştirme,
  4) Route parçalama ve test katmanı.

