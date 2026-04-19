import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

const plans = [
  {
    name: 'Ücretsiz',
    badge: 'Başlangıç için',
    price: '₺0',
    period: '/ay',
    features: ['30 run/ay', 'Temel agent erişimi', 'Sonuç kaydetme', 'Proje organizasyonu'],
    cta: { href: '/signup', label: 'Ücretsiz Başla' }
  },
  {
    name: 'Başlangıç',
    badge: 'En popüler',
    price: '₺590',
    period: '/ay',
    features: ['300 run/ay', 'Öncelikli işlem', 'Araştırma destekli kullanım', 'Gelişmiş üretim akışı'],
    cta: { href: '/signup', label: 'Başlangıç Planını Seç' }
  },
  {
    name: 'Pro',
    badge: 'Ekipler için',
    price: '₺1.490',
    period: '/ay',
    features: ['Yüksek limit yaklaşımı', 'Derin analiz modu', 'Öncelikli işlem', 'İleri kullanım senaryoları'],
    cta: { href: '/signup', label: 'Pro Planına Geç' }
  }
] as const;

export default function PricingPage() {
  return (
    <main className="panel space-y-8">
      <PublicSiteNav />
      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Fiyatlandırma</p>
        <h1 className="text-4xl font-bold">Ekibiniz için net ve güvenilir planlar</h1>
        <p className="max-w-3xl text-white/75">
          Koschei AI, çekirdek üretim akışınızı hızlandırmak için tasarlanmıştır. Planlarınızı ihtiyaçlarınıza göre yükseltebilir,
          kullanım durumunu ürün içinden anlık takip edebilirsiniz.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.name} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-wide text-white/60">{plan.badge}</p>
            <h2 className="mt-2 text-2xl font-semibold">{plan.name}</h2>
            <p className="mt-1 text-3xl font-bold">
              {plan.price}
              <span className="text-base font-medium text-white/65">{plan.period}</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              {plan.features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
            <Link href={plan.cta.href} className="mt-5 inline-flex rounded-xl border border-neon/60 px-4 py-2 text-sm text-neon hover:bg-neon/10">
              {plan.cta.label}
            </Link>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/75">
        <p>
          Güven ve şeffaflık önceliğimizdir. Gerçek yayın entegrasyonları hazır değilse sistem bunu açıkça belirtir; yanıltıcı
          "yayınlandı" mesajı gösterilmez.
        </p>
      </section>
    </main>
  );
}
