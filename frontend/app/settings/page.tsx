import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';
import { getWorkspaceContextOrNull } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

function InfoCard({ title, rows }: { title: string; rows: Array<{ label: string; value: string | number }> }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-zinc-900/50 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl">
      <h2 className="text-xl font-semibold tracking-tight text-zinc-100">{title}</h2>
      <div className="mt-3 space-y-2 text-sm text-zinc-400">
        {rows.map((row) => (
          <p key={row.label}><span className="text-zinc-500">{row.label}:</span> <span className="text-zinc-300">{row.value}</span></p>
        ))}
      </div>
    </article>
  );
}

export default async function SettingsPage() {
  const supabase = await createSupabaseReadonlyServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const workspace = await getWorkspaceContextOrNull();
  if (!workspace) redirect('/signin');

  const [{ data: profile }, { data: subscription }, { data: usageItems }] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle(),
    supabase.from('subscriptions').select('plan_name, run_limit, status').eq('workspace_id', workspace.workspaceId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('usage_counters').select('*').eq('workspace_id', workspace.workspaceId).limit(50)
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 lg:flex-row">
        <Nav />
        <div className="flex-1 space-y-6">
          <section className="rounded-3xl border border-white/10 bg-zinc-900/50 p-5 text-sm text-zinc-400 shadow-2xl shadow-black/50 backdrop-blur-xl">Profil, plan ve kullanım özetini tek ekranda yönetin.</section>
          <section className="grid gap-4 lg:grid-cols-2">
            <InfoCard title="Profil" rows={[{ label: 'Ad', value: profile?.full_name ?? 'Belirtilmedi' }, { label: 'E-posta', value: profile?.email ?? 'Belirtilmedi' }]} />
            <InfoCard title="Çalışma Alanı" rows={[{ label: 'Ad', value: workspace.workspaceName }, { label: 'Kimlik', value: workspace.workspaceId }]} />
            <InfoCard title="Plan" rows={[{ label: 'Plan', value: subscription?.plan_name ?? 'free' }, { label: 'Durum', value: subscription?.status ?? 'active' }, { label: 'Aylık limit', value: subscription?.run_limit ?? 30 }]} />
            <InfoCard title="Kullanım" rows={[{ label: 'Toplam sayaç kaydı', value: usageItems?.length ?? 0 }, { label: 'Kaynak', value: 'usage_counters' }]} />
          </section>
        </div>
      </section>
    </main>
  );
}
