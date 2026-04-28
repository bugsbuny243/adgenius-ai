import Link from 'next/link';
import { requirePlatformOwner } from '@/lib/owner-auth';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

type RecordRow = Record<string, unknown>;

type QueryResult<T> = {
  available: boolean;
  data: T;
  count: number;
};

const DATA_SOURCE_MESSAGE = 'Bu veri kaynağı mevcut değil veya henüz bağlı değil.';

function EmptySourceCard() {
  return <p className="mt-3 rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/70">{DATA_SOURCE_MESSAGE}</p>;
}

async function safeFetch(
  query: () => PromiseLike<{ data: RecordRow[] | null; error: { code?: string; message?: string } | null; count: number | null }>
): Promise<QueryResult<RecordRow[]>> {
  try {
    const result = await query();
    if (result.error) {
      return { available: false, data: [], count: 0 };
    }

    const rows = result.data ?? [];
    return { available: true, data: rows, count: result.count ?? rows.length };
  } catch {
    return { available: false, data: [], count: 0 };
  }
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('tr-TR');
}

function valueOf(record: RecordRow, keys: string[]): string {
  for (const key of keys) {
    const raw = record[key];
    if (typeof raw === 'string' && raw.trim().length > 0) return raw;
    if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
    if (typeof raw === 'boolean') return raw ? 'Evet' : 'Hayır';
  }

  return '-';
}

