import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/nav';
import { getAppContextOrRedirect } from '@/lib/app-context';
import { neutralizeVendorTerms, sanitizeUserFacingEngineLabel } from '@/lib/publish-queue';

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

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

export default async function DashboardPage() {
  const { supabase, workspace } = await getAppContextOrRedirect();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [subscriptionRes, usageRes, recentRunsRes, agentsRes] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('plan_name, run_limit')
      .eq('workspace_id', workspace.workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('agent_runs')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.workspaceId)
      .gte('created_at', monthStart.toISOString()),
    supabase
      .from('agent_runs')
      .select('id, status, model_name, error_message, user_input, result_text, created_at, agent_types(name)')
      .eq('workspace_id', workspace.workspaceId)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('agent_types').select('id, name').eq('is_active', true).limit(4)
  ]);

  const runLimit = subscriptionRes.data?.run_limit ?? 30;
  const usedRuns = usageRes.count ?? 0;
  const remaining = Math.max(0, runLimit - usedRuns);
  const percent = Math.min(100, Math.round((usedRuns / Math.max(1, runLimit)) * 100));
  const lastRunDate = recentRunsRes.data?.[0]?.created_at;

  return (
    <main>
      <Nav />

      <section className="panel mb-4">
        <p className="text-xs uppercase tracking-wide text-lilac">Dashboard</p>
        <h2 className="mt-1 text-xl font-semibold">{workspace.workspaceName}</h2>
        <p className="text-sm text-white/70">Plan, kullanım ve son çalışmaları buradan takip edebilirsiniz.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Aktif plan" value={subscriptionRes.data?.plan_name ?? 'Ücretsiz'} />
          <MetricCard title="Kullanım" value={`${usedRuns} / ${runLimit}`} />
          <MetricCard title="Kalan hak" value={String(remaining)} />
          <MetricCard title="Son çalışma" value={lastRunDate ? new Date(lastRunDate).toLocaleDateString('tr-TR') : 'Kayıt yok'} />
        </div>

        <div className="mt-3 h-2 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-neon" style={{ width: `${percent}%` }} />
        </div>
      </section>

      <section className="panel mb-4">
        <h3 className="mb-3 text-lg font-semibold">Hızlı agent başlat</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {(agentsRes.data ?? []).map((agent) => (
            <Link key={agent.id} href={`/agents/${agent.id}`} className="rounded-lg border border-white/10 bg-black/20 p-3 hover:border-neon">
              <p className="font-medium">{agent.name}</p>
              <p className="text-xs text-white/60">Koschei AI motoru</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Son 3 çalışma</h3>
          <Link href="/runs" className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:border-neon">
            Tüm çalışmaları aç
          </Link>
        </div>

        {(recentRunsRes.data ?? []).length === 0 ? (
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">
            Henüz çalışma yok. Agentlar ekranından ilk çalıştırmayı başlat.
          </p>
        ) : (
          <div className="space-y-2">
            {(recentRunsRes.data ?? []).map((run) => (
              <div key={run.id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
                <p className="font-medium">{getRunAgentName(run.agent_types)}</p>
                <p className="text-xs text-white/65">{toDisplayStatus(run.status)} • {sanitizeUserFacingEngineLabel(run.model_name)}</p>
                <p className="line-clamp-2 text-white/75">{run.result_text || run.user_input || 'İçerik yok.'}</p>
                {run.error_message ? <p className="text-xs text-red-200">{neutralizeVendorTerms(run.error_message)}</p> : null}
              </div>
            ))}
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
