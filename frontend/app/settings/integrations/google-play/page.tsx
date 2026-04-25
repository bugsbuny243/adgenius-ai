import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { saveGooglePlayIntegrationAction } from '@/app/settings/integrations/google-play/actions';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function bannerText(status: string | undefined) {
  if (status === 'connected') return 'Google Play bağlantısı başarıyla kaydedildi.';
  return null;
}

export default async function GooglePlayIntegrationsPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin');

  const params = (await searchParams) ?? {};
  const statusValue = params.status;
  const status = Array.isArray(statusValue) ? statusValue[0] : statusValue;
  const banner = bannerText(status);

  const { data: integrations } = await supabase
    .from('user_integrations')
    .select('id, display_name, service_account_email, default_track, status, last_validated_at, created_at')
    .eq('user_id', user.id)
    .eq('provider', 'google_play')
    .order('created_at', { ascending: false });

  return (
    <main>
      <Nav />
      {banner ? <section className="mb-4 rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{banner}</section> : null}
      <section className="panel space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Google Play hesabınızı bağlayın</h1>
            <p className="text-sm text-white/70">Koschei, oluşturulan AAB dosyasını sizin Play Console hesabınıza göndermek için bu bağlantıyı kullanır. Google şifrenizi istemeyiz.</p>
          </div>
          <Link href="/settings" className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:border-neon">Ayarlara dön</Link>
        </div>

        <form action={saveGooglePlayIntegrationAction} className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm">Bağlantı adı</span>
            <input name="display_name" required className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2" placeholder="Örn: Ana yayın hesabı" />
          </label>

          <label className="space-y-1">
            <span className="text-sm">Varsayılan yayın kanalı</span>
            <select name="default_track" defaultValue="production" className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2">
              <option value="production">production</option>
              <option value="closed">closed</option>
              <option value="internal">internal</option>
            </select>
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm">Service account JSON dosyası yükle</span>
            <p className="text-xs text-white/60">Bu dosya Google Play Console’da oluşturulan service account JSON dosyasıdır.</p>
            <input type="file" name="service_account_json_file" accept="application/json" className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
          </label>

          <details className="space-y-1 md:col-span-2">
            <summary className="cursor-pointer text-sm">Gelişmiş: JSON metni yapıştır</summary>
            <textarea name="service_account_json" rows={8} className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2" placeholder='{"type":"service_account", ...}' />
          </details>

          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button type="submit" className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink">Bağlantıyı kaydet</button>
            <a href="https://support.google.com/googleplay/android-developer/answer/9844686" target="_blank" rel="noreferrer" className="rounded-lg border border-white/20 px-4 py-2 text-sm">
              Bağlantı rehberini göster
            </a>
          </div>
        </form>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Bağlı hesaplar</h2>
          {(integrations ?? []).length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/70">Henüz Google Play bağlantısı eklenmedi.</p>
          ) : (
            <div className="grid gap-2">
              {integrations?.map((integration) => (
                <article key={integration.id} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/80">
                  <p><span className="text-white/60">Bağlantı adı:</span> {integration.display_name}</p>
                  <p><span className="text-white/60">Service account e-postası:</span> {integration.service_account_email ?? '—'}</p>
                  <p><span className="text-white/60">Varsayılan kanal:</span> {integration.default_track}</p>
                  <p><span className="text-white/60">Durum:</span> {integration.status}</p>
                  <p><span className="text-white/60">Son doğrulama:</span> {integration.last_validated_at ? new Date(integration.last_validated_at).toLocaleString('tr-TR') : '—'}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
