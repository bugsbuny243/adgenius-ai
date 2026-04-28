import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';
import { deleteGameProject } from '@/app/game-factory/actions';
import { StartBuildButton } from '@/app/game-factory/[id]/StartBuildButton';
import { BuildListAutoRefresh } from '@/app/game-factory/[id]/BuildListAutoRefresh';

export const dynamic = 'force-dynamic';


type BuildRow = {
  id: string;
  unity_game_project_id: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  artifact_url: string | null;
  logs_url?: string | null;
  metadata: Record<string, unknown> | null;
};

function readDetectedPackageName(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  const detected = metadata.detected_package_name;
  if (typeof detected === 'string' && detected.trim()) return detected.trim();
  const packageName = metadata.package_name;
  if (typeof packageName === 'string' && packageName.trim()) return packageName.trim();
  return null;
}

function resolveBuildDownloadState(build: BuildRow, params: { projectId: string; projectPackageName: string | null }): { url: string | null; message: string | null } {
  const ownershipMismatch = build.unity_game_project_id !== params.projectId;
  if (ownershipMismatch) {
    return { url: null, message: 'Bu artifact bu projeye ait değil.' };
  }

  const detectedPackageName = readDetectedPackageName(build.metadata);
  if (params.projectPackageName && detectedPackageName && params.projectPackageName !== detectedPackageName) {
    return {
      url: null,
      message: `Package name uyuşmuyor. Beklenen: ${params.projectPackageName}, bulunan: ${detectedPackageName}`
    };
  }

  return { url: build.artifact_url, message: null };
}

function normalizeBuildStatus(status: string | null): string {
  if (status === 'started') return 'running';
  if (status === 'success' || status === 'completed') return 'succeeded';
  if (status === 'error' || status === 'failure') return 'failed';
  if (status === 'canceled') return 'cancelled';
  return status ?? '-';
}

function statusLabel(status: string): string {
  if (status === 'queued') return 'Bekliyor';
  if (status === 'building' || status === 'running' || status === 'started') return 'Build devam ediyor';
  if (status === 'succeeded' || status === 'success' || status === 'completed') return 'Başarılı';
  if (status === 'failed' || status === 'failure' || status === 'error') return 'Başarısız';
  return status;
}

function statusBadge(status: string): string {
  if (status === 'queued') return 'bg-amber-500/20 text-amber-200';
  if (status === 'claimed' || status === 'running' || status === 'started') return 'bg-blue-500/20 text-blue-200';
  if (status === 'succeeded' || status === 'success') return 'bg-emerald-500/20 text-emerald-200';
  if (status === 'failed' || status === 'failure') return 'bg-red-500/20 text-red-200';
  if (status === 'cancelled') return 'bg-slate-500/20 text-slate-200';
  return 'bg-white/10 text-white';
}

function pickLatestBuildPerNumber(rows: BuildRow[]): BuildRow[] {
  const byBuildNumber = new Map<string, BuildRow>();

  for (const row of rows) {
    const unityBuildNumber = (row.metadata as { unityBuildNumber?: number } | null)?.unityBuildNumber;
    const key = typeof unityBuildNumber === 'number' && Number.isInteger(unityBuildNumber) && unityBuildNumber > 0 ? `unity-${unityBuildNumber}` : `id-${row.id}`;

    const current = byBuildNumber.get(key);
    if (!current) {
      byBuildNumber.set(key, row);
      continue;
    }

    const currentUpdatedAt = new Date(current.updated_at ?? current.created_at ?? 0).getTime();
    const rowUpdatedAt = new Date(row.updated_at ?? row.created_at ?? 0).getTime();
    if (rowUpdatedAt >= currentUpdatedAt) {
      byBuildNumber.set(key, row);
    }
  }

  return [...byBuildNumber.values()].sort((a, b) => {
    const aTime = new Date(a.created_at ?? 0).getTime();
    const bTime = new Date(b.created_at ?? 0).getTime();
    return bTime - aTime;
  });
}

function displayBuildNumber(build: BuildRow, fallback: number): string {
  const unityBuildNumber = (build.metadata as { unityBuildNumber?: number } | null)?.unityBuildNumber;
  if (typeof unityBuildNumber === 'number' && Number.isInteger(unityBuildNumber) && unityBuildNumber > 0) {
    return `#${unityBuildNumber}`;
  }
  return `local #${fallback}`;
}

function renderBuildAction(status: string, downloadUrl: string | null, logsUrl: string | null) {
  if (status === 'queued') return 'Bekliyor';
  if (status === 'building' || status === 'claimed' || status === 'running' || status === 'started') return 'Build devam ediyor';
  if (status === 'failed') {
    if (logsUrl) return <a href={logsUrl} target="_blank" rel="noreferrer" className="underline">Logs / Hata</a>;
    return 'Hata';
  }
  if (status === 'succeeded' && downloadUrl) {
    return <a href={downloadUrl} target="_blank" rel="noreferrer" className="underline">İndir</a>;
  }
  return '—';
}

