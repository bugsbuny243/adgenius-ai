import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';
import { getWorkspaceContextOrNull } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

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
    <main>
      <Nav />
      <section className="mb-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">Profil, plan ve kullanım özetini tek ekranda yönetin.</section>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="panel"><h2 className="text-xl font-semibold">Profil</h2><div className="mt-3 space-y-2 text-sm text-white/80"><p><span className="text-white/60">Ad:</span> {profile?.full_name ?? 'Belirtilmedi'}</p><p><span className="text-white/60">E-posta:</span> {profile?.email ?? 'Belirtilmedi'}</p></div></article>
        <article className="panel"><h2 className="text-xl font-semibold">Çalışma Alanı</h2><div className="mt-3 space-y-2 text-sm text-white/80"><p><span className="text-white/60">Ad:</span> {workspace.workspaceName}</p><p><span className="text-white/60">Kimlik:</span> {workspace.workspaceId}</p></div></article>
        <article className="panel"><h2 className="text-xl font-semibold">Plan</h2><div className="mt-3 space-y-2 text-sm text-white/80"><p><span className="text-white/60">Plan:</span> {subscription?.plan_name ?? 'free'}</p><p><span className="text-white/60">Durum:</span> {subscription?.status ?? 'active'}</p><p><span className="text-white/60">Aylık limit:</span> {subscription?.run_limit ?? 30}</p></div></article>
        <article className="panel"><h2 className="text-xl font-semibold">Kullanım</h2><div className="mt-3 space-y-2 text-sm text-white/80"><p><span className="text-white/60">Toplam sayaç kaydı:</span> {usageItems?.length ?? 0}</p><p><span className="text-white/60">Kaynak:</span> usage_counters</p></div></article>
      </section>
    </main>
  );
}
