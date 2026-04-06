'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { SkeletonList } from '@/components/ui/skeleton';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { resolveWorkspaceContext } from '@/lib/workspace';

type Activity = {
  id: string;
  event_type: string;
  created_at: string;
  metadata: Record<string, string> | null;
};

type DashboardData = {
  memberCount: number;
  projectCount: number;
  runCount: number;
  personalRunCount: number;
  activities: Activity[];
  projects: Array<{ id: string; name: string; created_at: string }>;
};

const activityMap: Record<string, string> = {
  run_created: 'Run oluşturuldu',
  output_saved: 'Çıktı kaydedildi',
  output_deleted: 'Çıktı silindi',
  project_created: 'Proje oluşturuldu',
  project_item_added: 'Proje öğesi eklendi',
  subscription_changed: 'Abonelik değişti',
};

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

        const [members, projects, runs, personalRuns, activities] = await Promise.all([
          supabase.from('workspace_members').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
          supabase.from('projects').select('id, name, created_at', { count: 'exact' }).eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(6),
          supabase.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
          supabase.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id).eq('user_id', user.id),
          supabase.from('activity_logs').select('id, event_type, created_at, metadata').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(15),
        ]);

        const firstError = members.error ?? projects.error ?? runs.error ?? personalRuns.error ?? activities.error;
        if (firstError) {
          setError(firstError.message);
          return;
        }

        setData({
          memberCount: members.count ?? 0,
          projectCount: projects.count ?? 0,
          runCount: runs.count ?? 0,
          personalRunCount: personalRuns.count ?? 0,
          activities: (activities.data ?? []) as unknown as Activity[],
          projects: (projects.data ?? []) as Array<{ id: string; name: string; created_at: string }>,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Dashboard verileri yüklenemedi.');
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Platform Dashboard</h1>
        <p className="text-zinc-300">Kişisel ve workspace görünürlüğü tek panelde.</p>
      </header>

      {error ? <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <p className="text-xs text-zinc-400">Kişisel run</p>
          <p className="text-2xl font-semibold">{data?.personalRunCount ?? 0}</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <p className="text-xs text-zinc-400">Workspace run</p>
          <p className="text-2xl font-semibold">{data?.runCount ?? 0}</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <p className="text-xs text-zinc-400">Ekip üyesi</p>
          <p className="text-2xl font-semibold">{data?.memberCount ?? 0}</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <p className="text-xs text-zinc-400">Proje</p>
          <p className="text-2xl font-semibold">{data?.projectCount ?? 0}</p>
        </article>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Ekip Projeleri</h2>
            <Link href="/projects" className="text-sm text-indigo-300 hover:text-indigo-200">
              Tümünü gör
            </Link>
          </div>

          {loading ? <SkeletonList items={4} /> : null}

          {(data?.projects ?? []).map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="block rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-sm font-medium">{project.name}</p>
              <p className="text-xs text-zinc-500">{new Date(project.created_at).toLocaleString('tr-TR')}</p>
            </Link>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Son aktiviteler</h2>
          {(data?.activities ?? []).map((activity) => (
            <article key={activity.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-sm text-zinc-100">{activityMap[activity.event_type] ?? activity.event_type}</p>
              <p className="mt-1 text-xs text-zinc-500">{new Date(activity.created_at).toLocaleString('tr-TR')}</p>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
