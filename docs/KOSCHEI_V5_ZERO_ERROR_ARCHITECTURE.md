# SİSTEM GÜNCELLEMESİ: KOSCHEI V5 (SIFIR HATA MİMARİSİ)

Bu doküman, KOSCHEI V5 operasyon modunun zorunlu süreçlerini tanımlar.

## 1) Lokal AI & Motor Optimizasyonu (Ajan Senkronizasyonu)

- Üretilen 3D asset'ler doğrudan projeye aktarılmaz.
- Unity projeleri için tüm asset'ler **Mobile Low-Poly** filtresinden geçirilir.
- UE5 projeleri için asset'ler **Nanite Ready** formata dönüştürülür.

## 2) Karantina ve Stres Testi Odası (Railway Pro)

Build tamamlandığında müşteri teslimatı **beklemeye alınır** ve aşağıdaki test uygulanır:

1. Railway üzerinde **Crash Test** konteyneri başlatılır.
2. Oyuna 50 sanal bot enjekte edilir.
3. 3 dakika boyunca rastgele aksiyonlarla (çatışma, portal atlama vb.) sunucu zorlanır.

### Minimum Geçiş Kriterleri

- FPS: `> 60`
- Ping: `< 20ms`
- Fatal Error: `%0`

## 3) Raporlama ve Teslimat

### Test Başarılıysa

- Build, **V5_KUSURSUZ** mührü ile etiketlenir.
- APK veya repo linki müşteri teslimatına açılır.

### Test Başarısızsa

- Hata kök nedeni tespit edilir.
- **Self-healing** protokolü ile düzeltme uygulanır.
- Stres testi baştan çalıştırılır.
- Patron ekranına yalnızca **Live Log** akışı yansıtılır.

## Operasyon Notu

Bu gereksinimler KOSCHEI V5 için zorunlu teslimat kapısıdır (quality gate).
