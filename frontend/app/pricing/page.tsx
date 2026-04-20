import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

const plans = [
  { name: 'Ücretsiz', badge: 'Başlangıç', price: '₺0', period: '/ay', features: ['30 çalışma/ay', 'Temel agent erişimi', 'Kaydedilen çıktılar', 'Proje organizasyonu'], cta: { href: '/signup', label: 'Ücretsiz Başla' } },
  { name: 'Başlangıç', badge: 'En dengeli plan', price: '₺590', period: '/ay', features: ['300 çalışma/ay', 'Hızlı mod + Derin analiz modu', 'Araştırma destekli akış', 'Queue ve üretim operasyonu'], cta: { href: '/upgrade', label: 'Başlangıç Planını Seç' } },
  { name: 'Pro', badge: 'Ekipler için', price: '₺1.490', period: '/ay', features: ['Yüksek kullanım limiti', 'Yoğun operasyon iş yükü', 'Gelişmiş içerik akışları', 'Öncelikli destek'], cta: { href: '/upgrade', label: 'Pro Planına Geç' } }
] as const;

export default function PricingPage() {
  return (
    <main className="panel space-y-8">
      <PublicSiteNav />
      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Fiyatlandırma</p>
        <h1 className="text-4xl font-bold">Koschei AI ile ölçeklenen planlar</h1>
        <p className="max-w-3xl text-white/75">Plan karşılaştırması net, değer önerisi güçlü ve yükseltme yolu şeffaf. Ekipler kullanım yoğunluğuna göre hızlıca plan seçebilir.</p>
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

      <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-2xl font-semibold">Özellik karşılaştırması</h2>
        <div className="mt-3 overflow-auto text-sm">
          <table className="w-full min-w-[640px] border-collapse">
            <thead><tr className="text-left text-white/60"><th className="border-b border-white/10 py-2">Özellik</th><th className="border-b border-white/10 py-2">Ücretsiz</th><th className="border-b border-white/10 py-2">Başlangıç</th><th className="border-b border-white/10 py-2">Pro</th></tr></thead>
            <tbody className="text-white/80">
              <tr><td className="py-2">Aylık çalışma limiti</td><td>30</td><td>300</td><td>Yüksek</td></tr>
              <tr><td className="py-2">Araştırma destekli mod</td><td>Sınırlı</td><td>Var</td><td>Var</td></tr>
              <tr><td className="py-2">Sosyal içerik stüdyosu</td><td>Temel</td><td>Gelişmiş</td><td>Gelişmiş</td></tr>
              <tr><td className="py-2">Operasyon paneli</td><td>Temel</td><td>Geniş</td><td>Premium</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-2xl font-semibold">Sık sorulan sorular</h2>
        <div className="mt-3 space-y-3 text-sm text-white/80">
          <p><strong>Plan yükseltince verilerim silinir mi?</strong> Hayır, mevcut proje ve çıktılarınız korunur.</p>
          <p><strong>Ödeme akışı aktif değilse ne olur?</strong> Upgrade ekranında ödeme adımının hazırlıkta olduğu açıkça belirtilir, verileriniz etkilenmez.</p>
          <p><strong>Hangi planı seçmeliyim?</strong> Günlük kullanım düşükse Ücretsiz, düzenli operasyon varsa Başlangıç, ekip yükü yüksekse Pro plan önerilir.</p>
        </div>
      </section>
    </main>
  );
}
