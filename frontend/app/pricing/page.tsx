import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

const plans = [
  {
    name: 'Ücretsiz',
    badge: 'Deneyin',
    price: '₺0',
    period: '/ay',
    highlight: false,
    features: [
      '5 çalışma/ay',
      '8 AI agent erişimi',
      'Sonuç kaydetme',
      'Proje organizasyonu',
    ],
    notIncluded: [
      'Araştırma destekli mod',
      'Derin analiz modu',
      'Öncelikli işlem',
    ],
    cta: { href: '/signup', label: 'Ücretsiz Başla' }
  },
  {
    name: 'Başlangıç',
    badge: 'En Popüler',
    price: '₺199',
    period: '/ay',
    highlight: true,
    features: [
      '100 çalışma/ay',
      '8 AI agent erişimi',
      'Araştırma destekli mod',
      'Sonuç kaydetme',
      'Proje organizasyonu',
      'Öncelikli işlem',
    ],
    notIncluded: [
      'Derin analiz modu (Pro)',
    ],
    cta: { href: '/upgrade?plan=starter', label: 'Başlangıç Planını Seç' }
  },
  {
    name: 'Pro',
    badge: 'Ekipler İçin',
    price: '₺599',
    period: '/ay',
    highlight: false,
    features: [
      '500 çalışma/ay',
      '8 AI agent erişimi',
      'Araştırma destekli mod',
      'Derin analiz modu',
      'Sonuç kaydetme',
      'Proje organizasyonu',
      'Öncelikli işlem',
      'Öncelikli destek',
    ],
    notIncluded: [],
    cta: { href: '/upgrade?plan=pro', label: 'Pro Planını Seç' }
  }
] as const;

const faq = [
  {
    q: 'Çalışma (run) nedir?',
    a: 'Her agent çalıştırması 1 run sayılır. İçerik yazarı, araştırma, e-posta gibi tüm agentlar aynı run havuzunu kullanır.'
  },
  {
    q: 'Limit dolduğunda ne olur?',
    a: 'Agentlar o ay için devre dışı kalır. Verileriniz silinmez. Bir sonraki ay başında limit sıfırlanır veya planınızı yükseltebilirsiniz.'
  },
  {
    q: 'Plan yükseltince verilerim silinir mi?',
    a: 'Hayır. Tüm proje, çıktı ve çalışma geçmişiniz korunur.'
  },
  {
    q: 'Ödeme güvenli mi?',
    a: 'Ödeme altyapısı yakında aktif olacak. Güvenli TL ödeme ile çalışacak.'
  },
  {
    q: 'İstediğimde iptal edebilir miyim?',
    a: 'Evet, istediğiniz zaman iptal edebilirsiniz. İptal sonraki dönemden itibaren geçerli olur.'
  },
] as const;

export default function PricingPage() {
  return (
    <main className="panel space-y-10">
      <PublicSiteNav />

      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Fiyatlandırma</p>
        <h1 className="text-4xl font-bold">Küçük başla, büyüdükçe geliş</h1>
        <p className="max-w-2xl text-white/75">
          5 ücretsiz çalışma ile başlayın. Ekibinizin ihtiyacı arttıkça kolayca yükseltin.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`rounded-2xl border p-6 ${
              plan.highlight
                ? 'border-neon/50 bg-neon/5'
                : 'border-white/10 bg-black/20'
            }`}
          >
            {plan.highlight && (
              <span className="mb-3 inline-block rounded-full bg-neon/20 px-3 py-0.5 text-xs font-semibold text-neon">
                {plan.badge}
              </span>
            )}
            {!plan.highlight && (
              <span className="mb-3 inline-block text-xs text-white/50 uppercase tracking-wide">
                {plan.badge}
              </span>
            )}

            <h2 className="text-2xl font-semibold">{plan.name}</h2>
            <p className="mt-1 text-3xl font-bold">
              {plan.price}
              <span className="text-base font-normal text-white/60">{plan.period}</span>
            </p>

            <ul className="mt-5 space-y-2 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-white/85">
                  <span className="mt-0.5 text-neon">✓</span>
                  {f}
                </li>
              ))}
              {plan.notIncluded.map((f) => (
                <li key={f} className="flex items-start gap-2 text-white/35 line-through">
                  <span className="mt-0.5">✗</span>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href={plan.cta.href}
              className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                plan.highlight
                  ? 'bg-neon text-ink hover:bg-neon/90'
                  : 'border border-white/20 hover:border-neon hover:text-neon'
              }`}
            >
              {plan.cta.label}
            </Link>
          </article>
        ))}
      </section>

      {/* Karşılaştırma tablosu */}
      <section className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <h2 className="mb-4 text-xl font-semibold">Plan karşılaştırması</h2>
        <div className="overflow-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-white/50">
                <th className="border-b border-white/10 pb-2 pr-4">Özellik</th>
                <th className="border-b border-white/10 pb-2 pr-4">Ücretsiz</th>
                <th className="border-b border-white/10 pb-2 pr-4 text-neon">Başlangıç</th>
                <th className="border-b border-white/10 pb-2">Pro</th>
              </tr>
            </thead>
            <tbody className="text-white/80">
              {[
                ['Aylık çalışma', '5', '100', '500'],
                ['8 AI agent', '✓', '✓', '✓'],
                ['Sonuç kaydetme', '✓', '✓', '✓'],
                ['Proje yönetimi', '✓', '✓', '✓'],
                ['Araştırma modu', '—', '✓', '✓'],
                ['Derin analiz modu', '—', '—', '✓'],
                ['Öncelikli işlem', '—', '✓', '✓'],
                ['Öncelikli destek', '—', '—', '✓'],
              ].map(([feature, free, starter, pro]) => (
                <tr key={feature}>
                  <td className="border-b border-white/5 py-2 pr-4">{feature}</td>
                  <td className="border-b border-white/5 py-2 pr-4 text-white/50">{free}</td>
                  <td className="border-b border-white/5 py-2 pr-4">{starter}</td>
                  <td className="border-b border-white/5 py-2">{pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SSS */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Sık sorulan sorular</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {faq.map((item) => (
            <article key={item.q} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="font-medium text-white/90">{item.q}</p>
              <p className="mt-1 text-sm text-white/65">{item.a}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="text-center text-sm text-white/50">
        <p>Koschei AI — Türkçe konuşan ekipler için AI agent platformu</p>
      </section>
    </main>
  );
}
