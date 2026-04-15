import type { Metadata } from 'next';
import { PublicSiteNav } from '@/components/public-site-nav';

export const metadata: Metadata = {
  title: 'İletişim | Koschei AI',
  description: 'Destek, ürün soruları ve iş birliği talepleri için Koschei AI iletişim bilgileri.'
};

export default function ContactPage() {
  return (
    <main className="panel space-y-4">
      <PublicSiteNav />
      <h1 className="text-3xl font-bold">İletişim</h1>
      <p className="text-white/75">
        Ürün kullanımı, hesap işlemleri veya iş birliği talepleri için bize e-posta üzerinden ulaşabilirsiniz.
      </p>
      <p className="font-medium">
        <a className="text-neon hover:underline" href="mailto:hello@tradepigloball.co">
          hello@tradepigloball.co
        </a>
      </p>
      <p className="text-white/70">
        Gelen talepleri öncelik sırasına göre değerlendiriyor ve mümkün olan en kısa sürede geri dönüş sağlıyoruz.
      </p>
    </main>
  );
}
