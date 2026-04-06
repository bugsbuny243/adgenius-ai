import Link from 'next/link';

import { SiteFooter } from '@/components/layout/footer';
import { SiteNavbar } from '@/components/layout/navbar';

const plans = [
  {
    name: 'Ücretsiz',
    price: '₺0/ay',
    features: ['30 run/ay', '8 agent tipi', 'Çıktı kaydetme'],
    ctaLabel: 'Hemen Başla',
    ctaHref: '/signup',
    highlighted: false,
    disabled: false,
    badge: null,
  },
  {
    name: 'Başlangıç',
    price: '₺199/ay (yakında)',
    features: ['300 run/ay', 'Tüm agent tipleri', 'Öncelikli işlem'],
    ctaLabel: 'Yakında',
    ctaHref: '#',
    highlighted: true,
    disabled: true,
    badge: 'Çok Yakında',
  },
  {
    name: 'Pro',
    price: '₺499/ay (yakında)',
    features: ['Sınırsız run', 'Tüm agentlar + öncelik', 'API erişimi', 'Takım workspace'],
    ctaLabel: 'Yakında',
    ctaHref: '#',
    highlighted: false,
    disabled: true,
    badge: null,
  },
];

const faqs = [
  {
    question: 'Ücretsiz plan ne kadar sürer?',
    answer: 'Süresiz, kredi kartı gerekmez.',
  },
  {
    question: 'Run nedir?',
    answer: 'Her agent çalıştırması 1 run sayılır.',
  },
  {
    question: 'Ödeme nasıl yapılır?',
    answer: 'Shopier ile güvenli Türk Lirası ödeme.',
  },
  {
    question: 'Plan değiştirebilir miyim?',
    answer: 'Evet, istediğiniz zaman.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-12">
        <header className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-semibold md:text-4xl">Koschei AI Fiyatlandırma</h1>
          <p className="mt-3 text-zinc-300">Ekip boyutunuza uygun planı seçin. Ücretsiz başlayın, ihtiyaç büyüdükçe yükseltin.</p>
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
              {plan.disabled ? (
                <button
                  type="button"
                  disabled
                  className="mt-6 w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-400 disabled:cursor-not-allowed"
                >
                  {plan.ctaLabel}
                </button>
              ) : (
                <Link
                  href={plan.ctaHref}
                  className="mt-6 block w-full rounded-lg bg-indigo-500 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-indigo-400"
                >
                  {plan.ctaLabel}
                </Link>
              )}
            </article>
          ))}
        </section>

        <section className="mx-auto mt-14 max-w-3xl">
          <h2 className="text-2xl font-semibold">Sık Sorulan Sorular</h2>
          <div className="mt-4 space-y-3">
            {faqs.map((item) => (
              <details key={item.question} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                <summary className="cursor-pointer list-none font-medium text-zinc-100">{item.question}</summary>
                <p className="mt-2 text-sm text-zinc-300">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
