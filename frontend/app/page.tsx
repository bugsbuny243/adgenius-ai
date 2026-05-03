import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

const bentoFeatures = [
  {
    title: 'Unity Build',
    icon: '⚡',
    description: 'Repository tetiklenir, Unity Cloud Build hattı otomatik devreye girer ve sürüm üretimi kesintisiz devam eder.',
    className: 'md:col-span-2'
  },
  {
    title: 'GitHub Sync',
    icon: '🔗',
    description: 'Branch, commit ve release adımları panelden izlenir; kod ile operasyon her zaman senkron kalır.',
    className: 'md:row-span-2'
  },
  {
    title: 'Play Store',
    icon: '🚀',
    description: 'Build doğrulanır, metadata hazırlanır ve tek akışta Google Play yayınına gönderilir.',
    className: ''
  }
] as const;

const timeline = [
  {
    step: '01',
    title: 'Fikri Tanımla',
    description: 'Kısa brief gir, hedef kitleyi seç ve ürün yönünü netleştir.'
  },
  {
    step: '02',
    title: 'Pipeline Otomasyonu',
    description: 'Koschei AI build, test ve release işlerini doğru sırayla orkestre eder.'
  },
  {
    step: '03',
    title: 'Yayın ve Ölçekleme',
    description: 'Google Play dağıtımını yönet, metrikleri izle ve yeni sürümleri hızla üret.'
  }
] as const;

export default function HomePage() {
  return (
    <main className="relative space-y-14 overflow-hidden rounded-3xl border border-white/10 bg-[#070811]/80 p-6 md:p-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.28),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.25),transparent_42%),radial-gradient(circle_at_50%_80%,rgba(79,70,229,0.2),transparent_48%)]" />
      <div className="gradient-shift pointer-events-none absolute -left-28 -top-24 -z-10 h-[420px] w-[420px] rounded-full bg-violet-500/20 blur-3xl" />
      <div className="gradient-shift pointer-events-none absolute -bottom-20 right-0 -z-10 h-[420px] w-[420px] rounded-full bg-blue-500/20 blur-3xl [animation-delay:2s]" />

      <PublicSiteNav />

      <section className="space-y-7">
        <p className="text-sm uppercase tracking-[0.22em] text-zinc-400">Koschei AI • Dark Premium Platform</p>
        <div className="space-y-3">
          <h1 className="max-w-4xl text-5xl font-black leading-[1.03] text-zinc-100 md:text-7xl">
            Koschei AI: Oyun Fabrikanızın Anahtarı
          </h1>
          <p className="text-lg font-light tracking-wide text-zinc-400 md:text-xl">Fikir sizden, üretim otonom</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="rounded-xl bg-gradient-to-r from-violet-400 via-fuchsia-400 to-blue-400 px-6 py-3 font-semibold text-zinc-950 shadow-[0_0_35px_rgba(147,51,234,0.55)] transition hover:scale-[1.02] hover:shadow-[0_0_45px_rgba(96,165,250,0.7)]"
          >
            Hemen Başla
          </Link>
          <Link href="/signin" className="rounded-xl border border-white/20 px-6 py-3 text-zinc-300 transition hover:border-violet-300 hover:text-zinc-100">
            Giriş Yap
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-zinc-100">Bento Özellikler</h2>
        <div className="grid auto-rows-[minmax(160px,auto)] gap-4 md:grid-cols-3">
          {bentoFeatures.map((item) => (
            <article
              key={item.title}
              className={`group rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition duration-300 hover:-translate-y-1 hover:border-violet-300/40 hover:bg-white/[0.06] ${item.className}`}
            >
              <div className="inline-flex rounded-lg border border-violet-300/30 bg-violet-500/10 px-3 py-1.5 text-lg shadow-[0_0_22px_rgba(168,85,247,0.45)]">
                {item.icon}
              </div>
              <h3 className="mt-4 text-xl font-semibold text-zinc-100">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-2xl font-semibold text-zinc-100">Nasıl Çalışır?</h2>
        <ol className="space-y-5">
          {timeline.map((item) => (
            <li key={item.step} className="relative pl-12">
              <span className="absolute left-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-full border border-blue-300/30 bg-blue-500/10 text-xs font-bold text-blue-200 shadow-[0_0_18px_rgba(59,130,246,0.35)]">
                {item.step}
              </span>
              <span className="absolute left-4 top-8 h-[calc(100%+0.5rem)] w-px bg-gradient-to-b from-blue-300/40 to-transparent" />
              <h3 className="text-lg font-semibold text-zinc-100">{item.title}</h3>
              <p className="mt-1 text-sm text-zinc-400">{item.description}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
