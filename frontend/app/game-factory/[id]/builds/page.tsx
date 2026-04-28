import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { StartBuildButton } from '../StartBuildButton';
import { BuildStatusPoller } from '../BuildStatusPoller';

export const dynamic = 'force-dynamic';

function statusBadge(status: string) {
  const map: Record<string, string> = {
    queued: 'bg-amber-500/20 text-amber-300',
    running: 'bg-blue-500/20 text-blue-300',
    success: 'bg-emerald-500/20 text-emerald-300',
    failed: 'bg-rose-500/20 text-rose-300',
    cancelled: 'bg-zinc-500/20 text-zinc-300',
  };
  const label: Record<string, string> = {
    queued: '⏳ Sırada',
    running: '🔄 Devam Ediyor',
    success: '✅ Başarılı',
    failed: '❌ Hata',
    cancelled: '⛔ İptal',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-zinc-700 text-zinc-300'}`}>
      {label[status] ?? status}
    </span>
  );
}

export default async function BuildsPage({ params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? '';

  const { data: project } = await supabase
    .from('unity_game_projects')
    .select('id, app_name, package_name, status, approval_status')
    .eq('id', params.id)
    .maybeSingle();

  if (!project) redirect('/game-factory');

  const { data: jobs } = await supabase
    .from('unity_build_jobs')
    .select('id, status, queued_at, started_at, finished_at, artifact_url, metadata, version_name, version_code')
    .eq('unity_game_project_id', params.id)
    .order('created_at', { ascending: false });

  const activeJob = jobs?.find(j => j.status === 'queued' || j.status === 'running');

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{project.app_name}</h1>
          <p className="text-sm text-white/50">{project.package_name}</p>
        </div>
        <div className="flex gap-2">
          <a href={`/game-factory/${params.id}`} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:border-white/40">
            Projeye Dön
          </a>
          {project.approval_status === 'approved' && (
            <StartBuildButton projectId={params.id} />
          )}
        </div>
      </div>

      {activeJob && <BuildStatusPoller jobId={activeJob.id} token={token} />}

      <div className="rounded-2xl border border-white/10 bg-black/20 overflow-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr className="text-left text-white/50">
              <th className="px-4 py-3">Build</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Başlangıç</th>
              <th className="px-4 py-3">Süre</th>
              <th className="px-4 py-3">İndir</th>
            </tr>
          </thead>
          <tbody>
            {!jobs?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                  Henüz build yok.
                </td>
              </tr>
            )}
            {jobs?.map((job, i) => {
              const meta = (job.metadata ?? {}) as Record<string, unknown>;
              const buildNum = meta.unityBuildNumber as number | undefined;
              const start = job.started_at ? new Date(job.started_at) : null;
              const end = job.finished_at ? new Date(job.finished_at) : null;
              const durationSec = start && end ? Math.round((end.getTime() - start.getTime()) / 1000) : null;
              const duration = durationSec
                ? durationSec >= 60
                  ? `${Math.floor(durationSec / 60)}d ${durationSec % 60}s`
                  : `${durationSec}s`
                : '-';

              return (
                <tr key={job.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-mono">
                    #{buildNum ?? (jobs.length - i)}
                  </td>
                  <td className="px-4 py-3">{statusBadge(job.status)}</td>
                  <td className="px-4 py-3 text-white/60">
                    {start ? start.toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '-'}
                  </td>
                  <td className="px-4 py-3 text-white/60">{duration}</td>
                  <td className="px-4 py-3">
                    {job.artifact_url ? (
                      <a
                        href={job.artifact_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/30"
                      >
                        ⬇ AAB İndir
                      </a>
                    ) : (
                      <span className="text-white/30">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
