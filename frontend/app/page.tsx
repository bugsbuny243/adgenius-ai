import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-slate-100">
      <div className="pointer-events-none absolute -left-20 top-24 h-72 w-72 rounded-full bg-cyan-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-violet-500/30 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 md:px-8">
        <PublicSiteNav />

        <section className="flex flex-1 items-center py-12">
          <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_0_60px_-20px_rgba(6,182,212,0.45)] backdrop-blur-xl md:p-14">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs tracking-[0.22em] text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" /> AUTONOMOUS GAME PIPELINE
            </p>
            <h1 className="mt-6 bg-gradient-to-r from-white via-cyan-200 to-violet-200 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-6xl lg:text-7xl">
              KOSCHEI V5: Otonom Oyun Fabrikası
            </h1>
            <p className="mt-6 max-w-3xl text-base text-slate-300 sm:text-lg">
              Prompt&apos;tan yayınlanabilir oyun sürümüne uzanan uçtan uca operasyon katmanı. Brief üret, build tetikle,
              canlı telemetri ile tüm üretim hattını tek panelden yönet.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-500/20 px-6 py-3 text-sm font-semibold text-cyan-100 shadow-[0_0_28px_-8px_rgba(6,182,212,0.95)] transition hover:bg-cyan-500/30"
              >
                Command Center&apos;a Gir <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-violet-400/40 bg-violet-500/15 px-6 py-3 text-sm font-semibold text-violet-100 shadow-[0_0_24px_-10px_rgba(139,92,246,0.9)] transition hover:bg-violet-500/25"
              >
                Giriş Yap
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
