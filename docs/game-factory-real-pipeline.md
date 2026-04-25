# Game Factory Real Pipeline

## Zorunlu ortam değişkenleri

`.env.example` içinde sadece anahtar isimleri bulunur. Gerçek değerler repoya commit edilmez.

- `GITHUB_UNITY_REPO_OWNER`
- `GITHUB_UNITY_REPO_NAME`
- `GITHUB_UNITY_REPO_BRANCH` (varsayılan: `main`)
- `GITHUB_UNITY_REPO_TOKEN`
- `UNITY_ORG_ID`
- `UNITY_PROJECT_ID`
- `UNITY_BUILD_TARGET_ID`
- `UNITY_SERVICE_ACCOUNT_KEY_ID`
- `UNITY_SERVICE_ACCOUNT_SECRET_KEY`
- `GOOGLE_PLAY_PACKAGE_NAME`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64`
- `GOOGLE_PLAY_DEFAULT_TRACK` (varsayılan: `production`)

## Unity Build Automation target kurulumu

1. Unity Dashboard > Build Automation içinde Android build target oluşturun.
2. Target, Game Factory'nin commit attığı branch'i izlemelidir.
3. Release signing ayarları yalnızca Unity Cloud Build Credentials içinde tutulmalıdır.
4. Keystore, parolalar veya `.jks` dosyaları uygulama reposuna eklenmemelidir.

## GitHub repo gereksinimleri

1. Unity template repo erişimi API token ile sağlanır.
2. Game Factory yalnızca güvenli üretilmiş dosya yollarını günceller.
3. Secret dosyalar (`.env`, `.jks`, `.keystore`, servis hesabı dosyaları) commit edilmez.

## Google Play servis hesabı gereksinimleri

1. Servis hesabına Play Console'da uygulama yayın izinleri verilmelidir.
2. JSON anahtar dosyası repo dışında güvenli secret store'da tutulmalıdır.
3. Uygulama içinde yalnızca `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64` env değeri okunur.

## Gerçek pipeline adımları

1. Kullanıcı prompt ile Game Factory projesi oluşturur.
2. Unity proje dosyaları üretilir/güncellenir.
3. Değişiklikler GitHub Unity reposuna commit edilir.
4. Unity Build Automation Android AAB build'i tetikler/izler.
5. Build durumu ve artifact metadata veritabanına kaydedilir.
6. Kullanıcı yayın hazırlığını oluşturur.
7. Kullanıcı onayı ile Google Play Android Publisher API akışı çalışır:
   - `edits.insert`
   - `edits.bundles.upload`
   - `edits.tracks.update`
   - `edits.commit`
8. Platform sonuçları ve aksiyon gereksinimleri arayüzde gösterilir.

## Hata senaryoları

- Unity build failed
- AAB artifact missing
- Google Play rejected package
- Production blocked by policy/account requirement
- Service account permission missing

## Güvenlik kuralları

- `.jks` commit edilmez.
- Keystore şifreleri commit edilmez.
- Play service account JSON commit edilmez.
- Unity service account kimlik bilgileri commit edilmez.
- Secret değerler loglanmaz.
- Otomatik yayınlama yapılmaz, yayın için kullanıcı onayı zorunludur.
