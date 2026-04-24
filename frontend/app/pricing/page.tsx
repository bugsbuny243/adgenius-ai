import { PublicSiteNav } from '@/components/public-site-nav';

const plans = [
  {
    name: 'Koschei Starter',
    price: '499 TL / ay',
    status: 'Erken Erişim',
    features: ['Temel ajan kütüphanesi', 'İçerik planlama akışları', 'Görev ve taslak yönetimi']
  },
  {
    name: 'Koschei Creator',
    price: '1.999 TL / ay',
    status: 'Erken Erişim',
    features: ['Gelişmiş ajan akışları', 'Yayın hazırlığı araçları', 'Operasyon paneli ve raporlama']
  },
  {
    name: 'Koschei Studio',
    price: '6.999 TL / ay',
    status: 'Erken Erişim',
    features: ['Takım iş akışları', 'Yoğun üretim süreçleri', 'Öncelikli destek ve yönetim görünümü']
  },
  {
    name: 'Koschei Game Lite',
    price: '2.999 TL / ay',
    status: 'Erken Erişim',
    features: ['Prompttan oyun fikri', 'Template tabanlı üretim', 'Temel build hazırlığı']
  },
  {
    name: 'Koschei Game Factory',
    price: '14.999 TL / ay',
    status: 'Erken Erişim',
    features: ['Genişletilmiş build hattı', 'APK/AAB üretim süreci', 'Yayın öncesi kontrol listeleri']
  },
  {
    name: 'Koschei Game Factory Pro',
    price: '29.999 TL / ay',
    status: 'Erken Erişim',
    features: ['Yüksek hacimli build kuyruğu', 'Takım odaklı oyun üretimi', 'Operasyon ve onay yönetimi']
  }
] as const;

export default function PricingPage() {
  return (
    <main className="panel space-y-8">
      <PublicSiteNav />

      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Fiyatlandırma</p>
        <h1 className="text-4xl font-bold">Koschei Planları</h1>
        <p className="max-w-2xl text-white/75">Tüm paketler erken erişim aşamasında olup ajan kütüphanesi odaklı yapıdadır.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.name} className="rounded-2xl border border-white/10 bg-black/20 p-6">
            <p className="text-xs uppercase tracking-wide text-lilac">{plan.status}</p>
            <h2 className="mt-1 text-2xl font-semibold">{plan.name}</h2>
            <p className="mt-2 text-xl font-bold text-neon">{plan.price}</p>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              {plan.features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-white/75">
        <h2 className="text-lg font-semibold text-white">Plan Notları</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Game build işlemleri için build kredisi gereklidir.</li>
          <li>Mağaza ve yayınlama işlemleri kullanıcı onayı gerektirir.</li>
          <li>Platform onayları garanti edilmez.</li>
          <li>Fiyatlar erken erişim tahminidir.</li>
        </ul>
      </section>
    </main>
  );
}
