import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';
import { StartBuildButton } from '@/app/game-factory/[id]/StartBuildButton';
import { BuildStatusAutoRefresh } from '@/app/game-factory/[id]/BuildStatusAutoRefresh';
import { RefreshBuildsButton } from '@/app/game-factory/[id]/RefreshBuildsButton';
import { BuildRowStatusAutoRefresh } from '@/app/game-factory/[id]/BuildRowStatusAutoRefresh';

export const dynamic = 'force-dynamic';

type ArtifactRow = {
  unity_build_job_id: string | null;
  unity_game_project_id: string | null;
  file_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

function readDetectedPackageName(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  const detected = metadata.detected_package_name;
  if (typeof detected === 'string' && detected.trim()) return detected.trim();
  const packageName = metadata.package_name;
  if (typeof packageName === 'string' && packageName.trim()) return packageName.trim();
  return null;
}

function resolveDownloadState(params: {
  projectId: string;
  projectPackageName: string | null;
  buildId: string;
  buildProjectId: string | null;
  buildArtifactUrl: string | null;
  buildMetadata: Record<string, unknown> | null;
  artifact: ArtifactRow | null;
}): { url: string | null; message: string | null } {
  const {
    projectId,
    projectPackageName,
    buildId,
    buildProjectId,
    buildArtifactUrl,
    buildMetadata,
    artifact
  } = params;
  const ownershipMismatch = buildProjectId !== projectId || (artifact && (artifact.unity_game_project_id !== projectId || artifact.unity_build_job_id !== buildId));
  if (ownershipMismatch) {
    return { url: null, message: 'Bu artifact bu projeye ait değil.' };
  }

  const detectedPackageName = readDetectedPackageName(artifact?.metadata ?? buildMetadata);
  if (projectPackageName && detectedPackageName && projectPackageName !== detectedPackageName) {
    return {
      url: null,
      message: `Package name uyuşmuyor. Beklenen: ${projectPackageName}, bulunan: ${detectedPackageName}`
    };
  }

  return { url: buildArtifactUrl ?? artifact?.file_url ?? null, message: null };
}

function normalizeBuildStatus(status: string | null): string {
  if (status === 'started') return 'running';
  if (status === 'success') return 'succeeded';
  if (status === 'completed') return 'succeeded';
  if (status === 'failure') return 'failed';
  return status ?? '-';
}

function displayBuildNumber(unityBuildNumber: unknown, fallback: number): string {
  if (typeof unityBuildNumber === 'number' && Number.isInteger(unityBuildNumber) && unityBuildNumber > 0) {
    return `#${unityBuildNumber}`;
  }
  if (fallback > 0) return `local #${fallback}`;
  return '-';
}


function pickExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith('http://') || url.startsWith('https://') ? url : null;
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

function renderDownloadCell(status: string, downloadUrl: string | null, logsUrl: string | null) {
  if (status === 'queued') return 'Bekliyor';
  if (status === 'building' || status === 'claimed' || status === 'running' || status === 'started') return 'Build devam ediyor';
  if (status === 'failed') {
    if (logsUrl) return <a href={logsUrl} className="underline" target="_blank" rel="noreferrer">Logs / Hata</a>;
    return 'Hata';
  }
  if (status === 'succeeded' && downloadUrl) {
    return <a href={downloadUrl} className="underline" target="_blank" rel="noreferrer">İndir</a>;
  }
  return '-';
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

  const buildIds = (builds ?? []).map((build) => build.id);
  const artifactMap = new Map<string, ArtifactRow>();

  if (buildIds.length > 0) {
    const { data: artifacts } = await supabase
      .from('game_artifacts')
      .select('unity_build_job_id, unity_game_project_id, file_url, metadata, created_at')
      .in('unity_build_job_id', buildIds)
      .order('created_at', { ascending: false });

    for (const artifact of artifacts ?? []) {
      if (!artifact.unity_build_job_id || !artifact.file_url) continue;
      if (!artifactMap.has(artifact.unity_build_job_id)) {
        artifactMap.set(artifact.unity_build_job_id, artifact as ArtifactRow);
      }
    }
  }

  const activeJob = (builds ?? []).find((job) => {
    const normalized = normalizeBuildStatus(job.status).toLowerCase();
    return normalized === 'queued' || normalized === 'building' || normalized === 'claimed' || normalized === 'running' || normalized === 'started';
  });

  return (
    <main className="panel space-y-4">
      <BuildStatusAutoRefresh projectId={activeJob ? id : null} />
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
              const normalizedStatus = normalizeBuildStatus(build.status);
              const download = resolveDownloadState({
                projectId: id,
                projectPackageName: project.package_name ?? null,
                buildId: build.id,
                buildProjectId: build.unity_game_project_id ?? null,
                buildArtifactUrl: build.artifact_url ?? null,
                buildMetadata: (build.metadata as Record<string, unknown> | null) ?? null,
                artifact: artifactMap.get(build.id) ?? null
              });
              return (
                <tr key={build.id} className="border-t border-white/10">
                  <td className="px-3 py-2">{displayBuildNumber(unityBuildNumber, (builds?.length ?? 0) - index)}</td>
                  <td className="px-3 py-2"><BuildRowStatusAutoRefresh buildId={build.id} projectId={id} initialStatus={normalizedStatus} /></td>
                  <td className="px-3 py-2">{build.started_at ? new Date(build.started_at).toLocaleString('tr-TR') : '-'}</td>
                  <td className="px-3 py-2">{durationLabel(build.started_at, build.finished_at)}</td>
                  <td className="px-3 py-2">
                    {(() => {
                      const cell = renderDownloadCell(normalizedStatus, download.url, pickExternalUrl(build.logs_url));
                      if (download.message && cell === '-') return download.message;
                      return cell;
                    })()}
                  </td>
                  <td className="px-3 py-2">{build.logs_url ? <a href={build.logs_url} className="underline" target="_blank" rel="noreferrer">Logs</a> : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
