import type { Metadata } from 'next';
import { PublicSiteNav } from '@/components/public-site-nav';

export const metadata: Metadata = {
  title: 'Hakkımızda | Koschei AI',
  description: 'Koschei bağımsız AI çalışma alanının yaklaşımı ve ürün vizyonu.'
};

export default function AboutPage() {
  return (
    <main className="panel space-y-4">
      <PublicSiteNav />
      <h1 className="text-3xl font-bold">Hakkımızda</h1>
      <p className="text-white/75">
        Koschei, karmaşık dijital iş akışlarını sadeleştirmek için tasarlanmış bağımsız bir AI çalışma alanıdır.
      </p>
      <p className="text-white/75">
        Uzmanlaşmış ajanlar aracılığıyla kullanıcıların görevleri planlamasına, üretmesine, gözden geçirmesine ve
        kontrollü şekilde yürütmesine yardımcı olur.
      </p>
      <p className="text-white/75">
        Harici platformlar ve hesaplar daima kullanıcı kontrolünde kalır; kritik adımlar kullanıcı onayı olmadan
        başlatılmaz.
      </p>
    </main>
  );
}
