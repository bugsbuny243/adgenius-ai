import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

export const metadata: Metadata = {
  title: 'Kullanım Koşulları | Koschei AI',
  description: 'Koschei AI hizmet kullanım koşulları ve kullanıcı sorumlulukları.'
};

export default function TermsPage() {
  return (
    <main className="panel space-y-4">
      <PublicSiteNav />
      <h1 className="text-3xl font-bold">Kullanım Koşulları</h1>
      <p className="text-white/75">
        Koschei AI hizmetini kullanarak bu sayfadaki temel kullanım koşullarını kabul etmiş olursunuz. Hizmet, içerik
        operasyonunu desteklemek için sunulur ve kullanıcı denetimini ortadan kaldıran bir “tam otomasyon” vaadi içermez.
      </p>
      <p className="text-white/75">
        Hesap güvenliğinden kullanıcı sorumludur. Hesap paylaşımı, yetkisiz erişim veya hizmete zarar verecek kullanım
        tespit edildiğinde erişim kısıtlanabilir.
      </p>
      <p className="text-white/75">
        Platformda üretilen taslak içeriklerin doğruluğu ve yasal uygunluğu kullanıcı tarafından kontrol edilmelidir.
        Özellikle kamuya açık yayınlarda son sorumluluk içerik sahibine aittir.
      </p>
      <p className="text-white/75">
        Hizmet koşulları, güvenlik veya mevzuat gereksinimleri doğrultusunda güncellenebilir. Gizlilik ve çerez
        uygulamaları için{' '}
        <Link href="/privacy-policy" className="text-neon hover:underline">
          Gizlilik Politikası
        </Link>{' '}
        ve{' '}
        <Link href="/cookies" className="text-neon hover:underline">
          Çerez Politikası
        </Link>{' '}
        sayfalarını inceleyebilirsiniz.
      </p>
    </main>
  );
}
