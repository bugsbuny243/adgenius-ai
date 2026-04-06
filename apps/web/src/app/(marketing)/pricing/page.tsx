import Link from 'next/link';

import { SiteFooter } from '@/components/layout/footer';
import { SiteNavbar } from '@/components/layout/navbar';

const plans = [
  {
    name: 'Ücretsiz',
    price: '₺0/ay',
    features: ['30 run/ay', '5 private template', 'Public keşif görüntüleme', 'Tek kişilik workspace'],
    ctaLabel: 'Hemen Başla',
    ctaHref: '/signup',
    highlighted: false,
    badge: null,
  },
  {
    name: 'Starter',
    price: '₺199/ay',
    features: ['300 run/ay', '50 private template', 'Public template yayınlama', 'Template performans analytics'],
    ctaLabel: 'Startera Geç',
    ctaHref: '/signup',
    highlighted: true,
    badge: 'Büyüme Planı',
  },
  {
    name: 'Pro',
    price: '₺499/ay',
    features: ['Sınırsız run', 'Sınırsız template', 'Gelişmiş analytics + growth insights', 'Ekip paylaşımı ve çoklu üye workspace'],
    ctaLabel: 'Proya Yükselt',
    ctaHref: '/contact',
    highlighted: false,
    badge: null,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-12">
        <header className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-semibold md:text-4xl">Koschei AI Fiyatlandırma</h1>
          <p className="mt-3 text-zinc-300">
            Ekosistem özellikleri planlara bağlıdır: daha fazla template limiti, public yayın, analytics ve ekip paylaşımı ile
            büyüdükçe yükseltin.
          </p>
        </header>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-2xl border bg-zinc-900/70 p-6 ${plan.highlighted ? 'border-indigo-500' : 'border-zinc-800'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                {plan.badge ? (
                  <span className="rounded-full border border-indigo-400/50 bg-indigo-500/20 px-2 py-1 text-xs font-medium text-indigo-200">
                    {plan.badge}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-2xl font-bold">{plan.price}</p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              <Link
                href={plan.ctaHref}
                className="mt-6 block w-full rounded-lg bg-indigo-500 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-indigo-400"
              >
                {plan.ctaLabel}
              </Link>
            </article>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
