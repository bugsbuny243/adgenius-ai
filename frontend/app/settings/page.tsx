import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { getAppContextOrRedirect } from '@/lib/app-context';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { supabase, workspace, userId } = await getAppContextOrRedirect();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [{ data: profile }, { data: subscription }, { count: usageCount }] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', userId).maybeSingle(),
    supabase.from('subscriptions').select('plan_name, run_limit, status').eq('workspace_id', workspace.workspaceId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.workspaceId).gte('created_at', monthStart.toISOString())
  ]);

  async function signOutAction() {
    'use server';
    const { supabase: serverSupabase } = await getAppContextOrRedirect();
    await serverSupabase.auth.signOut();
    redirect('/signin');
  }

  return (
    <main>
      <Nav />
      <section className="mb-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
        Profil, workspace, plan-kullanım ve oturum ayarları tek ekranda düzenli şekilde sunulur.
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="panel">
          <h2 className="text-xl font-semibold">Profil</h2>
          <div className="mt-3 space-y-2 text-sm text-white/80">
            <p><span className="text-white/60">Ad:</span> {profile?.full_name ?? 'Belirtilmedi'}</p>
            <p><span className="text-white/60">E-posta:</span> {profile?.email ?? 'Belirtilmedi'}</p>
          </div>
        </article>

        <article className="panel">
          <h2 className="text-xl font-semibold">Workspace</h2>
          <div className="mt-3 space-y-2 text-sm text-white/80">
            <p><span className="text-white/60">Ad:</span> {workspace.workspaceName}</p>
            <p><span className="text-white/60">Kimlik:</span> {workspace.workspaceId}</p>
          </div>
        </article>

        <article className="panel">
          <h2 className="text-xl font-semibold">Plan & Kullanım</h2>
          <div className="mt-3 space-y-2 text-sm text-white/80">
            <p><span className="text-white/60">Plan:</span> {subscription?.plan_name ?? 'free'}</p>
            <p><span className="text-white/60">Durum:</span> {subscription?.status ?? 'active'}</p>
            <p><span className="text-white/60">Aylık limit:</span> {subscription?.run_limit ?? 30}</p>
            <p><span className="text-white/60">Bu ay kullanım:</span> {usageCount ?? 0}</p>
          </div>
          <Link href="/upgrade" className="mt-4 inline-flex rounded-lg border border-neon/60 px-3 py-1.5 text-sm text-neon">Planı yükselt</Link>
        </article>

        <article className="panel">
          <h2 className="text-xl font-semibold">Oturum</h2>
          <p className="mt-1 text-sm text-white/70">Güvenli çıkış için aşağıdaki aksiyonu kullanın.</p>
          <form action={signOutAction} className="mt-3">
            <button type="submit" className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:border-neon">Çıkış yap</button>
          </form>
        </article>
      </section>
    </main>
  );
}
