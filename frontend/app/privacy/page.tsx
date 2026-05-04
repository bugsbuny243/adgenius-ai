import type { Metadata } from 'next';
import { PublicSiteNav } from '@/components/public-site-nav';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası | Koschei',
  description:
    'Koschei / TradePiGloball gizlilik politikası: toplanan veriler, Google OAuth kullanımı, güvenlik yaklaşımı ve kullanıcı hakları.'
};

export default function PrivacyPage() {
  return (
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
      </div>
    </main>
  );
}
