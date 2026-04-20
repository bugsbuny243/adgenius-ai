import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getAgentBadge(slug: string): string {
  if (slug === 'arastirma') return 'Araştırma destekli mod';
  if (slug === 'yazilim' || slug === 'rapor') return 'Derin analiz modu';
  return 'Hızlı mod';
}

export default async function AgentsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin');

  const { data: agents, error } = await supabase
    .from('agent_types')
    .select('id, slug, name, description, is_active')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Agent listesi yüklenemedi: ${error.message}`);
  }

  return (
    <main>
      <Nav />
      <section className="panel">
        <h2 className="mb-4 text-2xl font-semibold">Agentlar</h2>
        <p className="mb-4 text-sm text-white/70">Hızlı mod, derin analiz modu ve araştırma destekli mod etiketleri ile çalışma tipine uygun agent seçin.</p>
        {agents && agents.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <div key={agent.id} className="rounded-xl border border-white/10 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{agent.name}</p>
                    <p className="mt-1 text-sm text-white/80">{agent.description || 'Açıklama mevcut değil.'}</p>
                  </div>
                  <span className="rounded-md border border-neon/30 bg-neon/10 px-2 py-1 text-xs uppercase text-neon">
                    {getAgentBadge(agent.slug)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="rounded-md border border-white/10 px-2 py-1 text-xs uppercase text-white/70">
                    {agent.is_active ? 'aktif' : 'pasif'}
                  </span>
                  <Link href={`/agents/${agent.id}`} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:border-neon">
                    Çalıştır
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/70">Henüz agent tanımı bulunmuyor.</p>
        )}
      </section>
    </main>
  );
}
