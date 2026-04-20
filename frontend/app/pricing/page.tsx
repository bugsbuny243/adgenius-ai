import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

const plans = [
  {
    name: 'Ücretsiz',
    badge: 'Başlangıç',
    price: '₺0',
    period: '/ay',
    features: ['30 çalışma/ay', 'Temel agent erişimi', 'Kaydedilen çıktılar', 'Proje organizasyonu'],
    cta: { href: '/signup', label: 'Ücretsiz Başla' }
  },
  {
    name: 'Başlangıç',
    badge: 'En dengeli plan',
    price: '₺590',
    period: '/ay',
    features: ['300 çalışma/ay', 'Hızlı + derin mod erişimi', 'Araştırma destekli akış', 'Öncelikli işlem sırası'],
    cta: { href: '/upgrade', label: 'Başlangıç Planını Seç' }
  },
  {
    name: 'Pro',
    badge: 'Ekipler için',
    price: '₺1.490',
    period: '/ay',
    features: ['Yüksek kullanım limiti', 'Gelişmiş ekip üretim akışı', 'Daha geniş operasyon kapasitesi', 'Öncelikli destek'],
    cta: { href: '/upgrade', label: 'Pro Planına Geç' }
  }
] as const;

export default function PricingPage() {
  return (
    <main className="panel space-y-8">
      <PublicSiteNav />
      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Fiyatlandırma</p>
        <h1 className="text-4xl font-bold">Koschei AI ile ölçeklenen planlar</h1>
        <p className="max-w-3xl text-white/75">Planlar net limitlerle sunulur. Gerçekleşmemiş özellikler için yanıltıcı ifade kullanılmaz; tüm durumlar ürün içinde dürüst şekilde gösterilir.</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.name} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-wide text-white/60">{plan.badge}</p>
            <h2 className="mt-2 text-2xl font-semibold">{plan.name}</h2>
            <p className="mt-1 text-3xl font-bold">{plan.price}<span className="text-base font-medium text-white/65">{plan.period}</span></p>
            <ul className="mt-4 space-y-2 text-sm text-white/80">{plan.features.map((feature) => <li key={feature}>• {feature}</li>)}</ul>
            <Link href={plan.cta.href} className="mt-5 inline-flex rounded-xl border border-neon/60 px-4 py-2 text-sm text-neon hover:bg-neon/10">{plan.cta.label}</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
