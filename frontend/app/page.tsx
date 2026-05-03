import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

const terminalLines = [
  '$ koschei init game-factory',
  '✓ Brief generated: cyber-runner-idle',
  '✓ Unity build queued (android-release)',
  '✓ Signing + upload on progress...',
  '→ Play Console status: draft ready'
] as const;

export default function HomePage() {
  return (
    <main className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink p-6 md:p-10">
      <div className="noise-overlay pointer-events-none absolute inset-0 opacity-30" />
      <div className="grid-overlay pointer-events-none absolute inset-0 opacity-40" />
      <div className="scanline-overlay pointer-events-none absolute inset-0 opacity-20" />

      <div className="relative z-10 space-y-10">
        <PublicSiteNav />

        <section className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-neon/40 bg-neon/10 px-3 py-1 font-mono text-xs tracking-[0.22em] text-neon">
              KOSCHEI.AI
            </span>

            <div className="space-y-4">
              <h1 className="font-mono text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
                Oyununu Üret.
                <br />
                Dünyaya Yayınla.
              </h1>
              <p className="max-w-xl text-base text-white/70 md:text-lg">
                Prompt yaz. Brief al. Build et. Play Store&apos;da yayınla.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/game-factory"
                className="rounded-xl bg-neon px-5 py-2.5 text-sm font-bold text-ink transition hover:bg-neon/90 hover:shadow-[0_0_32px_rgba(102,227,255,0.45)]"
              >
                Game Factory →
              </Link>
              <Link
                href="/about"
                className="rounded-xl border border-white/20 px-5 py-2.5 text-sm transition hover:border-neon/50 hover:text-neon"
              >
                Nasıl Çalışır?
              </Link>
            </div>
          </div>

          <aside className="relative rounded-none border border-neon/30 bg-[#070a18]/90 p-5 shadow-[0_0_40px_rgba(182,146,255,0.18)]">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-neon">Build Terminal</p>
              <span className="rounded-full bg-lilac/20 px-2.5 py-0.5 text-xs font-semibold text-lilac">Live</span>
            </div>
            <div className="space-y-2 font-mono text-sm text-white/80">
              {terminalLines.map((line, idx) => (
                <p
                  key={line}
                  className="terminal-line"
                  style={{ animationDelay: `${idx * 120}ms` }}
                >
                  {line}
                </p>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
