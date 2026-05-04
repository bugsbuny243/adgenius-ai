import type { Metadata } from 'next';
import { PublicSiteNav } from '@/components/public-site-nav';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası | Koschei',
  description: 'Koschei gizlilik politikası.'
};

export default function PrivacyPage() {
  return (
<<<<<<< codex/rewrite-frontend-files-with-tailwind-css
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <PublicSiteNav />
      <div className="max-w-3xl mx-auto py-16 px-6 prose prose-invert prose-cyan rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10">
        <h1>Gizlilik Politikası</h1>
        <p>
          Son güncelleme: 23 Nisan 2026. Bu politika, Koschei / TradePiGloball (<strong>tradepigloball.co</strong>)
          hizmetini kullanırken kişisel verilerin nasıl işlendiğini açıklar.
        </p>
        <h2>1. Toplanan bilgiler</h2>
        <p>Hizmeti sunabilmek için hesap bilgileri, çalışma alanı/proje verileri, kullanıcı içerikleri ve teknik kayıtlar işlenebilir.</p>
        <h2>2. Google hesabı ve OAuth verileri</h2>
        <p>Google OAuth ile yalnızca kullanıcı tarafından yetkilendirilen kapsamlar üzerinden erişim sağlanır.</p>
        <p>Hassas token verileri istemci arayüzünde ifşa edilmez, güvenli sunucu tarafında korunur.</p>
        <h2>3. Verileri nasıl kullanıyoruz</h2>
        <p>Veriler; kimlik doğrulama, proje/workspace yönetimi, entegrasyonlar, güvenlik izleme, hata ayıklama ve destek için işlenir.</p>
        <h2>4. Veri saklama ve güvenlik</h2>
        <p>Veriler hizmet gereksinimleri doğrultusunda saklanır, erişim kontrolü ve teknik güvenlik önlemleri uygulanır.</p>
        <h2>5. Üçüncü taraf servisler</h2>
        <p>Altyapı ve entegrasyonlar için üçüncü taraf servisler kullanılabilir ve kendi gizlilik politikalarına tabidir.</p>
        <h2>6. Kullanıcı hakları ve erişimi kaldırma</h2>
        <p>Kullanıcılar veri taleplerini iletebilir, Google hesap erişimini dilediği zaman geri çekebilir.</p>
        <h2>7. Çocukların gizliliği</h2>
        <p>Hizmet 13 yaş altına yönelik değildir; bu yaş grubuna ait veriler tespit edilirse silme/kısıtlama işlemleri uygulanır.</p>
        <h2>8. Politika değişiklikleri</h2>
        <p>Politika güncellemeleri sitede yayımlanır ve güncel metin bu sayfada tutulur.</p>
        <h2>9. İletişim</h2>
        <p>
          Gizlilik talepleri için: <a href="mailto:onur24sel@gmail.com">onur24sel@gmail.com</a>
        </p>
        <p><small>Not: Bu metin bilgilendirme amaçlıdır, hukuki danışmanlık değildir.</small></p>
=======
    <main className="min-h-screen bg-[#020617] text-slate-200">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <PublicSiteNav />
      </div>
      <div className="max-w-4xl mx-auto py-16 px-6 prose prose-invert text-slate-300">
        <h1 className="!text-cyan-400 !font-extrabold">Gizlilik Politikası</h1>
        <p>Son güncelleme: 23 Nisan 2026.</p>

        <h2 className="!text-cyan-400 !font-bold">1. Toplanan Bilgiler</h2>
        <p>Hesap bilgileri, proje verileri, içerik girdileri ve teknik kayıtlar hizmeti sağlamak için işlenebilir.</p>

        <h2 className="!text-cyan-400 !font-bold">2. OAuth ve Entegrasyonlar</h2>
        <p>Google OAuth erişimi yalnızca kullanıcı onayı verilen kapsamlarla sınırlıdır ve token verileri güvenli sunucu katmanında saklanır.</p>

        <h2 className="!text-cyan-400 !font-bold">3. Veri Kullanımı</h2>
        <p>Veriler; kimlik doğrulama, üretim iş akışları, güvenlik izleme, hata giderme ve destek süreçleri için kullanılır.</p>

        <h2 className="!text-cyan-400 !font-bold">4. Veri Saklama ve Güvenlik</h2>
        <p>Veriler gerekli süre boyunca saklanır; erişim kontrolü ve güvenlik denetimleri uygulanır.</p>

        <h2 className="!text-cyan-400 !font-bold">5. İletişim</h2>
        <p>Gizlilik soruları için: onur24sel@gmail.com</p>
>>>>>>> main
      </div>
    </main>
  );
}
