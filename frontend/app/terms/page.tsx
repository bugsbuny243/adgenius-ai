import type { Metadata } from 'next';
import { PublicSiteNav } from '@/components/public-site-nav';

export const metadata: Metadata = {
  title: 'Kullanım Koşulları | Koschei',
  description:
    'Koschei / TradePiGloball kullanım koşulları: hizmet kapsamı, kullanıcı sorumlulukları, entegrasyonlar ve hesap yönetimi.'
};

export default function TermsPage() {
  return (
    <main className="panel space-y-6">
      <PublicSiteNav />

      <header className="space-y-3">
        <h1 className="text-3xl font-bold">Kullanım Koşulları</h1>
        <p className="max-w-3xl text-white/75">
          Bu koşullar, Koschei / TradePiGloball (tradepigloball.co) hizmetinin kullanımına ilişkin temel kuralları
          açıklar.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">1. Hizmetin kapsamı</h2>
        <p className="text-white/75">
          Platform; içerik üretimi, proje/workspace yönetimi ve bağlı hesaplar üzerinden YouTube/Blogger gibi
          entegrasyonları kullanmanıza yardımcı olur.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">2. Kullanıcı sorumlulukları</h2>
        <p className="text-white/75">
          Hesap güvenliği, giriş bilgilerinin korunması ve platformda yapılan işlemlerin hukuka uygunluğu kullanıcı
          sorumluluğundadır.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">3. Yasaklı kullanım</h2>
        <p className="text-white/75">
          Hizmeti kötüye kullanmak, yetkisiz erişim denemeleri yapmak, zararlı içerik yaymak veya üçüncü kişilerin
          haklarını ihlal etmek yasaktır.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">4. Hesap ve erişim</h2>
        <p className="text-white/75">
          Hesap bilgilerinizi güncel tutmanız beklenir. Şüpheli etkinliklerde güvenlik amacıyla geçici erişim
          kısıtlamaları uygulanabilir.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">5. Entegrasyonlar ve üçüncü taraf servisler</h2>
        <p className="text-white/75">
          Google OAuth dahil üçüncü taraf servis bağlantıları, yalnızca kullanıcı tarafından verilen yetkiler
          çerçevesinde çalışır. Üçüncü taraf hizmetlerin kendi koşulları ayrıca geçerlidir.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">6. İçerik sorumluluğu</h2>
        <p className="text-white/75">
          Platform üzerinden oluşturulan veya yayınlanan içeriklerden doğan sorumluluk kullanıcıya aittir. Paylaşımdan
          önce içeriklerin doğruluğunu ve yasal uygunluğunu kontrol etmeniz gerekir.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">7. Hizmetin kesintisi / değişmesi</h2>
        <p className="text-white/75">
          Bakım, güncelleme, teknik arıza veya güvenlik gerekçeleriyle hizmette geçici kesinti veya özellik değişikliği
          olabilir.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">8. Sorumluluğun sınırlandırılması</h2>
        <p className="text-white/75">
          Hizmet, mevcut haliyle sunulur. Dolaylı zararlar, gelir kaybı veya üçüncü taraf kaynaklı kesintilerden doğan
          sonuçlarda yürürlükteki hukuk çerçevesinde sorumluluk sınırlandırılabilir.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">9. Hesabın askıya alınması / sonlandırılması</h2>
        <p className="text-white/75">
          Koşullara aykırılık, kötüye kullanım veya güvenlik riski halinde hesap askıya alınabilir ya da sonlandırılabilir.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">10. İletişim</h2>
        <p className="text-white/75">
          Koşullar hakkında sorular için: <a className="text-neon hover:underline" href="mailto:onur24sel@gmail.com">onur24sel@gmail.com</a>
        </p>
      </section>

      <p className="text-sm text-white/60">Not: Bu metin hukuki danışmanlık niteliğinde değildir.</p>
    </main>
  );
}
