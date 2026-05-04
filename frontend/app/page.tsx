import { ArrowRight, CheckCircle2, Rocket, Sparkles, Stars, Zap } from 'lucide-react';
import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

const highlights = [
  { title: 'Prompt → Live Build', desc: 'Tek brief ile asset, kod ve release zincirini başlat.', icon: Rocket },
  { title: 'AI Co-Pilot Orkestrası', desc: 'Art agent + coder agent + QA agent senkron çalışır.', icon: Zap },
  { title: 'Gerçek Zamanlı Telemetri', desc: 'Pipeline sağlığı, kuyruk ve deploy durumunu anlık izle.', icon: Stars }
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(6,182,212,0.16),transparent_30%),radial-gradient(circle_at_85%_12%,rgba(139,92,246,0.18),transparent_30%),radial-gradient(circle_at_55%_78%,rgba(34,211,238,0.13),transparent_34%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 md:px-8">
        <PublicSiteNav />

        <section className="grid flex-1 items-center gap-6 py-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_0_60px_-20px_rgba(6,182,212,0.5)] backdrop-blur-2xl md:p-12">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs tracking-[0.22em] text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" /> NEXT-GEN GAME OPERATING SYSTEM
            </p>
            <h1 className="mt-6 bg-gradient-to-r from-white via-cyan-200 to-violet-200 bg-clip-text text-4xl font-black leading-tight tracking-tight text-transparent sm:text-6xl lg:text-7xl">
              AdGenius AI ile oyun üretimi artık bir şov.
            </h1>
            <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
              Fikirden store-ready sürüme kadar tüm üretim hattını tek ekranda yönetin. Daha hızlı üretin, daha iyi optimize edin, daha çarpıcı yayınlayın.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-500/20 px-6 py-3 text-sm font-semibold text-cyan-100 shadow-[0_0_28px_-8px_rgba(6,182,212,0.95)] transition hover:translate-y-[-1px] hover:bg-cyan-500/30"
              >
                Dashboard&apos;a Uçuş Yap <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signup"
                className="rounded-xl border border-violet-400/40 bg-violet-500/15 px-6 py-3 text-sm font-semibold text-violet-100 shadow-[0_0_24px_-10px_rgba(139,92,246,0.9)] transition hover:translate-y-[-1px] hover:bg-violet-500/25"
              >
                Hemen Başla
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            {highlights.map((item) => (
              <article key={item.title} className="group rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition hover:border-cyan-400/40 hover:bg-white/10">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-2.5 text-cyan-200"><item.icon className="h-5 w-5" /></div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-300">{item.desc}</p>
                  </div>
                </div>
              </article>
            ))}

            <div className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-5 text-emerald-100">
              <p className="inline-flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-4 w-4" /> 7/24 üretim hattı canlı</p>
              <p className="mt-1 text-sm text-emerald-50/90">Agent orkestrasyonu ve build pipeline tek komutla devrede.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
