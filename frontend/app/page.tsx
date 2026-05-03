import { ArrowRight, Sparkles, Chrome } from 'lucide-react';
import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

const terminalLines = [
  '$ koschei deploy --target=android',
  '✓ AI brief synthesized in 2.1s',
  '✓ Unity cloud build started',
  '✓ Assets optimized + signed',
  '→ Play Console package staged'
] as const;

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-zinc-950 to-zinc-950" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:14px_24px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:px-8">
        <PublicSiteNav />

        <section className="mt-10 grid items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-violet-300">Premium AI Shipping</span>
            <h1 className="bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-5xl font-semibold tracking-tight text-transparent md:text-7xl">From Prompt to
              <br />
              Production Build.
            </h1>
            <p className="max-w-2xl text-zinc-500">Koschei is a cyber-grade SaaS control room for creating, building, and shipping Unity games with autonomous AI workflows.</p>

            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-violet-500/50 hover:shadow-[0_0_20px_-5px_rgba(139,92,246,0.3)]">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/signin" className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-zinc-300 transition hover:border-white/20 hover:text-zinc-100 hover:bg-white/10">Sign in</Link>
            </div>

            <div className="mt-8 flex gap-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Supported Platforms</p>
                <div className="flex gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900/30 px-2.5 py-1 text-xs text-zinc-300">📱 Android</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900/30 px-2.5 py-1 text-xs text-zinc-300">🌐 WebGL</span>
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-white/5 bg-zinc-900/50 p-6 backdrop-blur-xl shadow-[0_0_30px_-10px_rgba(139,92,246,0.2)]">
            <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Build Telemetry</p>
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-300"><Sparkles className="h-3 w-3" />Live</span>
            </div>
            <div className="space-y-2 text-sm text-zinc-300">
              {terminalLines.map((line) => (
                <p key={line} className="rounded-lg border border-zinc-800 bg-black/30 px-3 py-2 font-mono">{line}</p>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
