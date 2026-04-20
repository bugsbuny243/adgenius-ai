import Link from 'next/link';
import { Nav } from '@/components/nav';
import { getAppContextOrRedirect } from '@/lib/app-context';
import { neutralizeVendorTerms, sanitizeUserFacingEngineLabel } from '@/lib/publish-queue';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function toDisplayStatus(status: string): string {
  if (status === 'completed') return 'Tamamlandı';
  if (status === 'processing') return 'İşleniyor';
  if (status === 'pending') return 'Sırada';
  if (status === 'failed') return 'Hata';
  return status;
}

function toFriendlyRunError(errorMessage: string): string {
  const normalized = errorMessage.toLowerCase();
  if (
    normalized.includes('429') ||
    normalized.includes('too many requests') ||
    normalized.includes('resource_exhausted') ||
    normalized.includes('depleted credits') ||
    normalized.includes('billing') ||
    normalized.includes('provider_quota_exceeded')
  ) {
    return 'AI servis limiti doldu veya proje kredisi bitti. Lütfen billing/quota ayarlarını kontrol edin.';
  }

  return neutralizeVendorTerms(errorMessage).slice(0, 220);
}

const QUICK_AGENTS = [
  { slug: 'yazilim', label: 'Yazılım', mood: 'Derin analiz' },
  { slug: 'sosyal', label: 'Sosyal Medya', mood: 'Hızlı' },
  { slug: 'arastirma', label: 'Araştırma', mood: 'Araştırma odaklı' },
  { slug: 'rapor', label: 'Rapor', mood: 'Derin analiz' }
] as const;

export default async function DashboardPage() {
  const { supabase, workspace } = await getAppContextOrRedirect();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [
    projectsRes,
    runsRes,
    savedRes,
    recentRunsRes,
    recentSavedRes,
    subscriptionRes,
    usageRes,
    agentsRes
  ] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.workspaceId),
    supabase.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.workspaceId),
    supabase.from('saved_outputs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.workspaceId),
    supabase
      .from('agent_runs')
      .select('id, status, model_name, error_message, user_input, result_text, created_at, agent_type_id, agent_types(name)')
      .eq('workspace_id', workspace.workspaceId)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('saved_outputs')
      .select('id, title, content, created_at, agent_run_id')
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
    supabase.from('agent_types').select('id, slug, name').eq('is_active', true).limit(8)
  ]);

  const runLimit = subscriptionRes.data?.run_limit ?? 30;
  const usedRuns = usageRes.count ?? 0;
  const percent = Math.min(100, Math.round((usedRuns / Math.max(1, runLimit)) * 100));

  return (
    <main>
      <Nav />
      <section className="panel mb-4">
        <h2 className="text-lg font-semibold">Çalışma Alanı</h2>
        <p className="text-white/70">{workspace.workspaceName}</p>
      </section>

      {usedRuns >= runLimit ? (
        <section className="panel mb-4 border-amber-300/40 bg-amber-500/10">
          <p className="text-sm text-amber-100">Aylık run limitiniz doldu. Kesintisiz kullanım için planınızı yükseltin.</p>
          <Link href="/upgrade" className="mt-2 inline-flex rounded-lg border border-amber-200/60 px-3 py-1.5 text-sm text-amber-50">Yükselt</Link>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Aktif plan" value={subscriptionRes.data?.plan_name ?? 'free'} />
        <MetricCard title="Toplam çalışma" value={String(runsRes.count ?? 0)} />
        <MetricCard title="Kaydedilen" value={String(savedRes.count ?? 0)} />
        <MetricCard title="Projeler" value={String(projectsRes.count ?? 0)} />
      </section>

      <section className="panel mt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Aylık kullanım</h3>
          <p className="text-sm text-white/70">{usedRuns} / {runLimit}</p>
        </div>
        <div className="mt-2 h-2 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-neon" style={{ width: `${percent}%` }} />
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Hızlı Agent Erişimi</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {(agentsRes.data ?? []).map((agent) => {
              const quick = QUICK_AGENTS.find((item) => item.slug === agent.slug);
              return (
                <Link key={agent.id} href={`/agents/${agent.id}`} className="rounded-lg border border-white/10 p-3 hover:border-neon">
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-xs text-white/60">{quick?.mood ?? 'Hızlı mod'}</p>
                </Link>
              );
            })}
          </div>
        </article>

        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Son Kaydedilenler</h3>
          <div className="space-y-2 text-sm">
            {(recentSavedRes.data ?? []).map((item) => (
              <div key={item.id} className="rounded-lg border border-white/10 px-3 py-2">
                <p className="font-medium">{item.title ?? 'Kaydedilen çıktı'}</p>
                <p className="line-clamp-2 text-white/70">{item.content}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel mt-4">
        <h3 className="mb-3 text-lg font-semibold">Son Çalıştırmalar</h3>
        <div className="space-y-2 text-sm">
          {(recentRunsRes.data ?? []).map((run) => (
            <div key={run.id} className="rounded-lg border border-white/10 px-3 py-2">
              <p>Durum: {toDisplayStatus(run.status)}</p>
              <p className="text-white/70">Motor: {sanitizeUserFacingEngineLabel(run.model_name)}</p>
              <p className="line-clamp-2 text-white/65">{run.user_input || 'İstem kaydı yok.'}</p>
              <p className="text-white/60">{new Date(run.created_at).toLocaleString('tr-TR')}</p>
              {run.error_message ? <p className="text-red-200">Hata: {toFriendlyRunError(run.error_message)}</p> : null}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <article className="panel">
      <h2 className="text-sm text-white/70">{title}</h2>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </article>
  );
}
