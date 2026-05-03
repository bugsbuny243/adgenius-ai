import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

const features = [
  { title: '🎮 AI Brief', description: 'Oyun fikrine göre otomatik brief oluşturur.' },
  { title: '🔨 Unity Build', description: 'GitHub’daki Unity projesini otomatik build eder.' },
  { title: '🚀 Play Store Yayın', description: 'Build’i doğrudan Google Play’e gönderir.' }
] as const;

export default function HomePage() {
  return (
    <main className="panel space-y-10">
      <PublicSiteNav />

      <section className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-violet-300">Koschei AI • Game Factory</p>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">AI Factory: Oyununu Üretime Al</h1>
        <p className="max-w-3xl text-zinc-400">Oyun fikrinden Google Play&apos;e tek panelde, ultra hızlı bir üretim hattı.</p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/game-factory" className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 font-semibold text-white transition hover:scale-105">
            Game Factory&apos;yi Dene
          </Link>
          <Link href="/signin" className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-zinc-200 transition hover:scale-105 hover:border-violet-400/60">
            Giriş Yap
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Özellikler</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {features.map((item) => (
            <article key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
              <h3 className="text-lg font-semibold text-zinc-100">{item.title}</h3>
              <p className="mt-2 text-sm text-zinc-400">{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
