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
- `GOOGLE_PLAY_DEFAULT_TRACK` (varsayılan: `production`)
- `KOSCHEI_CREDENTIALS_ENCRYPTION_KEY`

## Unity Build Automation target kurulumu

1. Unity Dashboard > Build Automation içinde Android build target oluşturun.
2. Target, Game Factory'nin commit attığı branch'i izlemelidir.
3. Release signing ayarları yalnızca Unity Cloud Build Credentials içinde tutulmalıdır.
4. Keystore, parolalar veya `.jks` dosyaları uygulama reposuna eklenmemelidir.

## GitHub repo gereksinimleri

1. Unity template repo erişimi API token ile sağlanır.
2. Game Factory yalnızca güvenli üretilmiş dosya yollarını günceller.
3. Unity template, aşağıdaki üretilen dosyaları runtime/editor tarafında okumalıdır:
   - `Assets/Koschei/Generated/game_factory_brief.json`
   - `Assets/Koschei/Generated/koschei-game-config.json`
   - `Assets/Koschei/Generated/KoscheiGeneratedGameConfig.cs`
4. Oyun davranışı farklılaşması bu konfigürasyon dosyalarından gelir (ör. renkler, hız, zıplama, skor etiketi, sürüm metadata).
5. Üretilen dosyalar secret içermez; sadece oyun içerik/oynanış konfigürasyonu taşır.
6. Secret dosyalar (`.env`, `.jks`, `.keystore`, servis hesabı dosyaları) commit edilmez.

## Google Play servis hesabı gereksinimleri

1. Servis hesabına Play Console'da uygulama yayın izinleri verilmelidir.
2. JSON anahtar dosyası kullanıcı bazlı entegrasyon kaydında şifrelenerek saklanır.
3. Şifreleme anahtarı için `KOSCHEI_CREDENTIALS_ENCRYPTION_KEY` zorunludur.
4. Global Google Play credential env değişkenleri kullanılmaz.

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

## Migration bağımlılıkları (fresh kurulum notu)

`20260425_game_factory_integrations_and_release_guardrails.sql` migration'ı, mevcut Game Factory temel şemasına bağımlıdır.

Fresh bir Supabase projesine uygulanacaksa önce aşağıdakiler mevcut olmalıdır:

- `public.touch_updated_at()` fonksiyonu
- `public.owns_game_project(game_project_id uuid)` fonksiyonu
- Temel tablolar: `game_projects`, `game_briefs`, `game_build_jobs`, `game_artifacts`, `game_release_jobs`

Production'da bu temel şema zaten varsa mevcut migration doğrudan uygulanabilir.
