# Dev Smoke Test Checklist

Önkoşul: `.env.local` içinde `NEXT_PUBLIC_DEV_AUTH_BYPASS=true`, `DEV_AUTH_BYPASS=true`,
`DEV_AUTH_BYPASS_USER_ID`, `DEV_AUTH_BYPASS_WORKSPACE_ID`, `SUPABASE_SERVICE_ROLE_KEY` tanımlı olmalı.

- [ ] `/dashboard` açılıyor.
- [ ] Dashboard üzerinde aktif agent listesi geliyor.
- [ ] `/agents/[type]` sayfası açılıyor.
- [ ] Prompt gönderimi ile run oluşuyor.
- [ ] Run sonucu ekranda görünüyor.
- [ ] Save output çalışıyor.
- [ ] `/runs` sayfası gerçek run verilerini gösteriyor.
- [ ] `/saved` sayfası gerçek saved output verilerini gösteriyor.
