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

export default async function DashboardPage() {
  const supabase = await createSupabaseReadonlyServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin');

  const workspace = await getWorkspaceContextOrNull();
  if (!workspace) redirect('/signin');

  const [subscriptionRes, usageRes, projectsRes] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('plan_name, run_limit, status')
      .eq('workspace_id', workspace.workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('usage_counters')
      .select('*')
      .eq('workspace_id', workspace.workspaceId)
      .order('updated_at', { ascending: false })
      .limit(20),
    supabase
      .from('game_projects')
      .select('id, name, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
  ]);

  const subscription = subscriptionRes.data;
  const usageItems = usageRes.data ?? [];
  const projects = projectsRes.data ?? [];

  const planName = subscription?.plan_name ?? 'free';
  const planTier = planName.toLowerCase() === 'free' ? 'free' : 'paid';
  const usageSummary = usageItems.length;

  return (
    <main>
      <Nav />

      <section className="panel mb-4">
        <p className="text-xs uppercase tracking-wide text-lilac">Dashboard</p>
        <h2 className="mt-1 text-xl font-semibold">{workspace.workspaceName}</h2>
        <p className="text-sm text-white/70">Plan, kullanım ve oyun projeleri özetinizi buradan takip edin.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Plan" value={String(planName)} />
          <MetricCard title="Plan tipi" value={planTier} />
          <MetricCard title="Plan durumu" value={subscription?.status ?? 'active'} />
          <MetricCard title="Kullanım kaydı" value={String(usageSummary)} />
        </div>
      </section>

      <section className="panel mb-4">
        <h3 className="text-lg font-semibold">Game Factory</h3>
        <p className="mt-1 text-sm text-white/70">Yeni oyun üretim süreci başlatmak veya mevcut işleri yönetmek için Game Factory ekranına gidin.</p>
        <Link href="/game-factory" className="mt-4 inline-flex rounded-xl bg-neon px-6 py-3 text-base font-semibold text-ink">
          Game Factory&apos;ye Git
        </Link>
      </section>

      <section className="panel">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Son oyun projeleri</h3>
          <Link href="/game-factory" className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:border-neon">
            Tüm projeleri aç
          </Link>
        </div>

        {projects.length === 0 ? (
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">
            Henüz oyun projesi yok.
          </p>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <article key={project.id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
                <p className="font-medium">{project.name}</p>
                <p className="text-xs text-white/65">Durum: {project.status}</p>
                <p className="text-xs text-white/65">Tarih: {toTurkishDate(project.created_at)}</p>
              </article>
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
