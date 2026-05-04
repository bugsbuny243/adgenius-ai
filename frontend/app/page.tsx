<<<<<<< codex/rewrite-frontend-files-with-tailwind-css
import { ArrowRight, Sparkles } from 'lucide-react';
=======
'use client';

>>>>>>> main
import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

export default function HomePage() {
  return (
<<<<<<< codex/rewrite-frontend-files-with-tailwind-css
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
=======
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(6,182,212,0.18),transparent_38%),radial-gradient(circle_at_80%_10%,rgba(139,92,246,0.22),transparent_32%),radial-gradient(circle_at_50%_80%,rgba(6,182,212,0.1),transparent_42%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:36px_36px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-6">
        <PublicSiteNav />

        <section className="grid min-h-[82vh] items-center gap-8 py-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-8">
            <span className="inline-flex rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.26em] text-cyan-200">
              Autonomous AI Ops
            </span>
            <h1 className="text-5xl font-black leading-tight tracking-tight md:text-7xl">
              KOSCHEI V5:
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-transparent">
                Otonom Oyun Fabrikası
              </span>
            </h1>
            <p className="max-w-2xl text-lg text-slate-300">
              Cyberpunk hızında, Apple seviyesinde zarafetle. Brief&apos;ten build&apos;e kadar tüm üretim hattını tek bir premium komuta katmanından yönetin.
            </p>
            <div>
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-xl border border-cyan-300/50 bg-gradient-to-r from-cyan-500 to-violet-500 px-7 py-3 text-sm font-semibold text-white shadow-[0_0_38px_-8px_rgba(6,182,212,0.85)] transition hover:scale-[1.02] hover:shadow-[0_0_50px_-10px_rgba(139,92,246,0.9)]"
              >
                Enter Command Dashboard
              </Link>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-xl border border-white/10">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Neural Build Telemetry</p>
              <p className="mt-3 text-sm text-slate-300">Railway orchestration online · 70B inference responding · deploy channels synchronized.</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-xl border border-white/10">
              <p className="text-xs uppercase tracking-[0.22em] text-violet-300">Quantum Pipeline</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>✓ Brief synthesis ready</li>
                <li>✓ Asset pass optimized</li>
                <li>→ Store package staging</li>
              </ul>
            </div>
          </aside>
>>>>>>> main
        </section>
      </div>
    </main>
  );
}
