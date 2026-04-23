import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { getAppContextOrRedirect } from '@/lib/app-context';

export const dynamic = 'force-dynamic';

type SettingsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const GOOGLE_STATUS_BANNERS: Record<string, { tone: 'success' | 'error'; message: string }> = {
  connected: { tone: 'success', message: 'Google hesabı başarıyla bağlandı.' },
  failed: { tone: 'error', message: 'Google bağlantısı tamamlanamadı. Lütfen tekrar deneyin.' },
  expired: { tone: 'error', message: 'Google bağlantı oturumu süresi doldu. Lütfen yeniden başlatın.' },
  workspace_required: { tone: 'error', message: 'Google bağlantısı için geçerli bir çalışma alanı gerekli.' }
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = (await searchParams) ?? {};
  const googleStatusParam = params.google;
  const googleStatus = Array.isArray(googleStatusParam) ? googleStatusParam[0] : googleStatusParam;
  const googleBanner = googleStatus ? GOOGLE_STATUS_BANNERS[googleStatus] : null;

  const { supabase, workspace, userId } = await getAppContextOrRedirect();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [{ data: profile }, { data: subscription }, { count: usageCount }] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', userId).maybeSingle(),
    supabase.from('subscriptions').select('plan_name, run_limit, status').eq('workspace_id', workspace.workspaceId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.workspaceId).gte('created_at', monthStart.toISOString())
  ]);
  const { data: googleConnection } = await supabase
    .from('oauth_connections')
    .select('status, updated_at, metadata')
    .eq('workspace_id', workspace.workspaceId)
    .eq('user_id', userId)
    .eq('provider', 'google')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const googleMeta = googleConnection?.metadata && typeof googleConnection.metadata === 'object' && !Array.isArray(googleConnection.metadata)
    ? (googleConnection.metadata as Record<string, unknown>)
    : {};

  async function signOutAction() {
    'use server';
    const { supabase: serverSupabase } = await getAppContextOrRedirect();
    await serverSupabase.auth.signOut();
    redirect('/signin');
  }

  return (
    <main>
      <Nav />
      {googleBanner ? (
        <section
          className={`mb-4 rounded-xl border p-3 text-sm ${
            googleBanner.tone === 'success'
              ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
              : 'border-rose-400/40 bg-rose-500/10 text-rose-200'
          }`}
        >
          {googleBanner.message}
        </section>
      ) : null}
      <section className="mb-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">Profil, plan, kullanım ve bağlantı özetini tek ekranda yönetin.</section>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="panel"><h2 className="text-xl font-semibold">Profil</h2><div className="mt-3 space-y-2 text-sm text-white/80"><p><span className="text-white/60">Ad:</span> {profile?.full_name ?? 'Belirtilmedi'}</p><p><span className="text-white/60">E-posta:</span> {profile?.email ?? 'Belirtilmedi'}</p></div></article>
        <article className="panel"><h2 className="text-xl font-semibold">Çalışma Alanı</h2><div className="mt-3 space-y-2 text-sm text-white/80"><p><span className="text-white/60">Ad:</span> {workspace.workspaceName}</p><p><span className="text-white/60">Kimlik:</span> {workspace.workspaceId}</p></div></article>
        <article className="panel"><h2 className="text-xl font-semibold">Plan</h2><div className="mt-3 space-y-2 text-sm text-white/80"><p><span className="text-white/60">Plan:</span> {subscription?.plan_name ?? 'Ücretsiz'}</p><p><span className="text-white/60">Durum:</span> {subscription?.status ?? 'active'}</p><p><span className="text-white/60">Aylık limit:</span> {subscription?.run_limit ?? 30}</p><p><span className="text-white/60">Bu ay kullanım:</span> {usageCount ?? 0}</p></div><Link href="/upgrade" className="mt-4 inline-flex rounded-lg border border-neon/60 px-3 py-1.5 text-sm text-neon">Planı yükselt</Link></article>
        <article className="panel"><h2 className="text-xl font-semibold">Entegrasyon Özeti</h2><div className="mt-3 space-y-2 text-sm text-white/80"><p><span className="text-white/60">Google:</span> {googleConnection?.status === 'active' ? 'Bağlı' : 'Bağlı değil'}</p><p><span className="text-white/60">YouTube channel:</span> {typeof googleMeta.youtubeChannelId === 'string' ? googleMeta.youtubeChannelId : '—'}</p><p><span className="text-white/60">Blogger blog:</span> {typeof googleMeta.bloggerBlogId === 'string' ? googleMeta.bloggerBlogId : '—'}</p><p><span className="text-white/60">Son güncelleme:</span> {googleConnection?.updated_at ? new Date(googleConnection.updated_at).toLocaleString('tr-TR') : '—'}</p></div><Link href="/connections" className="mt-4 inline-flex rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:border-neon">Bağlantıları yönet</Link></article>
        <article className="panel"><h2 className="text-xl font-semibold">Oturum</h2><p className="mt-1 text-sm text-white/70">Güvenli çıkış için aşağıdaki aksiyonu kullanın.</p><form action={signOutAction} className="mt-3"><button type="submit" className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:border-neon">Çıkış yap</button></form></article>
      </section>
    </main>
  );
}
