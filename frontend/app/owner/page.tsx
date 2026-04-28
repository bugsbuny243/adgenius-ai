import Link from 'next/link';
import { requirePlatformOwner } from '@/lib/owner-auth';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

type QueryResult<T> = {
  available: boolean;
  data: T;
};

const DATA_SOURCE_MESSAGE = 'Bu veri kaynağı mevcut değil veya henüz bağlı değil.';

function EmptySourceCard() {
  return <p className="mt-3 rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/70">{DATA_SOURCE_MESSAGE}</p>;
}

async function safeFetch<T>(query: () => PromiseLike<{ data: T | null; error: { code?: string; message?: string } | null }>, fallback: T): Promise<QueryResult<T>> {
  try {
    const result = await query();
    if (result.error) {
      return { available: false, data: fallback };
    }

    return { available: true, data: (result.data ?? fallback) as T };
  } catch {
    return { available: false, data: fallback };
  }
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('tr-TR');
}

function valueOf(record: Record<string, unknown>, keys: string[]): string {
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
    builds,
    artifacts,
    paymentOrders,
    payments,
    billingEvents,
    logs,
    systemEvents,
    agentRuns,
    gameBriefs
  ] = await Promise.all([
    safeFetch(() => supabase.from('profiles').select('id, email, username, full_name, display_name, created_at, status', { count: 'exact' }).order('created_at', { ascending: false }).limit(100), [] as Array<Record<string, unknown>>),
    safeFetch(() => supabase.from('workspace_members').select('user_id, workspace_id', { count: 'exact' }), [] as Array<Record<string, unknown>>),
    safeFetch(() => supabase.from('workspaces').select('id, name, owner_user_id, created_at, status', { count: 'exact' }).order('created_at', { ascending: false }).limit(100), [] as Array<Record<string, unknown>>),
    safeFetch(() => supabase.from('workspace_plans').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(200), [] as Array<Record<string, unknown>>),
    safeFetch(() => supabase.from('subscriptions').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(200), [] as Array<Record<string, unknown>>),
    safeFetch(() => supabase.from('unity_game_projects').select('id, project_id, workspace_id, user_id, app_name, package_name, status, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(100), [] as Array<Record<string, unknown>>),
    safeFetch(() => supabase.from('unity_build_jobs').select('id, unity_game_project_id, build_number, status, metadata, started_at, finished_at, artifact_url, logs_url, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(200), [] as Array<Record<string, unknown>>),
    safeFetch(() => supabase.from('game_artifacts').select('id, unity_build_job_id, build_job_id, file_url, artifact_url, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(200), [] as Array<Record<string, unknown>>),
    safeFetch(() => supabase.from('payment_orders').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(200), [] as Array<Record<string, unknown>>),
    safeFetch(() => supabase.from('payments').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(200), [] as Array<Record<string, unknown>>),
    safeFetch(() => supabase.from('billing_events').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(200), [] as Array<Record<string, unknown>>),
    safeFetch(() => supabase.from('logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(200), [] as Array<Record<string, unknown>>),
    safeFetch(() => supabase.from('system_events').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(200), [] as Array<Record<string, unknown>>),
    safeFetch(() => supabase.from('agent_runs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(200), [] as Array<Record<string, unknown>>),
    safeFetch(() => supabase.from('game_briefs').select('id, unity_game_project_id, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(200), [] as Array<Record<string, unknown>>)
  ]);

  const userRows = profiles.data;
  const workspaceRows = workspaces.data;
  const projectRows = unityProjects.data;
  const buildRows = builds.data;
  const artifactRows = artifacts.data;

  const projectById = new Map<string, Record<string, unknown>>();
  for (const project of projectRows) {
    const id = valueOf(project, ['id']);
    if (id !== '-') projectById.set(id, project);
  }

  const buildSuccessCount = buildRows.filter((row) => ['succeeded', 'success', 'build_succeeded'].includes(valueOf(row, ['status']).toLowerCase())).length;
  const buildQueuedCount = buildRows.filter((row) => ['queued', 'running', 'started', 'claimed', 'triggered', 'building'].includes(valueOf(row, ['status']).toLowerCase())).length;
  const buildFailedCount = buildRows.filter((row) => ['failed', 'failure', 'errored', 'error', 'build_failed'].includes(valueOf(row, ['status']).toLowerCase())).length;

  const paymentSources = [paymentOrders, payments, billingEvents].filter((entry) => entry.available && entry.data.length > 0);
  const activitySources = [logs, systemEvents, agentRuns, billingEvents].filter((entry) => entry.available && entry.data.length > 0);

  return (
    <section className="space-y-4">
      <article className="panel">
        <h2 className="text-lg font-semibold">/owner • Read-only Yönetim Paneli</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <a href="#genel-bakis" className="rounded-lg border border-white/15 px-3 py-2">Genel Bakış</a>
          <a href="#uyeler" className="rounded-lg border border-white/15 px-3 py-2">Üyeler</a>
          <a href="#paketler-odemeler" className="rounded-lg border border-white/15 px-3 py-2">Paketler/Ödemeler</a>
          <a href="#projeler" className="rounded-lg border border-white/15 px-3 py-2">Projeler</a>
          <a href="#buildler" className="rounded-lg border border-white/15 px-3 py-2">Buildler</a>
          <a href="#artifactlar" className="rounded-lg border border-white/15 px-3 py-2">Artifactlar</a>
          <a href="#sistem" className="rounded-lg border border-white/15 px-3 py-2">Sistem</a>
        </div>
      </article>

      <article id="genel-bakis" className="panel">
        <h3 className="text-lg font-semibold">Genel Bakış</h3>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-3">
          <p className="rounded-lg border border-white/15 px-3 py-2">Toplam kullanıcı: {userRows.length}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Toplam workspace: {workspaceRows.length}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Aktif paid kullanıcı/workspace: {subscriptions.data.filter((s) => ['active', 'paid', 'approved'].includes(valueOf(s, ['status']).toLowerCase())).length}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Toplam Game Factory proje: {projectRows.length}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Toplam build: {buildRows.length}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Başarılı build: {buildSuccessCount}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Kuyrukta/çalışan build: {buildQueuedCount}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Başarısız build: {buildFailedCount}</p>
          <p className="rounded-lg border border-white/15 px-3 py-2">Toplam artifact/download: {artifactRows.filter((row) => valueOf(row, ['file_url', 'artifact_url']) !== '-').length}</p>
        </div>
      </article>

      <article id="uyeler" className="panel overflow-x-auto">
        <h3 className="text-lg font-semibold">Üyeler</h3>
        {!profiles.available ? <EmptySourceCard /> : (
          <table className="mt-3 min-w-full text-left text-xs md:text-sm">
            <thead className="text-white/70">
              <tr>
                <th className="px-2 py-2">User ID</th><th className="px-2 py-2">Email</th><th className="px-2 py-2">Ad/Kullanıcı</th><th className="px-2 py-2">Oluşturulma</th><th className="px-2 py-2">Workspace</th><th className="px-2 py-2">Plan</th><th className="px-2 py-2">Durum</th>
              </tr>
            </thead>
            <tbody>
              {userRows.map((row) => {
                const userId = valueOf(row, ['id', 'user_id']);
                const workspaceCount = workspaceMembers.data.filter((member) => valueOf(member, ['user_id']) === userId).length;
                const plan = valueOf(row, ['plan', 'plan_key', 'package']);
                return (
                  <tr key={userId} className="border-t border-white/10">
                    <td className="px-2 py-2">{userId}</td>
                    <td className="px-2 py-2">{valueOf(row, ['email'])}</td>
                    <td className="px-2 py-2">{valueOf(row, ['display_name', 'full_name', 'username'])}</td>
                    <td className="px-2 py-2">{formatDate(valueOf(row, ['created_at']) === '-' ? null : valueOf(row, ['created_at']))}</td>
                    <td className="px-2 py-2">{workspaceCount}</td>
                    <td className="px-2 py-2">{plan}</td>
                    <td className="px-2 py-2">{valueOf(row, ['status'])}</td>
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
            <thead className="text-white/70"><tr><th className="px-2 py-2">Workspace ID</th><th className="px-2 py-2">Ad</th><th className="px-2 py-2">Owner/User</th><th className="px-2 py-2">Plan</th><th className="px-2 py-2">Plan Type</th><th className="px-2 py-2">Plan Status</th><th className="px-2 py-2">Limit/Kullanım</th><th className="px-2 py-2">Oluşturulma</th></tr></thead>
            <tbody>
              {workspaceRows.map((workspace) => {
                const workspaceId = valueOf(workspace, ['id']);
                const planRow = workspacePlans.data.find((row) => valueOf(row, ['workspace_id']) === workspaceId) ?? subscriptions.data.find((row) => valueOf(row, ['workspace_id']) === workspaceId);
                return (
                  <tr key={workspaceId} className="border-t border-white/10">
                    <td className="px-2 py-2">{workspaceId}</td>
                    <td className="px-2 py-2">{valueOf(workspace, ['name'])}</td>
                    <td className="px-2 py-2">{valueOf(workspace, ['owner_user_id', 'user_id'])}</td>
                    <td className="px-2 py-2">{planRow ? valueOf(planRow, ['plan', 'plan_key', 'package']) : '-'}</td>
                    <td className="px-2 py-2">{planRow ? valueOf(planRow, ['plan_type']) : '-'}</td>
                    <td className="px-2 py-2">{planRow ? valueOf(planRow, ['plan_status', 'status']) : '-'}</td>
                    <td className="px-2 py-2">{planRow ? `${valueOf(planRow, ['monthly_limit'])} / ${valueOf(planRow, ['monthly_usage', 'usage'])}` : '-'}</td>
                    <td className="px-2 py-2">{formatDate(valueOf(workspace, ['created_at']) === '-' ? null : valueOf(workspace, ['created_at']))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </article>

      <article id="paketler-odemeler" className="panel overflow-x-auto">
        <h3 className="text-lg font-semibold">Paketler / Ödemeler</h3>
        {paymentSources.length === 0 ? (
          <p className="mt-3 rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/70">Ödeme/paket kayıt tablosu bulunamadı. Şu an paket onayları manuel takip ediliyor.</p>
        ) : (
          <table className="mt-3 min-w-full text-left text-xs md:text-sm">
            <thead className="text-white/70"><tr><th className="px-2 py-2">Kaynak</th><th className="px-2 py-2">ID</th><th className="px-2 py-2">User/Workspace</th><th className="px-2 py-2">Plan/Paket</th><th className="px-2 py-2">Durum</th><th className="px-2 py-2">Tutar</th><th className="px-2 py-2">Oluşturulma</th></tr></thead>
            <tbody>
              {paymentSources.flatMap((source, idx) => source.data.map((row) => ({ row, source: idx === 0 ? 'orders' : idx === 1 ? 'payments' : 'billing_events' }))).slice(0, 200).map(({ row, source }, index) => (
                <tr key={`${source}-${valueOf(row, ['id'])}-${index}`} className="border-t border-white/10">
                  <td className="px-2 py-2">{source}</td>
                  <td className="px-2 py-2">{valueOf(row, ['id'])}</td>
                  <td className="px-2 py-2">{valueOf(row, ['user_id', 'workspace_id'])}</td>
                  <td className="px-2 py-2">{valueOf(row, ['plan_key', 'plan', 'package'])}</td>
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
            <thead className="text-white/70"><tr><th className="px-2 py-2">Project ID</th><th className="px-2 py-2">Ad</th><th className="px-2 py-2">Package Name</th><th className="px-2 py-2">Owner/Workspace</th><th className="px-2 py-2">Durum</th><th className="px-2 py-2">Brief</th><th className="px-2 py-2">Oluşturulma</th><th className="px-2 py-2">Detay</th></tr></thead>
            <tbody>
              {projectRows.map((project) => {
                const projectId = valueOf(project, ['id']);
                const brief = gameBriefs.data.find((row) => valueOf(row, ['unity_game_project_id']) === projectId);
                return (
                  <tr key={projectId} className="border-t border-white/10">
                    <td className="px-2 py-2">{projectId}</td>
                    <td className="px-2 py-2">{valueOf(project, ['app_name', 'title', 'name'])}</td>
                    <td className="px-2 py-2">{valueOf(project, ['package_name'])}</td>
                    <td className="px-2 py-2">{valueOf(project, ['workspace_id', 'user_id'])}</td>
                    <td className="px-2 py-2">{valueOf(project, ['status'])}</td>
                    <td className="px-2 py-2">{brief ? valueOf(brief, ['id']) : '-'}</td>
                    <td className="px-2 py-2">{formatDate(valueOf(project, ['created_at']) === '-' ? null : valueOf(project, ['created_at']))}</td>
                    <td className="px-2 py-2"><Link href={`/game-factory/${projectId}`} className="underline">Aç</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </article>

      <article id="buildler" className="panel overflow-x-auto">
        <h3 className="text-lg font-semibold">Buildler</h3>
        {!builds.available ? <EmptySourceCard /> : (
          <table className="mt-3 min-w-full text-left text-xs md:text-sm">
            <thead className="text-white/70"><tr><th className="px-2 py-2">Build #</th><th className="px-2 py-2">Proje</th><th className="px-2 py-2">Durum</th><th className="px-2 py-2">Unity Job ID</th><th className="px-2 py-2">Başlangıç</th><th className="px-2 py-2">Bitiş</th><th className="px-2 py-2">Artifact URL</th><th className="px-2 py-2">Logs URL</th></tr></thead>
            <tbody>
              {buildRows.map((build, index) => {
                const metadata = (build.metadata as Record<string, unknown> | null) ?? null;
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
            <thead className="text-white/70"><tr><th className="px-2 py-2">Proje</th><th className="px-2 py-2">Build</th><th className="px-2 py-2">Artifact URL?</th><th className="px-2 py-2">Dosya URL</th><th className="px-2 py-2">Oluşturulma</th></tr></thead>
            <tbody>
              {artifactRows.map((artifact, index) => {
                const buildId = valueOf(artifact, ['unity_build_job_id', 'build_job_id']);
                const build = buildRows.find((row) => valueOf(row, ['id']) === buildId);
                const project = build ? projectById.get(valueOf(build, ['unity_game_project_id'])) : null;
                const fileUrl = valueOf(artifact, ['file_url', 'artifact_url']);
                return (
                  <tr key={valueOf(artifact, ['id']) || `artifact-${index}`} className="border-t border-white/10">
                    <td className="px-2 py-2">{project ? valueOf(project, ['app_name', 'name']) : '-'}</td>
                    <td className="px-2 py-2">{buildId}</td>
                    <td className="px-2 py-2">{fileUrl !== '-' ? 'Evet' : 'Hayır'}</td>
                    <td className="px-2 py-2 break-all">{fileUrl !== '-' ? <a href={fileUrl} target="_blank" rel="noreferrer" className="underline">{fileUrl}</a> : '-'}</td>
                    <td className="px-2 py-2">{formatDate(valueOf(artifact, ['created_at']) === '-' ? null : valueOf(artifact, ['created_at']))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </article>

      <article id="sistem" className="panel overflow-x-auto">
        <h3 className="text-lg font-semibold">Sistem Aktivitesi / Hatalar</h3>
        {activitySources.length === 0 ? (
          <p className="mt-3 rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/70">Sistem log tablosu henüz bağlı değil.</p>
        ) : (
          <table className="mt-3 min-w-full text-left text-xs md:text-sm">
            <thead className="text-white/70"><tr><th className="px-2 py-2">Kaynak</th><th className="px-2 py-2">ID</th><th className="px-2 py-2">Tip</th><th className="px-2 py-2">Detay</th><th className="px-2 py-2">Zaman</th></tr></thead>
            <tbody>
              {activitySources.flatMap((source, idx) => source.data.map((row) => ({ row, source: idx === 0 ? 'logs' : idx === 1 ? 'system_events' : idx === 2 ? 'agent_runs' : 'billing_events' }))).slice(0, 250).map(({ row, source }, index) => (
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
