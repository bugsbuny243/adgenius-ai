import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';
import { getWorkspaceContextOrNull } from '@/lib/workspace';

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function toTurkishDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('tr-TR');
}

function statusTone(status: string | null | undefined): string {
  const normalized = (status ?? '').toLowerCase();
  if (normalized.includes('paid') || normalized.includes('active') || normalized.includes('completed')) {
    return 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30';
  }
  if (normalized.includes('pending') || normalized.includes('review')) {
    return 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30';
  }
  return 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30';
}

export default async function DashboardPage() {
  const supabase = await createSupabaseReadonlyServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin');

  const workspace = await getWorkspaceContextOrNull();
  if (!workspace) redirect('/signin');

  const [subscriptionRes, projectsRes, paymentOrdersRes] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('plan_name, run_limit, status')
      .eq('workspace_id', workspace.workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('game_projects')
      .select('id, name, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('payment_orders')
      .select('id, plan_key, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6)
  ]);

  const subscription = subscriptionRes.data;
  const projects = projectsRes.data ?? [];
  const paymentOrders = paymentOrdersRes.data ?? [];

  const completedOrders = paymentOrders.filter((order) => (order.status ?? '').toLowerCase().includes('paid')).length;
  const pendingOrders = paymentOrders.filter((order) => (order.status ?? '').toLowerCase().includes('pending')).length;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <Nav />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/60 p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Sipariş Paneli</p>
              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{workspace.workspaceName}</h1>
              <p className="mt-2 text-sm text-slate-300">Siparişler, paket durumu ve üretim sürecini tek ekrandan takip edin.</p>
            </div>
            <Link
              href="/game-factory"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              Yeni Sipariş / Proje Oluştur
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Aktif Paket" value={String(subscription?.plan_name ?? 'free')} />
            <MetricCard title="Paket Durumu" value={String(subscription?.status ?? 'active')} />
            <MetricCard title="Onaylanan Sipariş" value={String(completedOrders)} />
            <MetricCard title="Bekleyen Sipariş" value={String(pendingOrders)} />
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-5">
          <section className="xl:col-span-3 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Son Siparişler</h2>
              <span className="text-xs text-slate-400">Toplam: {paymentOrders.length}</span>
            </div>

            {paymentOrders.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 bg-slate-950/70 px-4 py-6 text-center text-sm text-slate-400">
                Henüz sipariş kaydı bulunmuyor.
              </p>
            ) : (
              <div className="space-y-3">
                {paymentOrders.map((order) => (
                  <article key={order.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-slate-100">{order.plan_key}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(order.status)}`}>
                        {order.status ?? 'unknown'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Sipariş tarihi: {toTurkishDate(order.created_at)}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="xl:col-span-2 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Üretimdeki Projeler</h2>
              <Link href="/game-factory" className="text-xs text-indigo-300 hover:text-indigo-200">
                Tümünü Gör
              </Link>
            </div>

            {projects.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 bg-slate-950/70 px-4 py-6 text-center text-sm text-slate-400">
                Henüz proje bulunmuyor.
              </p>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <article key={project.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="font-medium">{project.name}</p>
                    <p className="mt-2 text-xs text-slate-400">Durum: {project.status}</p>
                    <p className="text-xs text-slate-500">Oluşturulma: {toTurkishDate(project.created_at)}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <h2 className="text-xs uppercase tracking-wide text-slate-400">{title}</h2>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </article>
  );
}
