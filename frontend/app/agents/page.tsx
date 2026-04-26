import Link from 'next/link';
import { Nav } from '@/components/nav';
import { PublicSiteNav } from '@/components/public-site-nav';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function AgentsPage() {
  const supabase = await createSupabaseReadonlyServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <main className="panel space-y-8">
      {user ? <Nav /> : <PublicSiteNav />}
      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Koschei Agent Library</p>
        <h1 className="text-4xl font-bold">Koschei Ajanları</h1>
        <p className="max-w-3xl text-white/75">İçerik, oyun, yayın ve iş süreçlerini tek panelden AI ajanlarıyla planla, üret ve yönet.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {FINAL_AGENT_CARDS.map((agent) => (
          <article key={agent.slug} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">{agent.name}</h2>
              <span className="rounded-md border border-neon/30 bg-neon/10 px-2 py-1 text-xs text-neon">Aktif</span>
            </div>
            <p className="mt-2 text-sm text-white/75">{agent.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={agent.href} className="rounded-lg border border-white/25 px-3 py-2 text-xs hover:border-neon">
                Ajanı aç
              </Link>
              <Link href={agent.href} className="rounded-lg border border-neon/40 px-3 py-2 text-xs text-neon hover:bg-neon/10">
                Çalıştır
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
