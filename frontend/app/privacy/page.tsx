import type { Metadata } from 'next';
import { PublicSiteNav } from '@/components/public-site-nav';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası | Koschei',
  description:
    'Koschei / TradePiGloball gizlilik politikası: toplanan veriler, Google OAuth kullanımı, güvenlik yaklaşımı ve kullanıcı hakları.'
};

export default function PrivacyPage() {
  return (
    <main className="panel space-y-6">
      <PublicSiteNav />

      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Gizlilik Politikası</h1>
        <p className="max-w-3xl text-sm text-white/70">
          Son güncelleme: 23 Nisan 2026. Bu politika, Koschei / TradePiGloball ({' '}
          <span className="font-medium">tradepigloball.co</span>) hizmetini kullanırken kişisel verilerin nasıl
          işlendiğini açıklar.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">1. Toplanan bilgiler</h2>
        <p className="text-white/75">
          Hizmeti sunabilmek için hesap bilgileri (ör. ad, e-posta), çalışma alanı/proje verileri, kullanıcı tarafından
          oluşturulan içerikler ve teknik kayıtlar (giriş zamanı, cihaz/oturum bilgileri, hata kayıtları) işlenebilir.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">2. Google hesabı ve OAuth verileri</h2>
        <p className="text-white/75">
          Google OAuth ile yalnızca kullanıcı tarafından açıkça yetkilendirilen kapsamlar (scopes) üzerinden erişim
          sağlanır. Bu erişim, YouTube/Blogger gibi bağlı entegrasyon özelliklerini çalıştırmak için kullanılır.
        </p>
        <p className="text-white/75">
          Hassas erişim belirteçleri (token) istemci arayüzünde ifşa edilmez; güvenli sunucu tarafı mekanizmalarda
          saklanır ve yalnızca yetkili işlemler sırasında kullanılır.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">3. Verileri nasıl kullanıyoruz</h2>
        <p className="text-white/75">
          Veriler; kimlik doğrulama, çalışma alanı yönetimi, içerik üretimi desteği, entegrasyon işlemleri, güvenlik
          izleme, hata ayıklama ve kullanıcı desteği amaçlarıyla işlenir.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">4. Veri saklama ve güvenlik</h2>
        <p className="text-white/75">
          Veriler, hizmetin işletilmesi için gerekli süre boyunca tutulur. Yetkisiz erişime karşı erişim kontrolü, kayıt
          izleme ve teknik güvenlik önlemleri uygulanır. Yasal yükümlülükler veya uyuşmazlık çözümü için gereken
          kayıtlar daha uzun süre saklanabilir.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">5. Üçüncü taraf servisler</h2>
        <p className="text-white/75">
          Altyapı, analitik veya entegrasyon hizmetleri kapsamında üçüncü taraf servislerden yararlanabiliriz. Bu
          servisler kendi gizlilik politikalarına tabidir ve yalnızca ilgili hizmetin gerektirdiği ölçüde veri işler.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">6. Kullanıcı hakları ve erişimi kaldırma</h2>
        <p className="text-white/75">
          Kullanıcılar hesap/veri taleplerini iletebilir ve Google hesap erişimini Google hesap ayarları üzerinden geri
          çekebilir. Erişim geri çekildiğinde, bağlantılı özellikler ilgili izinler olmadan çalışmaz.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">7. Çocukların gizliliği</h2>
        <p className="text-white/75">
          Hizmet, 13 yaş altı çocuklara yönelik değildir. Bu yaş grubuna ait verilerin yanlışlıkla işlendiğini fark
          edersek uygun şekilde silme/kısıtlama işlemleri yapılır.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">8. Politika değişiklikleri</h2>
        <p className="text-white/75">
          Bu politika zaman zaman güncellenebilir. Önemli değişiklikler yürürlüğe girmeden önce sitede yayımlanır ve
          güncel metin her zaman bu sayfada tutulur.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">9. İletişim</h2>
        <p className="text-white/75">
          Gizlilik talepleri ve sorularınız için: <a className="text-neon hover:underline" href="mailto:onur24sel@gmail.com">onur24sel@gmail.com</a>
        </p>
      </section>

      <p className="text-xs text-white/60">Not: Bu metin bilgilendirme amaçlıdır, hukuki danışmanlık değildir.</p>
    </main>
  );
}
