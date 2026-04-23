import type { Metadata } from 'next';
import { PublicSiteNav } from '@/components/public-site-nav';

export const metadata: Metadata = {
  title: 'Kullanım Koşulları | Koschei',
  description:
    'Koschei / TradePiGloball kullanım koşulları: hizmet kapsamı, kullanıcı sorumlulukları, entegrasyonlar ve hesap kuralları.'
};

export default function TermsPage() {
  return (
    <main className="panel space-y-6">
      <PublicSiteNav />

      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Kullanım Koşulları</h1>
        <p className="max-w-3xl text-sm text-white/70">
          Son güncelleme: 23 Nisan 2026. Bu koşullar, Koschei / TradePiGloball ({' '}
          <span className="font-medium">tradepigloball.co</span>) platformunun kullanım kurallarını açıklar.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">1. Hizmetin kapsamı</h2>
        <p className="text-white/75">
          Platform; içerik üretimi, proje/workspace yönetimi ve bağlı entegrasyonların yönetimi için araçlar sağlar.
          Hizmet, sonuç garantisi veren bir danışmanlık ya da tam otomatik yayın sistemi değildir.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">2. Kullanıcı sorumlulukları</h2>
        <p className="text-white/75">
          Kullanıcı, hesap bilgilerinin doğruluğundan, kimlik bilgilerinin güvenliğinden ve platform üzerinden yapılan
          işlemlerden sorumludur.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">3. Yasaklı kullanım</h2>
        <p className="text-white/75">
          Hizmetin yasa dışı faaliyetler, spam, kötüye kullanım, yetkisiz erişim girişimleri veya üçüncü taraf haklarını
          ihlal edecek şekilde kullanılması yasaktır.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">4. Hesap ve erişim</h2>
        <p className="text-white/75">
          Erişim kişiseldir; hesap paylaşımı önerilmez. Güvenlik şüphesi veya politika ihlali halinde geçici doğrulama,
          erişim kısıtlaması veya ek güvenlik adımları uygulanabilir.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">5. Entegrasyonlar ve üçüncü taraf servisler</h2>
        <p className="text-white/75">
          YouTube/Blogger gibi üçüncü taraf servislerle bağlantılar kullanıcı onayıyla kurulur. Bu servislerin
          kullanılabilirliği, kuralları ve veri işleme süreçleri ilgili sağlayıcıların politikalarına tabidir.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">6. İçerik sorumluluğu</h2>
        <p className="text-white/75">
          Platformun ürettiği öneri veya taslakların doğruluk, telif, mevzuat ve yayın uygunluğu kontrolleri kullanıcıya
          aittir. Yayınlanan içeriklerin nihai sorumluluğu içeriği yayımlayan taraftadır.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">7. Hizmetin kesintisi / değişmesi</h2>
        <p className="text-white/75">
          Altyapı bakım, güvenlik, performans veya yasal zorunluluklar nedeniyle hizmette geçici kesinti, güncelleme ya
          da özellik değişikliği olabilir.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">8. Sorumluluğun sınırlandırılması</h2>
        <p className="text-white/75">
          Hizmet, mevcut haliyle sunulur. Dolaylı zararlar, kâr kaybı veya üçüncü taraf hizmet kesintilerinden doğan
          sonuçlar için mevzuatın izin verdiği ölçüde sorumluluk sınırlıdır.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">9. Hesabın askıya alınması / sonlandırılması</h2>
        <p className="text-white/75">
          Politika ihlali, güvenlik riski veya yasal talepler doğrultusunda hesaplar askıya alınabilir ya da
          sonlandırılabilir. Kullanıcılar dilerse hesap kapatma taleplerini destek kanalından iletebilir.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">10. İletişim</h2>
        <p className="text-white/75">
          Kullanım koşulları ile ilgili sorular için: <a className="text-neon hover:underline" href="mailto:onur24sel@gmail.com">onur24sel@gmail.com</a>
        </p>
      </section>

      <p className="text-xs text-white/60">Not: Bu metin bilgilendirme amaçlıdır, hukuki danışmanlık değildir.</p>
    </main>
  );
}
