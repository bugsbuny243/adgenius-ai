import type { Metadata } from 'next';
import { PublicSiteNav } from '@/components/public-site-nav';

export const metadata: Metadata = {
  title: 'Çerez Politikası | Koschei AI',
  description: 'Koschei AI çerez politikası ve çerez tercihleri hakkında açıklamalar.'
};

export default function CookiesPage() {
  return (
    <main className="panel space-y-4">
      <PublicSiteNav />
      <h1 className="text-3xl font-bold">Çerez Politikası</h1>
      <p className="text-white/75">
        Koschei AI, site performansını izlemek, temel kullanıcı deneyimini sağlamak ve reklam/ölçüm süreçlerini
        desteklemek için çerezler veya benzer teknolojiler kullanabilir.
      </p>
      <p className="text-white/75">
        Bazı çerezler oturum yönetimi ve güvenlik için zorunludur. Analitik ve reklam amaçlı çerezler ise ilgili üçüncü
        taraf sağlayıcıların politikalarına göre çalışabilir.
      </p>
      <p className="text-white/75">
        Tarayıcı ayarlarınız üzerinden çerez tercihlerinizi güncelleyebilirsiniz. Ancak zorunlu çerezlerin devre dışı
        bırakılması bazı sayfa işlevlerinin beklenenden farklı çalışmasına neden olabilir.
      </p>
      <p className="text-white/75">
        Veri işleme hakkında genel bilgi için Gizlilik Politikası sayfamızı inceleyebilir veya destek ekibimize e-posta
        ile ulaşabilirsiniz.
      </p>
    </main>
  );
}
