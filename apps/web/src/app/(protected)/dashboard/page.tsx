'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

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

type UsageData = {
  plan_name: 'free' | 'starter' | 'pro';
  run_limit: number;
  usage_counters: { runs_count: number }[];
};

type DashboardData = {
  activeAgents: AgentTypeRow[];
  latestRuns: LatestRunRow[];
  savedOutputs: SavedOutputRow[];
  usage: UsageData | null;
};

function pickAgentType(relation: AgentTypeRelation | AgentTypeRelation[] | null | undefined) {
  if (!relation) {
    return null;
  }

  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function getMonthKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
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
        const workspaceId = workspace.id;
        const monthKey = getMonthKey();

        const [
          { data: activeAgents, error: activeAgentsError },
          { data: latestRuns, error: latestRunsError },
          { data: savedOutputs, error: savedOutputsError },
          { data: usage, error: usageError },
        ] = await Promise.all([
          supabase
            .from('agent_types')
            .select('id, slug, name, description, icon')
            .eq('is_active', true)
            .order('name', { ascending: true }),
          supabase
            .from('agent_runs')
            .select('id, created_at, status, user_input, agent_types(name, slug)')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('saved_outputs')
            .select('id, title, created_at, agent_runs(agent_types(name, slug))')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('subscriptions')
            .select('plan_name, run_limit, usage_counters!left(runs_count)')
            .eq('workspace_id', workspaceId)
            .eq('status', 'active')
            .eq('usage_counters.month_key', monthKey)
            .maybeSingle(),
        ]);

        const firstError = activeAgentsError ?? latestRunsError ?? savedOutputsError ?? usageError;

        if (firstError) {
          setError(firstError.message);
          return;
        }

        setData({
          activeAgents: (activeAgents ?? []) as AgentTypeRow[],
          latestRuns: (latestRuns ?? []) as unknown as LatestRunRow[],
          savedOutputs: (savedOutputs ?? []) as unknown as SavedOutputRow[],
          usage: (usage ?? null) as unknown as UsageData | null,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Dashboard verileri yüklenemedi.');
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  const latestRun = useMemo(() => data?.latestRuns[0] ?? null, [data?.latestRuns]);
  const continueAgentSlug = latestRun ? pickAgentType(latestRun.agent_types)?.slug : null;
  const runsCount = data?.usage?.usage_counters?.[0]?.runs_count ?? 0;
  const runLimit = data?.usage?.run_limit ?? 0;
  const remainingRuns = Math.max(0, runLimit - runsCount);
  const usagePercentage = runLimit > 0 ? Math.min(100, Math.round((runsCount / runLimit) * 100)) : 0;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-zinc-300">Çıktı üret, kaydet ve projeye aktar akışını buradan yönet.</p>
        </div>
        <Link href="/agents" className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400">
          Yeni İş Başlat
        </Link>
      </header>

      {error ? <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="text-sm uppercase tracking-wide text-zinc-400">Devam Et</h2>
          {continueAgentSlug ? (
            <>
              <p className="mt-2 text-sm text-zinc-200">En son kullandığın agente geri dön.</p>
              <Link href={`/agents/${continueAgentSlug}`} className="mt-3 inline-block rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-100 hover:border-zinc-500">
                {pickAgentType(latestRun?.agent_types)?.name ?? continueAgentSlug} ile devam et
              </Link>
            </>
          ) : (
            <p className="mt-2 text-sm text-zinc-300">Henüz bir run yok. Yeni iş başlat ile ilk çıktını üret.</p>
          )}
        </article>

        <article className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="text-sm uppercase tracking-wide text-zinc-400">Kullanım</h2>
          <p className="mt-2 text-sm text-zinc-300">Plan: {data?.usage?.plan_name?.toUpperCase() ?? '-'}</p>
          <p className="mt-1 text-sm text-zinc-300">
            Bu ay: {runsCount} / {runLimit} run
          </p>
          <p className="mt-1 text-sm text-zinc-300">Kalan: {remainingRuns}</p>
          <div className="mt-3 h-2 w-full rounded-full bg-zinc-800">
            <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${usagePercentage}%` }} />
          </div>
          {remainingRuns === 0 ? (
            <Link href="/pricing" className="mt-3 inline-block text-sm text-amber-300 hover:text-amber-200">
              Limit doldu. Plan yükselt.
            </Link>
          ) : null}
        </article>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Agent Kartları</h2>
          <Link href="/agents" className="text-sm text-indigo-300 hover:text-indigo-200">
            Tümünü gör
          </Link>
        </div>

        {loading ? <p className="text-sm text-zinc-400">Yükleniyor...</p> : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(data?.activeAgents ?? []).map((agent) => (
            <Link
              key={agent.id}
              href={`/agents/${agent.slug}`}
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
        {!loading && (data?.activeAgents.length ?? 0) === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4 text-sm text-zinc-300">Aktif agent bulunamadı.</p>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Son 5 run</h2>
            <Link href="/runs" className="text-sm text-indigo-300 hover:text-indigo-200">
              Tüm geçmiş
            </Link>
          </div>
          <div className="space-y-2">
            {(data?.latestRuns ?? []).map((run) => (
              <article key={run.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-sm text-zinc-100">{pickAgentType(run.agent_types)?.name ?? 'Agent'}</p>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{run.user_input}</p>
                <p className="mt-1 text-xs text-zinc-500">{new Date(run.created_at).toLocaleString('tr-TR')}</p>
              </article>
            ))}
            {!loading && (data?.latestRuns.length ?? 0) === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4 text-sm text-zinc-300">
                Run geçmişin boş. İlk işi başlatmak için “Yeni İş Başlat” butonunu kullan.
              </p>
            ) : null}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Son 5 saved output</h2>
            <Link href="/saved" className="text-sm text-indigo-300 hover:text-indigo-200">
              Kayıtlı çıktılar
            </Link>
          </div>
          <div className="space-y-2">
            {(data?.savedOutputs ?? []).map((output) => (
              <article key={output.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="line-clamp-1 text-sm font-medium text-zinc-100">{output.title || 'Başlıksız çıktı'}</p>
                <p className="mt-1 text-xs text-zinc-400">{pickAgentType(output.agent_runs?.agent_types)?.name ?? 'Agent'}</p>
                <p className="mt-1 text-xs text-zinc-500">{new Date(output.created_at).toLocaleString('tr-TR')}</p>
              </article>
            ))}
            {!loading && (data?.savedOutputs.length ?? 0) === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4 text-sm text-zinc-300">
                Kayıtlı çıktı yok. Agent ekranından çıktı üretip “Kaydet” ile burada listeleyebilirsin.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
