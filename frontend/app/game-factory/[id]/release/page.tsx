import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { PublishButton } from '@/components/game-factory/publish-button';
import { approveReleaseAction, publishReleaseAction, setProjectGooglePlayIntegrationAction, updateReleaseNotesAction } from '@/app/game-factory/actions';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function GameFactoryReleasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const [{ data: project }, { data: brief }, { data: buildJob }, { data: releaseJob }, { data: artifact }, { data: integrations }] = await Promise.all([
    supabase.from('game_projects').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('game_briefs').select('*').eq('game_project_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('game_build_jobs').select('*').eq('game_project_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('game_release_jobs').select('*').eq('game_project_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('game_artifacts').select('*').eq('game_project_id', id).eq('artifact_type', 'aab').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('user_integrations').select('id, display_name, service_account_email, default_track, status').eq('user_id', user.id).eq('provider', 'google_play').order('created_at', { ascending: false })
  ]);

  if (!project) notFound();

  const selectedIntegration = (integrations ?? []).find((integration) => integration.id === project.google_play_integration_id) ?? null;

  return (
    <main>
      <Nav />
      <section className="panel space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{project.name} · Yayın</h1>
          <Link href={`/game-factory/${id}`} className="rounded-lg border border-white/20 px-3 py-2 text-sm">Projeye dön</Link>
        </div>

        <div className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
          <p>Ürün adı: {project.product_name || project.name}</p>
          <p>Paket adı: {project.package_name}</p>
          <p>Sürüm: {buildJob?.version_name ?? project.current_version_name} ({buildJob?.version_code ?? project.current_version_code})</p>
          <p>Yayın kanalı: {releaseJob?.track ?? project.release_track}</p>
          <p>Google Play bağlantısı: {selectedIntegration?.display_name ?? 'Seçilmedi'}</p>
          <p>Kısa açıklama: {brief?.store_short_description ?? '-'}</p>
          <p>Detaylı açıklama: {brief?.store_full_description ?? '-'}</p>
          <p>
            AAB:{' '}
            {artifact?.file_url ? (
              <span>
                AAB oluşturuldu ·{' '}
                <a className="text-neon underline" href={artifact.file_url}>
                  AAB indir
                </a>
              </span>
            ) : (
              'Yok'
            )}
          </p>
        </div>

        {(integrations ?? []).length > 0 ? (
          <form action={setProjectGooglePlayIntegrationAction.bind(null, id)} className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-4">
            <label className="block text-sm">Google Play bağlantısı seç</label>
            <div className="flex flex-wrap items-center gap-2">
              <select
                name="google_play_integration_id"
                defaultValue={project.google_play_integration_id ?? (integrations?.[0]?.id ?? '')}
                className="min-w-[280px] rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
              >
                {integrations?.map((integration) => (
                  <option key={integration.id} value={integration.id}>
                    {integration.display_name} · {integration.service_account_email ?? 'mail yok'} · {integration.default_track}
                  </option>
                ))}
              </select>
              <button className="rounded-lg border border-white/20 px-3 py-2 text-sm">Bağlantıyı projeye ata</button>
            </div>
          </form>
        ) : null}

        <form action={updateReleaseNotesAction.bind(null, id)} className="space-y-2">
          <label className="block text-sm">Yayın notları</label>
          <textarea name="release_notes" rows={6} defaultValue={releaseJob?.release_notes ?? brief?.release_notes ?? ''} className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
          <button className="rounded-lg border border-white/20 px-3 py-2 text-sm">Notları kaydet</button>
        </form>

        <p className="text-sm text-white/80">Yayın için önce kullanıcı onayı verilmeli ve ardından açık onay ile başlatılmalıdır.</p>

        {releaseJob?.status === 'awaiting_user_approval' ? (
          <form action={approveReleaseAction.bind(null, id)}>
            <button className="rounded-lg border border-white/20 px-3 py-2 text-sm">Kullanıcı onayı ver</button>
          </form>
        ) : null}

        {(integrations ?? []).length === 0 ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100 space-y-2">
            <h3 className="font-semibold">Google Play bağlantısı gerekli</h3>
            <p>Koschei’nin oyununuzu Play Console hesabınıza gönderebilmesi için Google Play bağlantısı eklemeniz gerekir. İsterseniz şimdilik AAB dosyasını indirip manuel yükleyebilirsiniz.</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/settings/integrations/google-play" className="inline-flex rounded-lg border border-amber-200/60 px-3 py-2 text-xs">
                Google Play bağlantısı ekle
              </Link>
              {artifact?.file_url ? (
                <a className="inline-flex rounded-lg border border-amber-200/60 px-3 py-2 text-xs" href={artifact.file_url}>
                  AAB indir
                </a>
              ) : null}
              <button type="button" className="rounded-lg border border-amber-200/40 px-3 py-2 text-xs opacity-80">
                Daha sonra
              </button>
            </div>
          </div>
        ) : (
          <form action={publishReleaseAction.bind(null, id)} className="space-y-2">
            <PublishButton label="Google Play’e gönder" />
          </form>
        )}

        {releaseJob?.error_message ? (
          <p className="rounded-lg border border-red-400/40 bg-red-950/30 p-3 text-sm text-red-200">{releaseJob.error_message}</p>
        ) : null}
      </section>
    </main>
  );
}