export default async function GameFactoryProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseReadonlyServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin');

  const [{ data: project }, { data: builds }] = await Promise.all([
    supabase
      .from('unity_game_projects')
      .select('id, app_name, package_name, status, game_brief, approval_status')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('unity_build_jobs')
      .select('id, unity_game_project_id, status, created_at, updated_at, artifact_url, metadata')
      .eq('unity_game_project_id', id)
      .order('created_at', { ascending: false })
      .limit(10)
  ]);

  if (!project) notFound();

  const brief = (project.game_brief ?? {}) as Record<string, unknown>;
  const features = Array.isArray(brief.keyFeatures) ? brief.keyFeatures.map((item) => String(item)) : [];

  const dedupedBuilds = pickLatestBuildPerNumber((builds ?? []) as BuildRow[]);
  const latestBuild = dedupedBuilds[0] ?? null;
  const latestDownload = latestBuild
    ? resolveBuildDownloadState(latestBuild, { projectId: id, projectPackageName: project.package_name ?? null })
    : null;

  return (
    <main className="panel space-y-4">
      <BuildListAutoRefresh builds={dedupedBuilds.map((build) => ({ id: build.id, status: build.status }))} />
      <header className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h1 className="text-2xl font-bold">{project.app_name}</h1>
        <p className="text-sm text-white/70">{project.package_name}</p>
        <span className="mt-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs">{project.status}</span>
      </header>

      <section className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
        <h2 className="mb-2 text-lg font-semibold">Brief</h2>
        <p><b>Açıklama:</b> {String(brief.description ?? '-')}</p>
        <p><b>Tür:</b> {String(brief.genre ?? '-')}</p>
        <p><b>Görsel stil:</b> {String(brief.visualStyle ?? '-')}</p>
        <p><b>Kontroller:</b> {String(brief.controls ?? '-')}</p>
        <ul className="mt-2 list-disc pl-5">
          {features.length ? features.map((feature) => <li key={feature}>{feature}</li>) : <li>Özellik bilgisi yok</li>}
        </ul>
      </section>

      <section className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
        <h2 className="mb-2 text-lg font-semibold">Son Build</h2>
        <p><b>Durum:</b> {latestBuild ? <span className={`rounded-full px-3 py-1 text-xs ${statusBadge(normalizeBuildStatus(latestBuild.status))}`}>{statusLabel(normalizeBuildStatus(latestBuild.status))}</span> : 'Henüz build yok'}</p>
        <p><b>Tarih:</b> {latestBuild?.created_at ? new Date(latestBuild.created_at).toLocaleString('tr-TR') : '—'}</p>
        {latestDownload?.url ? (
          <a href={latestDownload.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex rounded-lg border border-white/20 px-3 py-2">
            İndir
          </a>
        ) : latestDownload?.message ? <p className="mt-2 text-amber-200">{latestDownload.message}</p> : null}
      </section>

      <section className="overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-4">
        <h2 className="mb-3 text-lg font-semibold">Build Listesi</h2>
        <table className="min-w-full text-sm">
          <thead className="bg-black/30 text-left">
            <tr>
              <th className="px-3 py-2">Build</th>
              <th className="px-3 py-2">Durum</th>
              <th className="px-3 py-2">Tarih</th>
              <th className="px-3 py-2">İndir</th>
              <th className="px-3 py-2">Logs</th>
            </tr>
          </thead>
          <tbody>
            {dedupedBuilds.map((build, index) => (
              <tr key={build.id} className="border-t border-white/10">
                <td className="px-3 py-2">{displayBuildNumber(build, dedupedBuilds.length - index)}</td>
                <td className="px-3 py-2"><span className={`rounded-full px-3 py-1 text-xs ${statusBadge(normalizeBuildStatus(build.status))}`}>{statusLabel(normalizeBuildStatus(build.status))}</span></td>
                <td className="px-3 py-2">{build.created_at ? new Date(build.created_at).toLocaleString('tr-TR') : '—'}</td>
                <td className="px-3 py-2">
                  {(() => {
                    const download = resolveBuildDownloadState(build, { projectId: id, projectPackageName: project.package_name ?? null });
                    if (download.url) return <a href={download.url} target="_blank" rel="noreferrer" className="underline">İndir</a>;
                    return download.message ?? '—';
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h2 className="mb-3 text-lg font-semibold">Aksiyonlar</h2>
        <div className="flex flex-wrap gap-2">
          <Link href={`/game-factory/${id}/builds`} className="rounded-lg border border-white/20 px-4 py-2">Buildleri Gör</Link>
          {project.approval_status === 'approved' ? <StartBuildButton projectId={id} /> : <p className="text-sm text-amber-300">Build için önce onay gerekli.</p>}
          <form action={deleteGameProject.bind(null, id)}>
            <button type="submit" className="rounded-lg border border-red-400/40 px-4 py-2 text-red-200">Sil</button>
          </form>
        </div>
      </section>
    </main>
  );
}
