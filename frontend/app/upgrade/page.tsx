import Link from 'next/link';
import { Nav } from '@/components/nav';
import { getAppContextOrRedirect } from '@/lib/app-context';

export const dynamic = 'force-dynamic';

export default async function UpgradePage() {
  const { supabase, workspace } = await getAppContextOrRedirect();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [{ data: subscription }, { count: usageCount }] = await Promise.all([
    supabase.from('subscriptions').select('id, plan_name, run_limit, status, current_period_end').eq('workspace_id', workspace.workspaceId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.workspaceId).gte('created_at', monthStart.toISOString())
  ]);

  const runLimit = subscription?.run_limit ?? 30;
  const usedRuns = usageCount ?? 0;
  const usagePercent = Math.min(100, Math.round((usedRuns / Math.max(1, runLimit)) * 100));
  const nearLimit = usagePercent >= 85;

  return (
    <main>
      <Nav />
      <section className="panel space-y-4">
        <h2 className="text-2xl font-semibold">Plan ve Yükseltme Merkezi</h2>
        <p className="text-sm text-white/70">Mevcut planınızı, kullanım seviyenizi ve limit durumunu tek ekranda takip edin.</p>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-white/60">Mevcut plan</p>
            <p className="mt-1 text-lg font-semibold">{subscription?.plan_name ?? 'free'}</p>
            <p className="text-xs text-white/60">Durum: {subscription?.status ?? 'active'}</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-white/60">Bu ay kullanım</p>
            <p className="mt-1 text-lg font-semibold">{usedRuns} / {runLimit}</p>
            <div className="mt-2 h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-neon" style={{ width: `${usagePercent}%` }} /></div>
          </article>
          <article className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-white/60">Dönem sonu</p>
            <p className="mt-1 text-lg font-semibold">{subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('tr-TR') : 'Belirtilmedi'}</p>
          </article>
        </div>

        {nearLimit ? <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-4 text-sm text-amber-100">Kullanım limitine yaklaştınız. Kesintisiz üretim için plan yükseltmeyi değerlendirin.</div> : null}

        <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-4 text-sm text-amber-100">Ödeme entegrasyonu henüz aktif değil. Bu sayfa şu an kullanım görünürlüğü ve plan kararı için güvenli bir fallback deneyimi sunar.</div>

        <div className="flex flex-wrap gap-3">
          <Link href="/pricing" className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:border-neon">Planları karşılaştır</Link>
          <button type="button" disabled className="cursor-not-allowed rounded-lg border border-white/10 px-4 py-2 text-sm text-white/40">Ödeme başlat (hazırlanıyor)</button>
        </div>
      </section>
    </main>
  );
}
