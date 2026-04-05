'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';
import { getMonthKey } from '@/lib/usage';
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

type SubscriptionRow = {
  plan_name: string;
  run_limit: number;
  status: string;
};

type UsageCounterRow = {
  runs_count: number;
};

type DashboardData = {
  monthKey: string;
  subscription: SubscriptionRow | null;
  usage: UsageCounterRow | null;
  activeAgents: AgentTypeRow[];
  latestRuns: LatestRunRow[];
  savedOutputs: SavedOutputRow[];
  savedCount: number;
};

function pickAgentType(relation: AgentTypeRelation | AgentTypeRelation[] | null | undefined) {
  if (!relation) {
    return null;
  }

  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function statusLabel(status: string) {
  switch (status) {
    case 'completed':
      return 'Tamamlandı';
    case 'failed':
      return 'Hata';
    case 'running':
      return 'Çalışıyor';
    case 'pending':
      return 'Sırada';
    default:
      return status;
  }
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
        const monthKey = getMonthKey();

        const [
          { data: subscription, error: subscriptionError },
          { data: usage, error: usageError },
          { data: activeAgents, error: activeAgentsError },
          { data: latestRuns, error: latestRunsError },
          { data: savedOutputs, count: savedCount, error: savedOutputsError },
        ] = await Promise.all([
          supabase
            .from('subscriptions')
            .select('plan_name, run_limit, status')
            .eq('workspace_id', workspace.id)
            .eq('status', 'active')
            .maybeSingle(),
          supabase
            .from('usage_counters')
            .select('runs_count')
            .eq('workspace_id', workspace.id)
            .eq('month_key', monthKey)
            .maybeSingle(),
          supabase
            .from('agent_types')
            .select('id, slug, name, description, icon')
            .eq('is_active', true)
            .order('name', { ascending: true }),
          supabase
            .from('agent_runs')
            .select('id, created_at, status, agent_types(name, slug)')
            .eq('workspace_id', workspace.id)
            .order('created_at', { ascending: false })
            .limit(8),
          supabase
            .from('saved_outputs')
            .select('id, title, created_at, agent_runs(agent_types(name, slug))', {
              count: 'exact',
            })
            .eq('workspace_id', workspace.id)
            .order('created_at', { ascending: false })
            .limit(6),
        ]);

        const firstError =
          subscriptionError ?? usageError ?? activeAgentsError ?? latestRunsError ?? savedOutputsError;

        if (firstError) {
          setError(firstError.message);
          return;
        }

        setData({
          monthKey,
          subscription: subscription as SubscriptionRow | null,
          usage: usage as UsageCounterRow | null,
          activeAgents: (activeAgents ?? []) as AgentTypeRow[],
          latestRuns: (latestRuns ?? []) as unknown as LatestRunRow[],
          savedOutputs: (savedOutputs ?? []) as unknown as SavedOutputRow[],
          savedCount: savedCount ?? 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Dashboard verileri yüklenemedi.');
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  const usageSummary = useMemo(() => {
    const runLimit = data?.subscription?.run_limit ?? 0;
    const used = data?.usage?.runs_count ?? 0;

    if (!runLimit) {
      return {
        runLimit: 0,
        used,
        remaining: 0,
      };
    }

    return {
      runLimit,
      used,
      remaining: Math.max(0, runLimit - used),
    };
  }, [data?.subscription?.run_limit, data?.usage?.runs_count]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-zinc-300">Agent tipleri, son run&apos;lar, saved output&apos;lar ve kullanım özeti tek ekranda.</p>
      </header>

      {error ? <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Plan</p>
          <p className="mt-2 text-lg font-semibold text-white">{data?.subscription?.plan_name ?? 'Plan yok'}</p>
          <p className="mt-1 text-xs text-zinc-400">Durum: {data?.subscription?.status ?? '—'}</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Aylık kullanım</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {usageSummary.used} / {usageSummary.runLimit || '—'}
          </p>
          <p className="mt-1 text-xs text-zinc-400">Ay: {data?.monthKey ?? getMonthKey()}</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Kalan run</p>
          <p className="mt-2 text-lg font-semibold text-white">{data?.subscription ? usageSummary.remaining : '—'}</p>
          <p className="mt-1 text-xs text-zinc-400">Limit yoksa gösterilmez</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Saved outputs</p>
          <p className="mt-2 text-lg font-semibold text-white">{data?.savedCount ?? 0}</p>
          <p className="mt-1 text-xs text-zinc-400">Toplam kayıt</p>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Agent type listesi</h2>
            <Link href="/agents" className="text-sm text-indigo-300 hover:text-indigo-200">
              Tümünü gör
            </Link>
          </div>

          {loading ? <p className="text-sm text-zinc-400">Yükleniyor…</p> : null}

          {!loading && (data?.activeAgents.length ?? 0) === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4 text-sm text-zinc-300">
              Aktif agent bulunamadı. Agent type tablosunda <strong>is_active=true</strong> kayıtları ekleyin.
            </p>
          ) : null}

          <div className="space-y-2">
            {(data?.activeAgents ?? []).slice(0, 8).map((agent) => (
              <article key={agent.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-sm font-medium text-zinc-100">
                  <span className="mr-2">{agent.icon ?? '🤖'}</span>
                  {agent.name}
                </p>
                <p className="mt-1 text-xs text-zinc-400">/{agent.slug}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Son run&apos;lar</h2>
            <Link href="/runs" className="text-sm text-indigo-300 hover:text-indigo-200">
              Run geçmişi
            </Link>
          </div>

          {!loading && (data?.latestRuns.length ?? 0) === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4 text-sm text-zinc-300">
              Henüz agent run yok. İlk run&apos;ı başlatınca burada listelenecek.
            </p>
          ) : null}

          <div className="space-y-2">
            {(data?.latestRuns ?? []).map((run) => (
              <article key={run.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-sm text-zinc-100">{pickAgentType(run.agent_types)?.name ?? pickAgentType(run.agent_types)?.slug ?? 'Agent'}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {new Date(run.created_at).toLocaleString('tr-TR')} · {statusLabel(run.status)}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Saved outputs özeti</h2>
          <Link href="/saved" className="text-sm text-indigo-300 hover:text-indigo-200">
            Saved sayfası
          </Link>
        </div>

        {!loading && (data?.savedOutputs.length ?? 0) === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4 text-sm text-zinc-300">
            Kayıtlı çıktı yok. Bir run sonucunu kaydedince burada özet görünecek.
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(data?.savedOutputs ?? []).map((output) => (
            <article key={output.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="line-clamp-1 text-sm font-medium text-zinc-100">{output.title || 'Başlıksız çıktı'}</p>
              <p className="mt-1 text-xs text-zinc-400">
                {pickAgentType(output.agent_runs?.agent_types)?.name ?? pickAgentType(output.agent_runs?.agent_types)?.slug ?? 'Agent'}
              </p>
              <p className="mt-2 text-xs text-zinc-500">{new Date(output.created_at).toLocaleString('tr-TR')}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
