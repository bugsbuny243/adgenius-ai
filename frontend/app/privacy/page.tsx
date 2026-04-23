import type { Metadata } from 'next';
import { PublicSiteNav } from '@/components/public-site-nav';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası | Koschei',
  description:
    'Koschei / TradePiGloball gizlilik politikası: toplanan bilgiler, Google OAuth verilerinin kullanımı, güvenlik ve kullanıcı hakları.'
};

export default function PrivacyPage() {
  return (
    <main className="panel space-y-6">
      <PublicSiteNav />

      <header className="space-y-3">
        <h1 className="text-3xl font-bold">Gizlilik Politikası</h1>
        <p className="max-w-3xl text-white/75">
          Bu politika, Koschei / TradePiGloball (<span className="font-medium text-white">tradepigloball.co</span>)
          hizmetini kullanırken kişisel verilerin nasıl işlendiğini açıklar.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">1. Toplanan bilgiler</h2>
        <p className="text-white/75">
          Hesap oluşturma, oturum yönetimi, güvenlik ve hizmetin çalışması için gerekli temel bilgileri (ör. e-posta,
          hesap kimliği, kullanım kayıtları ve teknik loglar) toplayabiliriz.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">2. Google hesabı ve OAuth verileri</h2>
        <p className="text-white/75">
          Google hesabınızı bağladığınızda, yalnızca açıkça yetki verdiğiniz kapsamlar (scope) doğrultusunda verilere
          erişiriz. Bu erişim, YouTube/Blogger gibi entegrasyon özelliklerini sizin adınıza çalıştırmak için kullanılır.
        </p>
        <p className="text-white/75">
          OAuth erişim bilgileri ve hassas tokenlar istemci tarafında açık şekilde gösterilmez; güvenli biçimde sunucu
          tarafında saklanır ve yalnızca yetkilendirilmiş işlemler için kullanılır.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">3. Verileri nasıl kullanıyoruz</h2>
        <p className="text-white/75">
          Veriler; içerik üretimi, proje/workspace yönetimi, entegrasyonların çalıştırılması, güvenlik denetimleri,
          hata tespiti ve kullanıcı desteği amaçlarıyla işlenir.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">4. Veri saklama ve güvenlik</h2>
        <p className="text-white/75">
          Veriler, hizmetin devamlılığı ve yasal yükümlülükler kapsamında gerekli olduğu süre boyunca saklanır. Yetkisiz
          erişimi azaltmak için teknik ve idari güvenlik önlemleri uygulanır.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">5. Üçüncü taraf servisler</h2>
        <p className="text-white/75">
          Altyapı, analiz veya entegrasyon amaçlarıyla üçüncü taraf servis sağlayıcılar kullanılabilir. Bu servisler,
          kendi gizlilik koşullarına tabi olabilir.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">6. Kullanıcı hakları ve erişimi kaldırma</h2>
        <p className="text-white/75">
          Dilerseniz Google hesabı bağlantınızı kaldırabilir, ilgili izinleri Google hesap ayarlarınızdan iptal edebilir
          ve veri taleplerinizi bize iletebilirsiniz.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">7. Çocukların gizliliği</h2>
        <p className="text-white/75">
          Hizmet, 13 yaş altı çocuklara yönelik değildir. Bu yaş grubuna ait verilerin işlendiğini fark edersek uygun
          adımları atarız.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">8. Politika değişiklikleri</h2>
        <p className="text-white/75">
          Bu politika zaman zaman güncellenebilir. Önemli değişikliklerde güncel metin bu sayfada yayınlanır.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-xl font-semibold">9. İletişim</h2>
        <p className="text-white/75">
          Sorularınız için: <a className="text-neon hover:underline" href="mailto:onur24sel@gmail.com">onur24sel@gmail.com</a>
        </p>
      </section>

      <p className="text-sm text-white/60">Not: Bu metin hukuki danışmanlık niteliğinde değildir.</p>
    </main>
  );
}
