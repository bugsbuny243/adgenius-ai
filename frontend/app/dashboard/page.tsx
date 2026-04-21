import Link from 'next/link';
import { Nav } from '@/components/nav';
import { getAppContextOrRedirect } from '@/lib/app-context';
import { neutralizeVendorTerms, sanitizeUserFacingEngineLabel, toQueueStateHint, toQueueStatusLabel } from '@/lib/publish-queue';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function toDisplayStatus(status: string): string {
  if (status === 'completed') return 'Tamamlandı';
  if (status === 'processing') return 'İşleniyor';
  if (status === 'pending') return 'Sırada';
  if (status === 'failed') return 'Hata';
  return status;
}


function getRunAgentName(value: unknown): string {
  if (!value) return 'Agent çalışması';
  if (Array.isArray(value)) {
    const first = value[0] as { name?: string } | undefined;
    return first?.name ?? 'Agent çalışması';
  }
  if (typeof value === 'object' && value && 'name' in (value as Record<string, unknown>)) {
    const name = (value as { name?: string }).name;
    return name ?? 'Agent çalışması';
  }
  return 'Agent çalışması';
}

const QUICK_ACTIONS = [
  { href: '/agents', label: 'Yeni çalışma başlat' },
  { href: '/projects', label: 'Projeye bağlı çalışma başlat' },
  { href: '/agents', label: 'Sosyal içerik üret' },
  { href: '/runs', label: 'Haftalık rapor oluştur' }
] as const;

