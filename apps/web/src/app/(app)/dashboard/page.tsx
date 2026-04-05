'use client';

import { useEffect, useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';
import { getMonthKey } from '@/lib/usage';
import { bootstrapWorkspaceForUser, loadCurrentUser } from '@/lib/workspace';

type DashboardStats = {
  monthlyRuns: number;
  savedCount: number;
  activeAgents: number;
  latestRuns: Array<{
    id: string;
    created_at: string;
    status: string;
    agent_types: { name: string; slug: string } | null;
  }>;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      const supabase = createBrowserSupabase();
      const user = await loadCurrentUser(supabase);

      if (!user) {
        setError('Oturum bulunamadı.');
        return;
      }

      const workspace = await bootstrapWorkspaceForUser(supabase, user);
      const monthKey = getMonthKey();

      const [{ data: usage }, { count: savedCount }, { count: activeAgents }, { data: latestRuns, error: latestRunsError }] =
        await Promise.all([
          supabase
            .from('usage_counters')
            .select('runs_count')
            .eq('workspace_id', workspace.id)
            .eq('month_key', monthKey)
            .maybeSingle(),
          supabase.from('saved_outputs').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
          supabase.from('agent_types').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase
            .from('agent_runs')
            .select('id, created_at, status, agent_types(name, slug)')
            .eq('workspace_id', workspace.id)
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

      if (latestRunsError) {
        setError(latestRunsError.message);
        return;
      }

      setStats({
        monthlyRuns: usage?.runs_count ?? 0,
        savedCount: savedCount ?? 0,
        activeAgents: activeAgents ?? 0,
        latestRuns: (latestRuns ?? []) as DashboardStats['latestRuns'],
      });
    }

    void loadDashboard();
  }, []);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-zinc-300">Koschei kullanım özetiniz ve son aktiviteleriniz.</p>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Bu Ay Çalıştırma</p>
          <p className="mt-2 text-2xl font-semibold text-white">{stats?.monthlyRuns ?? 0}</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Kaydedilen Çıktılar</p>
          <p className="mt-2 text-2xl font-semibold text-white">{stats?.savedCount ?? 0}</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Aktif Agent</p>
          <p className="mt-2 text-2xl font-semibold text-white">{stats?.activeAgents ?? 0}</p>
        </article>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Son Çalıştırmalar</h2>
        {(stats?.latestRuns ?? []).map((run) => (
          <article key={run.id} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-sm text-zinc-100">{run.agent_types?.name ?? run.agent_types?.slug ?? 'Agent'}</p>
            <p className="mt-1 text-xs text-zinc-400">
              {new Date(run.created_at).toLocaleString('tr-TR')} · {run.status}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
