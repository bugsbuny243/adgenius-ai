'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { SkeletonList } from '@/components/ui/skeleton';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { resolveWorkspaceContext } from '@/lib/workspace';

type AgentTypeRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
};

type AgentTypeRelation = { name: string; slug: string };

type LatestRunRow = {
  id: string;
  created_at: string;
  status: string;
  user_input: string;
  agent_types: AgentTypeRelation | AgentTypeRelation[] | null;
};

type SavedOutputRow = {
  id: string;
  title: string;
  created_at: string;
  agent_runs: {
    agent_types: AgentTypeRelation | AgentTypeRelation[] | null;
  } | null;
};

type FavoriteAgentRow = {
  agent_types: AgentTypeRelation | AgentTypeRelation[] | null;
};

type ProfileStats = {
  first_run_at: string | null;
  last_run_at: string | null;
  total_runs: number;
  total_saved_outputs: number;
  favorite_agent_count: number;
};

type DashboardData = {
  activeAgents: AgentTypeRow[];
  latestRuns: LatestRunRow[];
  savedOutputs: SavedOutputRow[];
  favoriteAgents: FavoriteAgentRow[];
  profile: ProfileStats | null;
};

function pickAgentType(relation: AgentTypeRelation | AgentTypeRelation[] | null | undefined) {
  if (!relation) {
    return null;
  }

  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);

        const supabase = createBrowserSupabase();
        const { workspace, user } = await resolveWorkspaceContext(supabase);

        const [
          { data: activeAgents, error: activeAgentsError },
          { data: latestRuns, error: latestRunsError },
          { data: savedOutputs, error: savedOutputsError },
          { data: favoriteAgents, error: favoriteAgentsError },
          { data: profile, error: profileError },
        ] = await Promise.all([
          supabase.from('agent_types').select('id, slug, name, description, icon').eq('is_active', true).order('name', { ascending: true }),
          supabase
            .from('agent_runs')
            .select('id, created_at, status, user_input, agent_types(name, slug)')
            .eq('workspace_id', workspace.id)
            .order('created_at', { ascending: false })
            .limit(8),
          supabase
            .from('saved_outputs')
            .select('id, title, created_at, agent_runs(agent_types(name, slug))')
            .eq('workspace_id', workspace.id)
            .order('created_at', { ascending: false })
            .limit(8),
          supabase
            .from('favorite_agents')
            .select('agent_types(name, slug)')
            .eq('workspace_id', workspace.id)
            .eq('user_id', user.id)
            .limit(6),
          supabase
            .from('profiles')
            .select('first_run_at, last_run_at, total_runs, total_saved_outputs, favorite_agent_count')
            .eq('id', user.id)
            .maybeSingle(),
        ]);

        const firstError = activeAgentsError ?? latestRunsError ?? savedOutputsError ?? favoriteAgentsError ?? profileError;

        if (firstError) {
          setError(firstError.message);
          return;
        }

        setData({
          activeAgents: (activeAgents ?? []) as AgentTypeRow[],
          latestRuns: (latestRuns ?? []) as unknown as LatestRunRow[],
          savedOutputs: (savedOutputs ?? []) as unknown as SavedOutputRow[],
          favoriteAgents: (favoriteAgents ?? []) as unknown as FavoriteAgentRow[],
          profile: (profile as ProfileStats | null) ?? null,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Dashboard verileri yüklenemedi.');
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  const quickStartAgent = useMemo(() => data?.activeAgents[0] ?? null, [data?.activeAgents]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Hızlı Başlat</h1>
        <p className="text-zinc-300">Bir agent seç, görevi çalıştır ve çıktıyı doğrudan çalışma alanında düzenle.</p>
      </header>

      {error ? <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}

      <section className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Toplam run', String(data?.profile?.total_runs ?? 0)],
          ['Kayıtlı çıktı', String(data?.profile?.total_saved_outputs ?? 0)],
          ['Favori agent', String(data?.profile?.favorite_agent_count ?? 0)],
          ['İlk run', data?.profile?.first_run_at ? new Date(data.profile.first_run_at).toLocaleDateString('tr-TR') : '-'],
          ['Son run', data?.profile?.last_run_at ? new Date(data.profile.last_run_at).toLocaleDateString('tr-TR') : '-'],
        ].map(([label, value]) => (
          <article key={label} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs uppercase text-zinc-400">{label}</p>
            <p className="mt-1 text-lg font-medium text-zinc-100">{value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium text-white">Çalışmaya başla</h2>
            <p className="text-sm text-zinc-400">Sonraki adım için doğrudan agent workspace&apos;ine geç.</p>
          </div>
          <Link href={quickStartAgent ? `/workspace/${quickStartAgent.slug}` : '/agents'} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400">
            {quickStartAgent ? `${quickStartAgent.name} ile başla` : 'Agent seç'}
          </Link>
        </div>
      </section>

      {loading ? <SkeletonList items={4} /> : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Favori Agentlar</h2>
          <Link href="/agents" className="text-sm text-indigo-300 hover:text-indigo-200">
            Düzenle
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(data?.favoriteAgents ?? []).map((favorite, index) => {
            const agent = pickAgentType(favorite.agent_types);
            return (
              <Link key={`${agent?.slug ?? 'favorite'}-${index}`} href={agent?.slug ? `/workspace/${agent.slug}` : '/agents'} className="rounded-xl border border-amber-500/40 bg-zinc-950/60 p-4 transition hover:border-amber-400/60">
                <p className="text-sm font-medium text-zinc-100">★ {agent?.name ?? 'Favori agent'}</p>
                <p className="mt-1 text-xs text-zinc-400">Hızlı erişim için sabitlendi</p>
              </Link>
            );
          })}
        </div>
        {!loading && (data?.favoriteAgents.length ?? 0) === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4 text-sm text-zinc-300">Henüz favori agent yok. Agent kataloğundan yıldızlayabilirsiniz.</p>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Son runlar</h2>
          <div className="space-y-2">
            {(data?.latestRuns ?? []).map((run) => (
              <article key={run.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-sm text-zinc-100">{pickAgentType(run.agent_types)?.name ?? 'Agent'}</p>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{run.user_input}</p>
                <p className="mt-1 text-xs text-zinc-500">{new Date(run.created_at).toLocaleString('tr-TR')}</p>
              </article>
            ))}
            {!loading && (data?.latestRuns.length ?? 0) === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4 text-sm text-zinc-300">Henüz run yok. Agent katalogundan ilk run&apos;ı başlat.</p>
            ) : null}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Kayıtlı Çıktılar</h2>
          <div className="space-y-2">
            {(data?.savedOutputs ?? []).map((output) => (
              <article key={output.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="line-clamp-1 text-sm font-medium text-zinc-100">{output.title || 'Başlıksız çıktı'}</p>
                <p className="mt-1 text-xs text-zinc-400">{pickAgentType(output.agent_runs?.agent_types)?.name ?? pickAgentType(output.agent_runs?.agent_types)?.slug ?? 'Agent'}</p>
                <p className="mt-1 text-xs text-zinc-500">{new Date(output.created_at).toLocaleString('tr-TR')}</p>
              </article>
            ))}
            {!loading && (data?.savedOutputs.length ?? 0) === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4 text-sm text-zinc-300">Henüz kayıtlı çıktı yok. Bir run tamamlayıp “Kaydet” ile başlayın.</p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
