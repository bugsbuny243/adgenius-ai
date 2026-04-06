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
  agent_runs:
    | {
        agent_types: AgentTypeRelation | AgentTypeRelation[] | null;
      }
    | null;
};

type DashboardData = {
  activeAgents: AgentTypeRow[];
  latestRuns: LatestRunRow[];
  savedOutputs: SavedOutputRow[];
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
        const { workspace } = await resolveWorkspaceContext(supabase);

        const [
          { data: activeAgents, error: activeAgentsError },
          { data: latestRuns, error: latestRunsError },
          { data: savedOutputs, error: savedOutputsError },
        ] = await Promise.all([
          supabase
            .from('agent_types')
            .select('id, slug, name, description, icon')
            .eq('is_active', true)
            .order('name', { ascending: true }),
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
        ]);

        const firstError = activeAgentsError ?? latestRunsError ?? savedOutputsError;

        if (firstError) {
          setError(firstError.message);
          return;
        }

        setData({
          activeAgents: (activeAgents ?? []) as AgentTypeRow[],
          latestRuns: (latestRuns ?? []) as unknown as LatestRunRow[],
          savedOutputs: (savedOutputs ?? []) as unknown as SavedOutputRow[],
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

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium text-white">Çalışmaya başla</h2>
            <p className="text-sm text-zinc-400">Sonraki adım için doğrudan agent workspace&apos;ine geç.</p>
          </div>
          <Link
            href={quickStartAgent ? `/workspace/${quickStartAgent.slug}` : '/agents'}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          >
            {quickStartAgent ? `${quickStartAgent.name} ile başla` : 'Agent seç'}
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Agent Kartları</h2>
          <Link href="/agents" className="text-sm text-indigo-300 hover:text-indigo-200">
            Tümünü gör
          </Link>
        </div>

        {loading ? <SkeletonList items={4} /> : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(data?.activeAgents ?? []).map((agent) => (
            <Link
              key={agent.id}
              href={`/workspace/${agent.slug}`}
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 transition hover:border-indigo-500/40"
            >
              <p className="text-sm font-medium text-zinc-100">
                <span className="mr-2">{agent.icon ?? '🤖'}</span>
                {agent.name}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{agent.description ?? 'Bu agent ile içerik üretim görevlerini başlatın.'}</p>
            </Link>
          ))}
        </div>
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
              <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4 text-sm text-zinc-300">Henüz run yok.</p>
            ) : null}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Kayıtlı Çıktılar</h2>
          <div className="space-y-2">
            {(data?.savedOutputs ?? []).map((output) => (
              <article key={output.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="line-clamp-1 text-sm font-medium text-zinc-100">{output.title || 'Başlıksız çıktı'}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {pickAgentType(output.agent_runs?.agent_types)?.name ?? pickAgentType(output.agent_runs?.agent_types)?.slug ?? 'Agent'}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{new Date(output.created_at).toLocaleString('tr-TR')}</p>
              </article>
            ))}
            {!loading && (data?.savedOutputs.length ?? 0) === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4 text-sm text-zinc-300">Henüz kayıtlı çıktı yok.</p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
