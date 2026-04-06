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

type ScheduleRow = { id: string; title: string; next_run_at: string | null; frequency: string; is_active: boolean };

type WorkflowStats = { total: number; pendingApproval: number; completed: number };

type DashboardData = {
  activeAgents: AgentTypeRow[];
  latestRuns: LatestRunRow[];
  savedOutputs: SavedOutputRow[];
  activeTemplateCount: number;
  recentAutomations: { id: string; status: string; started_at: string; workflows: { title: string } | null }[];
  upcomingSchedules: ScheduleRow[];
  workflowStats: WorkflowStats;
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
          { count: templateCount, error: templateCountError },
          { data: recentAutomations, error: automationError },
          { data: upcomingSchedules, error: scheduleError },
          { count: wfTotal, error: wfTotalError },
          { count: wfPending, error: wfPendingError },
          { count: wfCompleted, error: wfCompletedError },
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
          supabase.from('templates').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id).eq('is_public', true),
          supabase
            .from('workflow_runs')
            .select('id, status, started_at, workflows(title)')
            .eq('workspace_id', workspace.id)
            .order('started_at', { ascending: false })
            .limit(6),
          supabase
            .from('schedules')
            .select('id, title, next_run_at, frequency, is_active')
            .eq('workspace_id', workspace.id)
            .eq('is_active', true)
            .order('next_run_at', { ascending: true })
            .limit(6),
          supabase.from('workflow_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
          supabase.from('workflow_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id).eq('status', 'pending_approval'),
          supabase.from('workflow_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id).eq('status', 'completed'),
        ]);

        const firstError =
          activeAgentsError ??
          latestRunsError ??
          savedOutputsError ??
          templateCountError ??
          automationError ??
          scheduleError ??
          wfTotalError ??
          wfPendingError ??
          wfCompletedError;

        if (firstError) {
          setError(firstError.message);
          return;
        }

        setData({
          activeAgents: (activeAgents ?? []) as AgentTypeRow[],
          latestRuns: (latestRuns ?? []) as unknown as LatestRunRow[],
          savedOutputs: (savedOutputs ?? []) as unknown as SavedOutputRow[],
          activeTemplateCount: templateCount ?? 0,
          recentAutomations: (recentAutomations ?? []) as unknown as DashboardData['recentAutomations'],
          upcomingSchedules: (upcomingSchedules ?? []) as ScheduleRow[],
          workflowStats: {
            total: wfTotal ?? 0,
            pendingApproval: wfPending ?? 0,
            completed: wfCompleted ?? 0,
          },
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
        <p className="text-zinc-300">Agent run, template ve workflow otomasyonlarını tek ekrandan yönet.</p>
      </header>

      {error ? <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <p className="text-xs text-zinc-400">Aktif template sayısı</p>
          <p className="mt-2 text-2xl font-semibold text-white">{data?.activeTemplateCount ?? 0}</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <p className="text-xs text-zinc-400">Workflow toplam run</p>
          <p className="mt-2 text-2xl font-semibold text-white">{data?.workflowStats.total ?? 0}</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <p className="text-xs text-zinc-400">Pending approval</p>
          <p className="mt-2 text-2xl font-semibold text-white">{data?.workflowStats.pendingApproval ?? 0}</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <p className="text-xs text-zinc-400">Completed workflow run</p>
          <p className="mt-2 text-2xl font-semibold text-white">{data?.workflowStats.completed ?? 0}</p>
        </article>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium text-white">Çalışmaya başla</h2>
            <p className="text-sm text-zinc-400">Tek run, template veya workflow başlatabilirsin.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={quickStartAgent ? `/workspace/${quickStartAgent.slug}` : '/agents'} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400">
              {quickStartAgent ? `${quickStartAgent.name} ile başla` : 'Agent seç'}
            </Link>
            <Link href="/templates" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500">Templates</Link>
            <Link href="/workflows" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500">Workflows</Link>
          </div>
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
            <Link key={agent.id} href={`/workspace/${agent.slug}`} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 transition hover:border-indigo-500/40">
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
          <h2 className="text-lg font-medium">Son otomasyonlar</h2>
          <div className="space-y-2">
            {(data?.recentAutomations ?? []).map((run) => (
              <article key={run.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="text-sm text-zinc-100">{(Array.isArray(run.workflows) ? run.workflows[0] : run.workflows)?.title ?? 'Workflow run'}</p>
                <p className="mt-1 text-xs text-zinc-400">Durum: {run.status}</p>
                <p className="mt-1 text-xs text-zinc-500">{new Date(run.started_at).toLocaleString('tr-TR')}</p>
              </article>
            ))}
            {!loading && (data?.recentAutomations.length ?? 0) === 0 ? <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4 text-sm text-zinc-300">Henüz otomasyon çalışmamış.</p> : null}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Yaklaşan scheduled run&apos;lar</h2>
          <div className="space-y-2">
            {(data?.upcomingSchedules ?? []).map((schedule) => (
              <article key={schedule.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="line-clamp-1 text-sm font-medium text-zinc-100">{schedule.title}</p>
                <p className="mt-1 text-xs text-zinc-400">{schedule.frequency}</p>
                <p className="mt-1 text-xs text-zinc-500">{schedule.next_run_at ? new Date(schedule.next_run_at).toLocaleString('tr-TR') : 'Planlanmadı'}</p>
              </article>
            ))}
            {!loading && (data?.upcomingSchedules.length ?? 0) === 0 ? <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4 text-sm text-zinc-300">Yaklaşan schedule yok.</p> : null}
          </div>
        </section>
      </div>
    </section>
  );
}