export default async function OwnerOverviewPage() {
  await requirePlatformOwner();
  const supabase = getSupabaseServiceRoleClient();

  const [
    profiles,
    workspaceMembers,
    workspaces,
    workspacePlans,
    subscriptions,
    unityProjects,
    gameBriefs,
    builds,
    artifacts,
    billingEvents,
    payments,
    packageOrders,
    shopierRows,
    planRequests,
    logs,
    systemEvents,
    agentRuns
  ] = await Promise.all([
    safeFetch(() => supabase.from('profiles').select('id, email, username, full_name, display_name, created_at, status', { count: 'exact' }).order('created_at', { ascending: false }).limit(100)),
    safeFetch(() => supabase.from('workspace_members').select('user_id, workspace_id', { count: 'exact' })),
    safeFetch(() => supabase.from('workspaces').select('id, name, owner_user_id, created_at, status', { count: 'exact' }).order('created_at', { ascending: false }).limit(100)),
    safeFetch(() => supabase.from('workspace_plans').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(200)),
    safeFetch(() => supabase.from('subscriptions').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(200)),
    safeFetch(() => supabase.from('unity_game_projects').select('id, project_id, workspace_id, user_id, app_name, package_name, status, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(100)),
    safeFetch(() => supabase.from('game_briefs').select('id, unity_game_project_id, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(200)),
    safeFetch(() => supabase.from('unity_build_jobs').select('id, unity_game_project_id, build_number, status, metadata, started_at, finished_at, completed_at, artifact_url, logs_url, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(200)),
    safeFetch(() => supabase.from('game_artifacts').select('id, unity_build_job_id, build_job_id, file_url, artifact_url, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(200)),
    safeFetch(() => supabase.from('billing_events').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(200)),
    safeFetch(() => supabase.from('payments').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(200)),
    safeFetch(() => supabase.from('package_orders').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(200)),
    safeFetch(() => supabase.from('shopier').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(200)),
    safeFetch(() => supabase.from('plan_requests').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(200)),
    safeFetch(() => supabase.from('logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(200)),
    safeFetch(() => supabase.from('system_events').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(200)),
    safeFetch(() => supabase.from('agent_runs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(200))
  ]);

  const userRows = profiles.data;
  const workspaceRows = workspaces.data;
  const projectRows = unityProjects.data;
  const buildRows = builds.data;
  const artifactRows = artifacts.data;

  const projectById = new Map<string, RecordRow>();
  for (const project of projectRows) {
    const id = valueOf(project, ['id']);
    if (id !== '-') projectById.set(id, project);
  }

  const paidWorkspaces = workspacePlans.data.filter((row) => ['active', 'paid', 'approved'].includes(valueOf(row, ['plan_status', 'status']).toLowerCase())).length
    + subscriptions.data.filter((row) => ['active', 'paid', 'approved'].includes(valueOf(row, ['status']).toLowerCase())).length;

  const buildSuccessCount = buildRows.filter((row) => ['succeeded', 'success', 'build_succeeded', 'completed'].includes(valueOf(row, ['status']).toLowerCase())).length;
  const buildPendingCount = buildRows.filter((row) => ['queued', 'running', 'started', 'claimed', 'triggered', 'building', 'pending'].includes(valueOf(row, ['status']).toLowerCase())).length;
  const buildFailedCount = buildRows.filter((row) => ['failed', 'failure', 'errored', 'error', 'build_failed'].includes(valueOf(row, ['status']).toLowerCase())).length;

  const paymentSources = [
    { label: 'billing_events', source: billingEvents },
    { label: 'payments', source: payments },
    { label: 'package_orders', source: packageOrders },
    { label: 'shopier', source: shopierRows },
    { label: 'subscriptions', source: subscriptions },
    { label: 'workspace_plans', source: workspacePlans },
    { label: 'plan_requests', source: planRequests }
  ].filter((entry) => entry.source.available && entry.source.data.length > 0);

  const activitySources = [
    { label: 'logs', source: logs },
    { label: 'system_events', source: systemEvents },
    { label: 'agent_runs', source: agentRuns },
    { label: 'billing_events', source: billingEvents }
  ].filter((entry) => entry.source.available && entry.source.data.length > 0);

  return (
    <section className="space-y-4">
      <article className="panel">
        <h2 className="text-lg font-semibold">Owner Panel</h2>
        <p className="mt-1 text-sm text-white/70">/owner • Read-only yönetim ekranı.</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <a href="#genel-bakis" className="rounded-lg border border-white/15 px-3 py-2">Genel Bakış</a>
          <a href="#uyeler" className="rounded-lg border border-white/15 px-3 py-2">Üyeler</a>
          <a href="#paketler" className="rounded-lg border border-white/15 px-3 py-2">Paketler</a>
          <a href="#projeler" className="rounded-lg border border-white/15 px-3 py-2">Projeler</a>
          <a href="#buildler" className="rounded-lg border border-white/15 px-3 py-2">Buildler</a>
          <a href="#artifactlar" className="rounded-lg border border-white/15 px-3 py-2">Artifactlar</a>
          <a href="#sistem" className="rounded-lg border border-white/15 px-3 py-2">Sistem</a>
        </div>
      </article>

      <article id="genel-bakis" className="panel">
        <h3 className="text-lg font-semibold">Genel Bakış</h3>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-3">
          <p className="rounded-lg border border-white/15 px-3 py-2">Toplam kullanıcı: {profiles.count}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Toplam workspace: {workspaces.count}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Aktif planlı workspace: {paidWorkspaces}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Toplam Game Factory projesi: {unityProjects.count}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Toplam build: {builds.count}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Başarılı build: {buildSuccessCount}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Bekleyen build: {buildPendingCount}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Hatalı build: {buildFailedCount}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">İndirilebilir artifact sayısı: {artifactRows.filter((row) => valueOf(row, ['file_url', 'artifact_url']) !== '-').length}</p>
        </div>
      </article>

      <article id="uyeler" className="panel overflow-x-auto">
        <h3 className="text-lg font-semibold">Üyeler</h3>
        {!profiles.available ? <EmptySourceCard /> : (
          <table className="mt-3 min-w-full text-left text-xs md:text-sm">
            <thead className="text-white/70">
              <tr>
                <th className="px-2 py-2">Email</th><th className="px-2 py-2">Ad</th><th className="px-2 py-2">User ID</th><th className="px-2 py-2">Created At</th><th className="px-2 py-2">Workspace</th><th className="px-2 py-2">Plan</th>
              </tr>
            </thead>
            <tbody>
              {userRows.map((row) => {
                const userId = valueOf(row, ['id', 'user_id']);
                const workspaceCount = workspaceMembers.data.filter((member) => valueOf(member, ['user_id']) === userId).length;
                const plan = valueOf(row, ['plan', 'plan_key', 'package']);
                return (
                  <tr key={userId} className="border-t border-white/10">
                    <td className="px-2 py-2">{valueOf(row, ['email'])}</td>
                    <td className="px-2 py-2">{valueOf(row, ['display_name', 'full_name', 'username'])}</td>
                    <td className="px-2 py-2">{userId}</td>
                    <td className="px-2 py-2">{formatDate(valueOf(row, ['created_at']) === '-' ? null : valueOf(row, ['created_at']))}</td>
                    <td className="px-2 py-2">{workspaceCount}</td>
                    <td className="px-2 py-2">{plan}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </article>

      <article className="panel overflow-x-auto">
        <h3 className="text-lg font-semibold">Workspaces / Hesaplar</h3>
        {!workspaces.available ? <EmptySourceCard /> : (
          <table className="mt-3 min-w-full text-left text-xs md:text-sm">
            <thead className="text-white/70"><tr><th className="px-2 py-2">Workspace ID</th><th className="px-2 py-2">Workspace</th><th className="px-2 py-2">Owner Email/User</th><th className="px-2 py-2">Plan</th><th className="px-2 py-2">Plan Type</th><th className="px-2 py-2">Plan Status</th><th className="px-2 py-2">Usage / Monthly Limit</th><th className="px-2 py-2">Created At</th></tr></thead>
            <tbody>
              {workspaceRows.map((workspace) => {
                const workspaceId = valueOf(workspace, ['id']);
                const planRow = workspacePlans.data.find((row) => valueOf(row, ['workspace_id']) === workspaceId) ?? subscriptions.data.find((row) => valueOf(row, ['workspace_id']) === workspaceId);
                const ownerUserId = valueOf(workspace, ['owner_user_id', 'user_id']);
                const ownerProfile = profiles.data.find((row) => valueOf(row, ['id', 'user_id']) === ownerUserId);
                return (
                  <tr key={workspaceId} className="border-t border-white/10">
                    <td className="px-2 py-2">{workspaceId}</td>
                    <td className="px-2 py-2">{valueOf(workspace, ['name'])}</td>
                    <td className="px-2 py-2">{ownerProfile ? valueOf(ownerProfile, ['email']) : ownerUserId}</td>
                    <td className="px-2 py-2">{planRow ? valueOf(planRow, ['plan', 'plan_name', 'plan_key', 'package']) : '-'}</td>
                    <td className="px-2 py-2">{planRow ? valueOf(planRow, ['plan_type']) : '-'}</td>
                    <td className="px-2 py-2">{planRow ? valueOf(planRow, ['plan_status', 'status']) : '-'}</td>
                    <td className="px-2 py-2">{planRow ? `${valueOf(planRow, ['monthly_usage', 'usage'])} / ${valueOf(planRow, ['monthly_limit', 'run_limit'])}` : '-'}</td>
                    <td className="px-2 py-2">{formatDate(valueOf(workspace, ['created_at']) === '-' ? null : valueOf(workspace, ['created_at']))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </article>

      <article id="paketler" className="panel overflow-x-auto">
        <h3 className="text-lg font-semibold">Paketler / Ödemeler</h3>
        {paymentSources.length === 0 ? (
          <p className="mt-3 rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/70">Ödeme/paket kayıt tablosu henüz bağlı değil. Şu an paket onayları manuel takip ediliyor.</p>
        ) : (
          <table className="mt-3 min-w-full text-left text-xs md:text-sm">
            <thead className="text-white/70"><tr><th className="px-2 py-2">Kaynak</th><th className="px-2 py-2">ID</th><th className="px-2 py-2">User/Workspace</th><th className="px-2 py-2">Plan/Paket</th><th className="px-2 py-2">Durum</th><th className="px-2 py-2">Tutar</th><th className="px-2 py-2">Created At</th></tr></thead>
            <tbody>
              {paymentSources.flatMap((entry) => entry.source.data.map((row) => ({ row, source: entry.label }))).slice(0, 200).map(({ row, source }, index) => (
                <tr key={`${source}-${valueOf(row, ['id'])}-${index}`} className="border-t border-white/10">
                  <td className="px-2 py-2">{source}</td>
                  <td className="px-2 py-2">{valueOf(row, ['id'])}</td>
                  <td className="px-2 py-2">{valueOf(row, ['user_id', 'workspace_id'])}</td>
                  <td className="px-2 py-2">{valueOf(row, ['plan_key', 'plan', 'package', 'plan_name'])}</td>
                  <td className="px-2 py-2">{valueOf(row, ['status', 'event_type'])}</td>
                  <td className="px-2 py-2">{valueOf(row, ['amount', 'price', 'currency'])}</td>
                  <td className="px-2 py-2">{formatDate(valueOf(row, ['created_at']) === '-' ? null : valueOf(row, ['created_at']))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>

      <article id="projeler" className="panel overflow-x-auto">
        <h3 className="text-lg font-semibold">Game Factory Projeleri</h3>
        {!unityProjects.available ? <EmptySourceCard /> : (
          <table className="mt-3 min-w-full text-left text-xs md:text-sm">
            <thead className="text-white/70"><tr><th className="px-2 py-2">Project ID</th><th className="px-2 py-2">Başlık</th><th className="px-2 py-2">Package Name</th><th className="px-2 py-2">Workspace/User</th><th className="px-2 py-2">Durum</th><th className="px-2 py-2">Created At</th><th className="px-2 py-2">Link</th></tr></thead>
            <tbody>
              {projectRows.map((project) => {
                const projectId = valueOf(project, ['id']);
                return (
                  <tr key={projectId} className="border-t border-white/10">
                    <td className="px-2 py-2">{projectId}</td>
                    <td className="px-2 py-2">{valueOf(project, ['app_name', 'title', 'name'])}</td>
                    <td className="px-2 py-2">{valueOf(project, ['package_name'])}</td>
                    <td className="px-2 py-2">{valueOf(project, ['workspace_id', 'user_id'])}</td>
                    <td className="px-2 py-2">{valueOf(project, ['status'])}</td>
                    <td className="px-2 py-2">{formatDate(valueOf(project, ['created_at']) === '-' ? null : valueOf(project, ['created_at']))}</td>
                    <td className="px-2 py-2"><Link href={`/game-factory/${projectId}`} className="underline">/game-factory/{projectId}</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!gameBriefs.available ? <EmptySourceCard /> : null}
      </article>

      <article id="buildler" className="panel overflow-x-auto">
        <h3 className="text-lg font-semibold">Buildler</h3>
        {!builds.available ? <EmptySourceCard /> : (
          <table className="mt-3 min-w-full text-left text-xs md:text-sm">
            <thead className="text-white/70"><tr><th className="px-2 py-2">Build #</th><th className="px-2 py-2">Proje</th><th className="px-2 py-2">Durum</th><th className="px-2 py-2">Unity Build/Job ID</th><th className="px-2 py-2">Başlangıç</th><th className="px-2 py-2">Bitiş</th><th className="px-2 py-2">Artifact URL</th><th className="px-2 py-2">Logs URL</th></tr></thead>
            <tbody>
              {buildRows.map((build, index) => {
                const metadata = (build.metadata as RecordRow | null) ?? null;
                const projectId = valueOf(build, ['unity_game_project_id']);
                const project = projectById.get(projectId);
                const hasArtifactUrl = valueOf(build, ['artifact_url']) !== '-' || artifactRows.some((artifact) => valueOf(artifact, ['unity_build_job_id']) === valueOf(build, ['id']) && valueOf(artifact, ['file_url', 'artifact_url']) !== '-');
                return (
                  <tr key={valueOf(build, ['id']) || `build-${index}`} className="border-t border-white/10">
                    <td className="px-2 py-2">{valueOf(build, ['build_number']) !== '-' ? valueOf(build, ['build_number']) : valueOf(metadata ?? {}, ['unityBuildNumber', 'buildNumber'])}</td>
                    <td className="px-2 py-2">{project ? valueOf(project, ['app_name', 'name']) : projectId}</td>
                    <td className="px-2 py-2">{valueOf(build, ['status'])}</td>
                    <td className="px-2 py-2">{valueOf(metadata ?? {}, ['unityBuildId', 'unityBuildNumber', 'unityJobId'])}</td>
                    <td className="px-2 py-2">{formatDate(valueOf(build, ['started_at']) === '-' ? null : valueOf(build, ['started_at']))}</td>
                    <td className="px-2 py-2">{formatDate(valueOf(build, ['finished_at', 'completed_at']) === '-' ? null : valueOf(build, ['finished_at', 'completed_at']))}</td>
                    <td className="px-2 py-2">{hasArtifactUrl ? 'Evet' : 'Hayır'}</td>
                    <td className="px-2 py-2">{valueOf(build, ['logs_url']) !== '-' ? 'Evet' : 'Hayır'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </article>

      <article id="artifactlar" className="panel overflow-x-auto">
        <h3 className="text-lg font-semibold">Artifactlar</h3>
        {!artifacts.available ? <EmptySourceCard /> : (
          <table className="mt-3 min-w-full text-left text-xs md:text-sm">
            <thead className="text-white/70"><tr><th className="px-2 py-2">Artifact ID</th><th className="px-2 py-2">Project/Build</th><th className="px-2 py-2">URL Var mı?</th><th className="px-2 py-2">Link</th><th className="px-2 py-2">Created At</th></tr></thead>
            <tbody>
              {artifactRows.map((artifact, index) => {
                const artifactId = valueOf(artifact, ['id']);
                const buildId = valueOf(artifact, ['unity_build_job_id', 'build_job_id']);
                const build = buildRows.find((row) => valueOf(row, ['id']) === buildId);
                const project = build ? projectById.get(valueOf(build, ['unity_game_project_id'])) : null;
                const fileUrl = valueOf(artifact, ['file_url', 'artifact_url']);
                return (
                  <tr key={artifactId !== '-' ? artifactId : `artifact-${index}`} className="border-t border-white/10">
                    <td className="px-2 py-2">{artifactId}</td>
                    <td className="px-2 py-2">{project ? valueOf(project, ['app_name', 'name']) : '-'} / {buildId}</td>
                    <td className="px-2 py-2">{fileUrl !== '-' ? 'Evet' : 'Hayır'}</td>
                    <td className="px-2 py-2 break-all">{fileUrl !== '-' ? <a href={fileUrl} target="_blank" rel="noreferrer" className="underline">Aç / İndir</a> : '-'}</td>
                    <td className="px-2 py-2">{formatDate(valueOf(artifact, ['created_at']) === '-' ? null : valueOf(artifact, ['created_at']))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </article>

      <article id="sistem" className="panel overflow-x-auto">
        <h3 className="text-lg font-semibold">Sistem / Hatalar</h3>
        {activitySources.length === 0 ? (
          <p className="mt-3 rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/70">Sistem log tablosu henüz bağlı değil.</p>
        ) : (
          <table className="mt-3 min-w-full text-left text-xs md:text-sm">
            <thead className="text-white/70"><tr><th className="px-2 py-2">Kaynak</th><th className="px-2 py-2">ID</th><th className="px-2 py-2">Tip</th><th className="px-2 py-2">Detay</th><th className="px-2 py-2">Zaman</th></tr></thead>
            <tbody>
              {activitySources.flatMap((entry) => entry.source.data.map((row) => ({ row, source: entry.label }))).slice(0, 250).map(({ row, source }, index) => (
                <tr key={`${source}-${valueOf(row, ['id'])}-${index}`} className="border-t border-white/10">
                  <td className="px-2 py-2">{source}</td>
                  <td className="px-2 py-2">{valueOf(row, ['id'])}</td>
                  <td className="px-2 py-2">{valueOf(row, ['event_type', 'status', 'level', 'type'])}</td>
                  <td className="px-2 py-2">{valueOf(row, ['message', 'error', 'details'])}</td>
                  <td className="px-2 py-2">{formatDate(valueOf(row, ['created_at']) === '-' ? null : valueOf(row, ['created_at']))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </section>
  );
}