export default async function DashboardPage() {
  const { supabase, workspace } = await getAppContextOrRedirect();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [projectsRes, runsRes, savedRes, recentRunsRes, recentSavedRes, subscriptionRes, usageRes, agentsRes, queueRes, socialRes] = await Promise.all([
    supabase.from('projects').select('id, name, status, created_at, updated_at', { count: 'exact' }).eq('workspace_id', workspace.workspaceId).order('updated_at', { ascending: false }).limit(8),
    supabase.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.workspaceId),
    supabase.from('saved_outputs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.workspaceId),
    supabase
      .from('agent_runs')
      .select('id, status, model_name, error_message, user_input, result_text, created_at, agent_types(name)')
      .eq('workspace_id', workspace.workspaceId)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('saved_outputs')
      .select('id, title, content, created_at, project_id')
      .eq('workspace_id', workspace.workspaceId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('subscriptions')
      .select('plan_name, run_limit, status')
      .eq('workspace_id', workspace.workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('agent_runs')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.workspaceId)
      .gte('created_at', monthStart.toISOString()),
    supabase.from('agent_types').select('id, slug, name').eq('is_active', true).limit(8),
    supabase.from('publish_jobs').select('id, status, target_platform, queued_at, project_id', { count: 'exact' }).eq('workspace_id', workspace.workspaceId).order('queued_at', { ascending: false }).limit(5),
    supabase.from('content_items').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.workspaceId)
  ]);

  const runLimit = subscriptionRes.data?.run_limit ?? 30;
  const usedRuns = usageRes.count ?? 0;
  const remaining = Math.max(0, runLimit - usedRuns);
  const percent = Math.min(100, Math.round((usedRuns / Math.max(1, runLimit)) * 100));
  const hasData = (runsRes.count ?? 0) > 0 || (projectsRes.count ?? 0) > 0 || (savedRes.count ?? 0) > 0;
  const nearLimit = percent >= 80;
  const projectList = projectsRes.data ?? [];
  const projectsInRevision = projectList.filter((project) => project.status === 'revision').length;
  const projectsNearDelivery = projectList.filter((project) => project.status === 'in_progress').length;
  const recentlyUpdatedProjects = projectList
    .slice()
    .sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime())
    .slice(0, 3);

  return (
    <main>
      <Nav />
      <section className="mb-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <article className="panel">
          <p className="text-xs uppercase tracking-wide text-lilac">Bugünün Durumu</p>
          <h2 className="mt-1 text-xl font-semibold">{workspace.workspaceName}</h2>
          <p className="text-sm text-white/70">Plan, kullanım ve son çalışma özetini tek merkezde takip edin.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricCard title="Aktif plan" value={subscriptionRes.data?.plan_name ?? 'Ücretsiz'} />
            <MetricCard title="Kullanım" value={`${usedRuns} / ${runLimit}`} />
            <MetricCard title="Kalan hak" value={String(remaining)} />
            <MetricCard title="Son çalışma" value={recentRunsRes.data?.[0] ? new Date(recentRunsRes.data[0].created_at).toLocaleDateString('tr-TR') : 'Henüz yok'} />
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/10">
            <div className="h-full rounded-full bg-neon" style={{ width: `${percent}%` }} />
          </div>
          {nearLimit ? <p className="mt-3 rounded-lg border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">Limit dolma riski var. Kesintisiz üretim için plan yükseltmeyi değerlendirin.</p> : null}
        </article>

        <article className="panel">
          <p className="text-xs uppercase tracking-wide text-lilac">Odak Bloğu</p>
          <h3 className="mt-1 text-lg font-semibold">Bugün ne üretmek istiyorsun?</h3>
          <div className="mt-3 grid gap-2 text-sm">
            <Link href="/projects" className="rounded-lg border border-white/15 px-3 py-2 hover:border-neon">Son projen üzerinden devam et</Link>
            <Link href="/saved" className="rounded-lg border border-white/15 px-3 py-2 hover:border-neon">Geçen çıktıyı yeniden işle</Link>
            <Link href="/composer" className="rounded-lg border border-white/15 px-3 py-2 hover:border-neon">Sosyal içerik kuyruğunu gözden geçir</Link>
            <Link href="/agents" className="rounded-lg border border-neon/40 px-3 py-2 text-neon hover:bg-neon/10">Yeni agent çalıştır</Link>
          </div>
        </article>
      </section>

      <section className="mb-4 grid gap-4 lg:grid-cols-2">
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Hızlı Başlat</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.label} href={action.href} className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:border-neon">
                {action.label}
              </Link>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(agentsRes.data ?? []).slice(0, 4).map((agent) => (
              <Link key={agent.id} href={`/agents/${agent.id}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="font-medium">{agent.name}</p>
                <p className="text-xs text-white/60">Koschei AI motoru</p>
              </Link>
            ))}
          </div>
        </article>

        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Operasyon Özeti</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <InfoPill label="Toplam çalışma" value={String(runsRes.count ?? 0)} />
            <InfoPill label="Kaydedilen çıktı" value={String(savedRes.count ?? 0)} />
            <InfoPill label="Projeler" value={String(projectsRes.count ?? 0)} />
            <InfoPill label="Sosyal içerik" value={String(socialRes.count ?? 0)} />
            <InfoPill label="Queue öğesi" value={String(queueRes.count ?? 0)} />
            <InfoPill label="Revision'daki proje" value={String(projectsInRevision)} />
            <InfoPill label="Teslime yakın" value={String(projectsNearDelivery)} />
          </div>
        </article>
      </section>

      <section className="panel mb-4">
        <h3 className="mb-3 text-lg font-semibold">Workflow görünümü</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          <InfoPill label="Projects in revision" value={String(projectsInRevision)} />
          <InfoPill label="Projects in progress" value={String(projectsNearDelivery)} />
          <InfoPill label="Recently updated projects" value={String(recentlyUpdatedProjects.length)} />
        </div>
        <div className="mt-3 space-y-2">
          {recentlyUpdatedProjects.length === 0 ? <p className="text-sm text-white/70">Güncel proje aktivitesi yok.</p> : null}
          {recentlyUpdatedProjects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="block rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm hover:border-neon">
              <p className="font-medium">{project.name}</p>
              <p className="text-xs text-white/60">{project.status ?? 'draft'} • {new Date(project.updated_at ?? project.created_at).toLocaleString('tr-TR')}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3 className="mb-3 text-lg font-semibold">Son Aktiviteler</h3>
        {!hasData ? (
          <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
            <p>Henüz aktivite yok. Onboarding adımlarıyla başlayabilirsiniz:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>İlk agent çalıştır</li>
              <li>İlk proje oluştur</li>
              <li>İlk çıktını kaydet</li>
              <li>İlk sosyal içerik üret</li>
            </ul>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs uppercase text-white/60">Son run'lar</p>
              {(recentRunsRes.data ?? []).map((run) => (
                <div key={run.id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
                  <p className="font-medium">{getRunAgentName(run.agent_types)}</p>
                  <p className="text-xs text-white/65">{toDisplayStatus(run.status)} • {sanitizeUserFacingEngineLabel(run.model_name)}</p>
                  <p className="line-clamp-2 text-white/75">{run.user_input || 'İstem kaydı yok.'}</p>
                  {run.error_message ? <p className="text-xs text-red-200">{neutralizeVendorTerms(run.error_message)}</p> : null}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase text-white/60">Kaydedilenler ve kuyruk</p>
              {(recentSavedRes.data ?? []).map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
                  <p className="font-medium">{item.title ?? 'Kaydedilen çıktı'}</p>
                  <p className="line-clamp-2 text-white/70">{item.content}</p>
                </div>
              ))}
              {(queueRes.data ?? []).map((job) => (
                <div key={job.id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs">
                  <p>{job.target_platform ?? 'Platform'} • {toQueueStatusLabel(job.status)}</p>
                  <p className="text-white/65">{toQueueStateHint(job.status)} • {job.queued_at ? new Date(job.queued_at).toLocaleString('tr-TR') : 'Tarih yok'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/20 p-3">
      <h2 className="text-xs text-white/70">{title}</h2>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </article>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80">{label}: {value}</p>;
}
