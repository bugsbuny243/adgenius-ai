import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası | Koschei AI',
  description: 'Koschei AI gizlilik politikası: veri işleme, saklama ve kullanıcı hakları hakkında bilgiler.'
};

export default function PrivacyPolicyPage() {
  return (
    <main className="panel space-y-4">
      <PublicSiteNav />
      <h1 className="text-3xl font-bold">Gizlilik Politikası</h1>
      <p className="text-white/75">
        Koschei AI, hizmetin çalışması için gerekli olan temel hesap ve kullanım verilerini işler. Bu veriler; giriş
        işlemleri, güvenlik kontrolleri, ürün performansını izleme ve kullanıcı desteği sağlama amacıyla kullanılır.
      </p>
      <p className="text-white/75">
        Platform içinde oluşturduğunuz içerik taslakları ve iş akışı kayıtları, hizmet kalitesi ve operasyonel devamlılık
        için saklanabilir. Verilere erişim yalnızca yetkili sistemler ve gerekli durumlarda destek süreçleri ile
        sınırlıdır.
      </p>
      <p className="text-white/75">
        Sitede analiz, ölçümleme veya reklam gösterimi için üçüncü taraf hizmetler kullanılabilir. Bu hizmetler çerez ve
        benzeri teknolojilerden yararlanabilir. Çerez kullanımına ilişkin detaylar için{' '}
        <Link href="/cookies" className="text-neon hover:underline">
          Çerez Politikası
        </Link>{' '}
        sayfasını inceleyebilirsiniz.
      </p>
      <p className="text-white/75">
        Gizlilik haklarınız ve veri talepleriniz için{' '}
        <a className="text-neon hover:underline" href="mailto:hello@tradepigloball.co">
          hello@tradepigloball.co
        </a>{' '}
        adresine yazabilirsiniz.
      </p>
    </main>
  );
}
