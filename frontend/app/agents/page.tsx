import Link from 'next/link';
import { Nav } from '@/components/nav';
import { PublicSiteNav } from '@/components/public-site-nav';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const REQUIREMENT_BY_SLUG: Record<string, string> = {
  business_general: 'Kullanıcı onayı gerekir',
  blogger: 'Hesap bağlantısı gerekebilir',
  youtube_agent: 'YouTube bağlantısı önerilir',
  game_factory: 'Build kredisi gerekebilir'
};

function getRequirement(slug: string): string {
  return REQUIREMENT_BY_SLUG[slug] ?? 'Kullanıcı onayı gerekir';
}

function getStatusLabel(slug: string, isActive: boolean): 'Aktif' | 'Kurulum gerekli' | 'Yakında' {
  if (!isActive) return 'Yakında';
  if (slug === 'blogger' || slug === 'youtube_agent') {
    return 'Kurulum gerekli';
  }
  return 'Aktif';
}

export default async function AgentsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: agents } = await supabase
    .from('agent_types')
    .select('id, slug, name, description, is_active')
    .order('name', { ascending: true });

  const agentList = agents ?? [];
  const hasAgents = agentList.length > 0;

  return (
    <main className="panel space-y-8">
      {user ? <Nav /> : <PublicSiteNav />}
      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Koschei Agent Library</p>
        <h1 className="text-4xl font-bold">Koschei Ajanları</h1>
        <p className="max-w-3xl text-white/75">
          İçerik, oyun, yayın ve iş süreçlerini tek panelden AI ajanlarıyla planla, üret ve yönet.
        </p>
      </section>

      {!hasAgents ? (
        <section className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/80">Henüz ajan tanımı bulunamadı.</section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agentList.map((agent) => {
            const isGameFactory = agent.slug === 'game_factory';
            const statusLabel = getStatusLabel(agent.slug, agent.is_active);
            const href = isGameFactory ? '/game-factory' : `/agents/${agent.id}`;

            return (
              <article key={agent.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold">{agent.name}</h2>
                  <span
                    className={`rounded-md border px-2 py-1 text-xs ${
                      statusLabel === 'Aktif'
                        ? 'border-neon/30 bg-neon/10 text-neon'
                        : statusLabel === 'Kurulum gerekli'
                          ? 'border-amber-300/40 bg-amber-500/10 text-amber-100'
                          : 'border-white/30 bg-white/5 text-white/70'
                    }`}
                  >
                    {statusLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/75">{agent.description || 'Bu ajan için açıklama eklenmemiş.'}</p>
                <p className="mt-3 text-xs text-white/65">Gereksinim: {getRequirement(agent.slug)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {agent.is_active ? (
                    <>
                      <Link href={href} className="rounded-lg border border-white/25 px-3 py-2 text-xs hover:border-neon">
                        Ajanı aç
                      </Link>
                      <Link href={href} className="rounded-lg border border-neon/40 px-3 py-2 text-xs text-neon hover:bg-neon/10">
                        Çalıştır
                      </Link>
                    </>
                  ) : (
                    <span className="rounded-lg border border-white/25 px-3 py-2 text-xs text-white/70">Yakında</span>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
