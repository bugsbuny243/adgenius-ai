import type { Metadata } from 'next';
import { PublicSiteNav } from '@/components/public-site-nav';

export const metadata: Metadata = {
  title: 'Kullanım Koşulları | Koschei',
  description:
    'Koschei / TradePiGloball kullanım koşulları: hizmet kapsamı, kullanıcı sorumlulukları, entegrasyonlar ve hesap kuralları.'
};

export default function TermsPage() {
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <PublicSiteNav />
      <div className="max-w-3xl mx-auto py-16 px-6 prose prose-invert prose-cyan rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10">
        <h1>Kullanım Koşulları</h1>
        <p>
          Son güncelleme: 23 Nisan 2026. Bu koşullar, Koschei / TradePiGloball (<strong>tradepigloball.co</strong>)
          platformunun kullanım kurallarını açıklar.
        </p>
        <h2>1. Hizmetin kapsamı</h2>
        <p>Platform; içerik üretimi, proje/workspace yönetimi ve bağlı entegrasyon yönetimi için araçlar sunar.</p>
        <h2>2. Kullanıcı sorumlulukları</h2>
        <p>Kullanıcı, hesap güvenliği ve platform üzerinden yapılan işlemlerden sorumludur.</p>
        <h2>3. Yasaklı kullanım</h2>
        <p>Yasa dışı faaliyetler, spam, kötüye kullanım ve yetkisiz erişim girişimleri kesinlikle yasaktır.</p>
        <h2>4. Hesap ve erişim</h2>
        <p>Erişim kişiseldir; güvenlik şüphesi veya politika ihlali durumunda erişim kısıtlanabilir.</p>
        <h2>5. Entegrasyonlar ve üçüncü taraf servisler</h2>
        <p>YouTube/Blogger gibi bağlantılar kullanıcı onayı ile kurulur ve ilgili sağlayıcı politikalarına tabidir.</p>
        <h2>6. İçerik sorumluluğu</h2>
        <p>Üretilen içeriklerin doğruluk, telif ve mevzuat uyumluluğu kontrolleri kullanıcı sorumluluğundadır.</p>
        <h2>7. Hizmetin kesintisi / değişmesi</h2>
        <p>Bakım, güvenlik, performans ve yasal gereklilikler nedeniyle hizmette geçici değişiklikler olabilir.</p>
        <h2>8. Sorumluluğun sınırlandırılması</h2>
        <p>Hizmet mevcut haliyle sunulur; dolaylı zararlar için sorumluluk mevzuatın izin verdiği ölçüde sınırlıdır.</p>
        <h2>9. Hesabın askıya alınması / sonlandırılması</h2>
        <p>Politika ihlali, güvenlik riski veya yasal talepler doğrultusunda hesaplar askıya alınabilir veya sonlandırılabilir.</p>
        <h2>10. İletişim</h2>
        <p>
          Kullanım koşulları soruları için: <a href="mailto:onur24sel@gmail.com">onur24sel@gmail.com</a>
        </p>
        <p><small>Not: Bu metin bilgilendirme amaçlıdır, hukuki danışmanlık değildir.</small></p>
      </div>
    </main>
  );
}
