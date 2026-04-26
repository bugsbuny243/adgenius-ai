import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

const agentLibrary = [
  { name: 'Game Agent', desc: 'Prompttan oyun üretim planı, build akışı ve teslim adımları çıkarır.', status: 'Aktif' },
  { name: 'YouTube Agent', desc: 'Video fikri, başlık, açıklama ve yayın planı oluşturur.', status: 'Aktif' },
  { name: 'Blogger Agent', desc: 'Blog içeriği, SEO başlığı ve yayın hazırlığı oluşturur.', status: 'Aktif' },
  { name: 'İşletme Agent', desc: 'Operasyon ve karar süreçleri için uygulanabilir planlar üretir.', status: 'Aktif' }
] as const;

export default function HomePage() {
  return (
    <main className="panel space-y-10">
      <PublicSiteNav />
      <section className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-6 md:p-8">
        <h1 className="text-4xl font-bold leading-tight md:text-5xl">Fikirlerini çalışan AI ajanlarına dönüştür.</h1>
        <div className="flex flex-wrap gap-3 pt-2"><Link href="/agents" className="rounded-xl bg-neon px-5 py-3 font-semibold text-ink">Ajanları keşfet</Link><Link href="/game-factory" className="rounded-xl border border-white/20 px-5 py-3 hover:border-neon">Game Agent’i incele</Link></div>
      </section>
      <section className="space-y-4"><h2 className="text-2xl font-semibold">Agent Library</h2><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{agentLibrary.map((agent) => <article key={agent.name} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between gap-2"><h3 className="text-base font-semibold">{agent.name}</h3><span className="rounded-md border border-neon/30 bg-neon/10 px-2 py-1 text-xs text-neon">{agent.status}</span></div><p className="mt-2 text-sm text-white/70">{agent.desc}</p></article>)}</div></section>
    </main>
  );
}
