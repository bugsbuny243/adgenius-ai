'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { SkeletonList } from '@/components/ui/skeleton';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { resolveWorkspaceContext } from '@/lib/workspace';

type AgentRow = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  description: string | null;
};

type FavoriteAgentRow = {
  agent_type_id: string;
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAgents() {
      setLoading(true);
      const supabase = createBrowserSupabase();

      try {
        const { workspace, user } = await resolveWorkspaceContext(supabase);
        setWorkspaceId(workspace.id);
        setUserId(user.id);

        const [{ data: agentData, error: loadError }, { data: favoritesData, error: favoritesError }] = await Promise.all([
          supabase.from('agent_types').select('id, slug, name, icon, description').eq('is_active', true).order('name', { ascending: true }),
          supabase.from('favorite_agents').select('agent_type_id').eq('workspace_id', workspace.id).eq('user_id', user.id),
        ]);

        if (loadError || favoritesError) {
          setError(loadError?.message ?? favoritesError?.message ?? 'Agent listesi yüklenemedi.');
          return;
        }

        setAgents((agentData ?? []) as AgentRow[]);
        setFavoriteIds(((favoritesData ?? []) as FavoriteAgentRow[]).map((item) => item.agent_type_id));
      } catch (loadErr) {
        setError(loadErr instanceof Error ? loadErr.message : 'Agent listesi yüklenemedi.');
      } finally {
        setLoading(false);
      }
    }

    void loadAgents();
  }, []);

  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  async function toggleFavorite(agentTypeId: string) {
    if (!workspaceId || !userId) {
      return;
    }

    const supabase = createBrowserSupabase();
    const isFavorited = favoriteIdSet.has(agentTypeId);

    if (isFavorited) {
      const { error: deleteError } = await supabase
        .from('favorite_agents')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .eq('agent_type_id', agentTypeId);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      const next = favoriteIds.filter((id) => id !== agentTypeId);
      setFavoriteIds(next);
      await supabase
        .from('profiles')
        .update({ favorite_agent_count: next.length })
        .eq('id', userId);
      return;
    }

    const { error: insertError } = await supabase.from('favorite_agents').insert({
      workspace_id: workspaceId,
      user_id: userId,
      agent_type_id: agentTypeId,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    const next = [...favoriteIds, agentTypeId];
    setFavoriteIds(next);
    await supabase
      .from('profiles')
      .update({ favorite_agent_count: next.length })
      .eq('id', userId);
  }

  const favoriteAgents = agents.filter((agent) => favoriteIdSet.has(agent.id));

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Agent kataloğu</h1>
        <p className="text-zinc-300">İhtiyacına uygun agentı seç, görevi gir ve saniyeler içinde sonuç al.</p>
      </div>

      {error ? <p className="rounded-lg border border-rose-700/40 bg-rose-900/20 p-3 text-sm text-rose-200">{error}</p> : null}

      {loading ? <SkeletonList items={4} /> : null}

      {!loading && favoriteAgents.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Favori Agentlar</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {favoriteAgents.map((agent) => (
              <article key={agent.id} className="rounded-2xl border border-amber-500/40 bg-zinc-900/70 p-5">
                <p className="text-2xl">{agent.icon ?? '🤖'}</p>
                <h3 className="mt-2 text-lg font-medium">{agent.name}</h3>
                <p className="mt-2 text-sm text-zinc-300">{agent.description ?? 'Bu agent favori listenizde.'}</p>
                <Link href={`/agents/${agent.slug}`} className="mt-4 inline-flex rounded-lg bg-indigo-500 px-3 py-2 text-sm text-white hover:bg-indigo-400">
                  Hızlı Aç
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => {
          const isFavorited = favoriteIdSet.has(agent.id);
          return (
            <article key={agent.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-2xl">{agent.icon ?? '🤖'}</p>
                <button
                  type="button"
                  onClick={() => {
                    void toggleFavorite(agent.id);
                  }}
                  className={`rounded-lg border px-2 py-1 text-xs ${isFavorited ? 'border-amber-400 text-amber-300' : 'border-zinc-700 text-zinc-400'}`}
                >
                  {isFavorited ? '★ Favoride' : '☆ Favorile'}
                </button>
              </div>
              <h2 className="mt-2 text-lg font-medium">{agent.name}</h2>
              <p className="mt-2 text-sm text-zinc-300">{agent.description}</p>
              <Link href={`/agents/${agent.slug}`} className="mt-4 inline-flex rounded-lg bg-indigo-500 px-3 py-2 text-sm text-white hover:bg-indigo-400">
                Agentı Aç
              </Link>
            </article>
          );
        })}
      </div>

      {!loading && agents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4 text-sm text-zinc-300">
          Henüz aktif agent bulunmuyor. Birkaç dakika sonra tekrar kontrol edin.
        </p>
      ) : null}
    </section>
  );
}
