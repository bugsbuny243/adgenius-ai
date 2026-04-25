import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

const marketingAgents = [
  { name: 'Koschei Blogger Agent', description: 'Blog planı, SEO başlıkları ve yayın hazırlığı üretir.' },
  { name: 'Koschei Channel Planner', description: 'Video serileri için içerik akışı ve takvim oluşturur.' },
  { name: 'Koschei Game Factory', description: 'Oyun fikrini üretim planına dönüştürür ve süreç adımlarını toplar.' }
] as const;

export default function AgentLibraryPage() {
  return (
    <main className="panel space-y-8">
      <PublicSiteNav />
      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Public Agent Library</p>
        <h1 className="text-4xl font-bold">Koschei Agent Library</h1>
        <p className="max-w-3xl text-white/75">Bu sayfa ajan kütüphanesinin genel görünümünü içerir. Çalışma alanınızda ajanları kullanmak için uygulamaya giriş yapın.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {marketingAgents.map((agent) => (
          <article key={agent.name} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <h2 className="text-lg font-semibold">{agent.name}</h2>
            <p className="mt-2 text-sm text-white/75">{agent.description}</p>
          </article>
        ))}
      </section>

      <div>
        <Link href="/signin" className="rounded-lg border border-neon/40 px-3 py-2 text-sm text-neon hover:bg-neon/10">
          Giriş yap ve ajanları aç
        </Link>
      </div>
    </main>
  );
}
