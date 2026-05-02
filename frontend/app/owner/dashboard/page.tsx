import { requirePlatformOwner } from '@/lib/owner-auth';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OwnerDashboardPage() {
  await requirePlatformOwner();
  const supabase = await createSupabaseReadonlyServerClient();

  const [profilesRes, activeBuildRes, revenueRes, activityRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('unity_build_jobs').select('id', { count: 'exact', head: true }).in('status', ['queued', 'running', 'building']),
    supabase.from('subscriptions').select('amount, plan_name, status'),
    supabase.from('build_statuses').select('id,service,status,created_at').order('created_at', { ascending: false }).limit(10)
  ]);

  const totalRevenue = (revenueRes.data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Toplam Kullanıcı" value={profilesRes.count ?? 0} />
        <Metric title="Aktif Unity Build" value={activeBuildRes.count ?? 0} />
        <Metric title="Toplam Kazanç" value={`$${totalRevenue.toFixed(2)}`} />
        <Metric title="Abonelik Kaydı" value={revenueRes.data?.length ?? 0} />
      </div>

      <article className="panel">
        <h2 className="text-lg font-semibold">Son 10 Aktivite</h2>
        <div className="mt-4 space-y-2 text-sm">
          {(activityRes.data ?? []).map((item) => (
            <div key={item.id} className="rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2">
              <p className="font-medium">{item.service} • {item.status}</p>
              <p className="text-xs text-slate-400">{new Date(item.created_at ?? '').toLocaleString('tr-TR')}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return <article className="panel"><p className="text-xs uppercase tracking-wider text-slate-400">{title}</p><p className="mt-2 text-2xl font-semibold">{value}</p></article>;
}
