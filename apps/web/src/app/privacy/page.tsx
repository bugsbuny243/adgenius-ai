import { SiteFooter } from '@/components/site-footer';
import { SiteNavbar } from '@/components/site-navbar';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-12">
        <h1 className="text-3xl font-semibold">Gizlilik Politikası</h1>
        <p className="text-zinc-300">
          Koschei, kullanıcı hesap verilerini hizmete erişim, güvenlik doğrulaması ve hesap yönetimi amaçlarıyla
          işler.
        </p>
        <p className="text-zinc-300">
          Üretilen içerikler, kullanıcı deneyimini sağlamak ve geçmiş kayıtları görüntülemek amacıyla ilgili çalışma
          alanında saklanabilir.
        </p>
        <p className="text-zinc-300">
          Hizmetin performansını ve güvenliğini iyileştirmek için temel çerezler ve sınırlı düzeyde analiz araçları
          kullanılabilir.
        </p>
        <p className="text-zinc-300">
          Altyapı, barındırma, kimlik doğrulama ve ölçümleme süreçlerinde üçüncü taraf hizmet sağlayıcılar devreye
          alınabilir. Bu sağlayıcılar yalnızca hizmet sunumu için gerekli kapsamda veri işleyebilir.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
