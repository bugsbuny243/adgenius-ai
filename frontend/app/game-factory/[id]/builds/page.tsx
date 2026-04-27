import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';
import { StartBuildButton } from '@/app/game-factory/[id]/StartBuildButton';
import { BuildStatusPoller } from '@/app/game-factory/[id]/BuildStatusPoller';
import { RefreshBuildsButton } from '@/app/game-factory/[id]/RefreshBuildsButton';

export const dynamic = 'force-dynamic';

function badge(status: string) {
  if (status === 'queued') return 'bg-amber-500/20 text-amber-200';
  if (status === 'running' || status === 'claimed') return 'bg-blue-500/20 text-blue-200';
  if (status === 'success' || status === 'succeeded') return 'bg-emerald-500/20 text-emerald-200';
  if (status === 'failed' || status === 'cancelled') return 'bg-red-500/20 text-red-200';
  return 'bg-white/10 text-white';
}

function labelStatus(status: string | null) {
  if (status === 'succeeded') return 'successful';
  if (status === 'cancelled') return 'cancelled';
  return status ?? '-';
}

function durationLabel(start: string | null, end: string | null) {
  if (!start) return '-';
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  const seconds = Math.max(0, Math.floor((endTime - startTime) / 1000));
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes}dk ${rem}sn`;
}

export default async function GameFactoryBuildsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseReadonlyServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const [{ data: project }, { data: builds }] = await Promise.all([
    supabase
      .from('unity_game_projects')
      .select('id, app_name, package_name, approval_status')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.from('unity_build_jobs').select('*').eq('unity_game_project_id', id).order('created_at', { ascending: false })
  ]);

  if (!project) notFound();

  const activeJob = (builds ?? []).find((job) => job.status === 'queued' || job.status === 'claimed' || job.status === 'running');

  return (
    <main className="panel space-y-4">
      <BuildStatusPoller activeJobId={activeJob?.id ?? null} projectId={id} />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{project.app_name}</h1>
          <p className="text-sm text-white/70">{project.package_name}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/game-factory/${id}`} className="rounded-lg border border-white/20 px-3 py-2 text-sm">Projeye dön</Link>
          <RefreshBuildsButton projectId={id} />
        </div>
      </header>

      {project.approval_status === 'approved' ? <StartBuildButton projectId={id} /> : <p className="text-sm text-amber-300">Yeni build için proje onayı gerekiyor.</p>}

      <section className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-black/30 text-left">
            <tr>
              <th className="px-3 py-2">Build</th>
              <th className="px-3 py-2">Durum</th>
              <th className="px-3 py-2">Başlangıç</th>
              <th className="px-3 py-2">Süre</th>
              <th className="px-3 py-2">İndir</th>
              <th className="px-3 py-2">Logs</th>
            </tr>
          </thead>
          <tbody>
            {(builds ?? []).map((build, index) => {
              const unityBuildNumber = (build.metadata as { unityBuildNumber?: number } | null)?.unityBuildNumber;
              return (
                <tr key={build.id} className="border-t border-white/10">
                  <td className="px-3 py-2">{typeof unityBuildNumber === 'number' ? `#${unityBuildNumber}` : `#${(builds?.length ?? 0) - index}`}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-3 py-1 text-xs ${badge(build.status ?? '')}`}>{labelStatus(build.status)}</span></td>
                  <td className="px-3 py-2">{build.started_at ? new Date(build.started_at).toLocaleString('tr-TR') : '-'}</td>
                  <td className="px-3 py-2">{durationLabel(build.started_at, build.finished_at)}</td>
                  <td className="px-3 py-2">{build.artifact_url ? <a href={build.artifact_url} className="underline" target="_blank" rel="noreferrer">İndir</a> : '-'}</td>
                  <td className="px-3 py-2">{(build.logs_url ?? build.build_logs) ? <a href={build.logs_url ?? build.build_logs} className="underline" target="_blank" rel="noreferrer">Logs</a> : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
