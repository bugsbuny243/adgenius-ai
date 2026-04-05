import { SiteFooter } from '@/components/layout/footer';
import { SiteNavbar } from '@/components/layout/navbar';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-12">
        <h1 className="text-3xl font-semibold">Hakkımızda</h1>
        <p className="text-zinc-300">
          Tradepiglobal AI, ekiplerin bilgi üretimi ve operasyonel iletişim süreçlerini hızlandırmak için geliştirilen
          AI agent çalışma alanıdır.
        </p>
        <p className="text-zinc-300">
          Platform; görev tanımı, çıktı üretimi, kayıt ve yeniden kullanım adımlarını tek bir akışta birleştirir.
          Böylece ekipler daha az tekrar işiyle daha tutarlı sonuçlar elde edebilir.
        </p>
        <p className="text-zinc-300">
          Ürün yaklaşımımız net: sade arayüz, ölçülebilir kullanım, insan kontrolünü önceleyen AI destekli
          üretim.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
