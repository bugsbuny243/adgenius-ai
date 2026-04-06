import { SiteFooter } from '@/components/layout/footer';
import { SiteNavbar } from '@/components/layout/navbar';

const plans = [
  {
    name: 'Ücretsiz',
    price: '₺0',
    period: '/ay',
    features: ['30 run/ay', '8 agent tipi', 'Çıktı kaydetme'],
    actionLabel: 'Hemen Başla',
    href: '/signup',
    disabled: false,
  },
  {
    name: 'Başlangıç',
    price: 'Yakında',
    period: '',
    features: ['300 run/ay', 'Öncelikli işlem', 'Tüm agent tipleri'],
    actionLabel: 'Yakında',
    href: '#',
    disabled: true,
  },
  {
    name: 'Pro',
    price: 'Yakında',
    period: '',
    features: ['Sınırsız run', 'API erişimi', 'Takım çalışma alanı'],
    actionLabel: 'Yakında',
    href: '#',
    disabled: true,
  },
] as const;

const faq = [
  {
    question: 'Ücretsiz plan kimler için uygun?',
    answer: 'Koschei AI ile yeni başlayan bireyler ve küçük ekipler için idealdir.',
  },
  {
    question: 'Plan yükseltme ne zaman açılacak?',
    answer: 'Başlangıç ve Pro planları çok yakında aktif olacak. Duyurular için bizi takip edin.',
  },
  {
    question: 'Run limiti dolunca ne olur?',
    answer: 'Aylık limit dolduğunda yeni ayı bekleyebilir veya ücretli planlara geçtiğinizde limiti artırabilirsiniz.',
  },
  {
    question: 'Agent tipleri Türkçe çıktı üretiyor mu?',
    answer: 'Evet, tüm agent tipleri Türkçe içerik üretmek üzere optimize edilmiştir.',
  },
] as const;

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-12">
        <h1 className="text-3xl font-semibold">Koschei AI planları</h1>
        <p className="mt-3 max-w-3xl text-zinc-300">
          Ekip büyüklüğüne ve kullanım yoğunluğuna göre doğru planı seç. Ücretsiz planla hemen başla, gelişmiş paketler yakında.
        </p>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                {plan.disabled ? (
                  <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-2 py-1 text-xs text-amber-300">
                    Yakında
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-3xl font-bold text-white">
                {plan.price}
                <span className="text-sm font-normal text-zinc-400">{plan.period}</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              {plan.disabled ? (
                <span className="mt-6 inline-flex w-full cursor-not-allowed items-center justify-center rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-400">
                  {plan.actionLabel}
                </span>
              ) : (
                <a
                  href={plan.href}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
                >
                  {plan.actionLabel}
                </a>
              )}
            </article>
          ))}
        </section>

        <section className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h2 className="text-2xl font-semibold">Sık Sorulan Sorular</h2>
          <div className="mt-4 space-y-4">
            {faq.map((item) => (
              <article key={item.question}>
                <h3 className="text-base font-medium text-zinc-100">{item.question}</h3>
                <p className="mt-1 text-sm text-zinc-300">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
