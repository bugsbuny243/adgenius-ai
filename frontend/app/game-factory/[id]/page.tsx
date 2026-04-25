import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import {
  approveReleaseAction,
  commitUnityRepoAction,
  generateGameAction,
  prepareReleaseAction,
  publishReleaseAction,
  refreshBuildStatusAction,
  startBuildAction
} from '@/app/game-factory/actions';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { gameFactoryStatusLabel } from '@/lib/game-factory/ui';

export const dynamic = 'force-dynamic';

function PrimaryButton({ children }: { children: string }) {
  return <button className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink">{children}</button>;
}

export default async function GameFactoryProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const [{ data: project }, { data: brief }, { data: generationJob }, { data: buildJob }, { data: artifact }, { data: releaseJob }, { data: integrations }] = await Promise.all([
    supabase.from('game_projects').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('game_briefs').select('*').eq('game_project_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('game_generation_jobs').select('*').eq('game_project_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('game_build_jobs').select('*').eq('game_project_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('game_artifacts').select('*').eq('game_project_id', id).eq('artifact_type', 'aab').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('game_release_jobs').select('*').eq('game_project_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('user_integrations').select('id').eq('user_id', user.id).eq('provider', 'google_play').limit(1)
  ]);

  if (!project) notFound();

  const latestError = releaseJob?.error_message || buildJob?.error_message || generationJob?.error_message || null;
  const hasGooglePlayIntegration = (integrations ?? []).length > 0;

  return (
    <main>
      <Nav />
      <section className="panel space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-sm text-white/70">Durum: {gameFactoryStatusLabel(project.status)}</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/game-factory/${id}/builds`} className="rounded-lg border border-white/20 px-3 py-2 text-sm">Build geçmişi</Link>
            <Link href={`/game-factory/${id}/release`} className="rounded-lg border border-white/20 px-3 py-2 text-sm">Yayın</Link>
            <Link href={`/game-factory/${id}/settings`} className="rounded-lg border border-white/20 px-3 py-2 text-sm">Ayarlar</Link>
          </div>
        </div>

        <article className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-2 text-sm">
          <p><span className="text-white/60">Oyun adı:</span> {project.name}</p>
          <p><span className="text-white/60">Paket adı:</span> {project.package_name}</p>
          <p><span className="text-white/60">Son build:</span> {buildJob?.status ? gameFactoryStatusLabel(buildJob.status) : 'Henüz build yok'}</p>
          {buildJob?.finished_at ? <p><span className="text-white/60">Build zamanı:</span> {new Date(buildJob.finished_at).toLocaleString('tr-TR')}</p> : null}
          {latestError ? <p className="text-red-200"><span className="text-red-300/80">Son hata:</span> {latestError}</p> : null}
        </article>

        {latestError ? (
          <article className="rounded-xl border border-red-400/40 bg-red-950/30 p-4 text-sm text-red-100 space-y-3">
            <h2 className="text-lg font-semibold">İşlem tamamlanamadı</h2>
            <p><span className="text-red-200/80">Sebep:</span> {latestError}</p>
            <p><span className="text-red-200/80">Sonraki adım:</span> Tekrar deneyin. Sorun devam ederse bağlantı ayarlarınızı kontrol edin.</p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/game-factory/${id}`} className="rounded-lg border border-red-200/40 px-3 py-2">Tekrar dene</Link>
              <Link href={`/game-factory/${id}/settings`} className="rounded-lg border border-red-200/40 px-3 py-2">Ayarları kontrol et</Link>
            </div>
          </article>
        ) : null}

        <article className="rounded-xl border border-white/10 bg-black/20 p-4">
          <h2 className="mb-3 text-lg font-semibold">Sonraki adım</h2>

          {(() => {
            if (project.status === 'draft' || project.status === 'brief_created') {
              return (
                <form action={generateGameAction.bind(null, id)}>
                  <PrimaryButton>Oyunu oluştur</PrimaryButton>
                </form>
              );
            }
            if (project.status === 'generated' || project.status === 'ready_for_build') {
              return (
                <form action={startBuildAction.bind(null, id)}>
                  <PrimaryButton>Build başlat</PrimaryButton>
                </form>
              );
            }
            if (project.status === 'building') {
              return (
                <form action={refreshBuildStatusAction.bind(null, id)}>
                  <PrimaryButton>Build durumunu kontrol et</PrimaryButton>
                </form>
              );
            }
            if (project.status === 'build_succeeded' && artifact?.file_url) {
              return (
                <a className="inline-flex rounded-lg bg-neon px-4 py-2 font-semibold text-ink" href={artifact.file_url} target="_blank" rel="noreferrer">
                  AAB indir
                </a>
              );
            }
            if (project.status === 'build_failed') {
              return (
                <form action={startBuildAction.bind(null, id)}>
                  <PrimaryButton>Build&apos;i tekrar dene</PrimaryButton>
                </form>
              );
            }
            if (project.status === 'release_ready') {
              return (
                <form action={prepareReleaseAction.bind(null, id)}>
                  <PrimaryButton>Yayına hazırla</PrimaryButton>
                </form>
              );
            }
            if (project.status === 'awaiting_user_approval') {
              return (
                <form action={approveReleaseAction.bind(null, id)}>
                  <PrimaryButton>Yayını onayla</PrimaryButton>
                </form>
              );
            }
            if (project.status === 'publishing') {
              return (
                <form action={refreshBuildStatusAction.bind(null, id)}>
                  <PrimaryButton>Yayın durumunu kontrol et</PrimaryButton>
                </form>
              );
            }
            if (project.status === 'publish_failed') {
              return (
                <form action={publishReleaseAction.bind(null, id)}>
                  <input type="hidden" name="confirm_publish" value="yes" />
                  <PrimaryButton>Yayını tekrar dene</PrimaryButton>
                </form>
              );
            }
            if (project.status === 'published') {
              return (
                <Link href={`/game-factory/${id}/release`} className="inline-flex rounded-lg bg-neon px-4 py-2 font-semibold text-ink">
                  Yayın detaylarını görüntüle
                </Link>
              );
            }

            return (
              <form action={commitUnityRepoAction.bind(null, id)}>
                <PrimaryButton>Devam et</PrimaryButton>
              </form>
            );
          })()}
        </article>

        <article className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-2 text-sm">
          <h2 className="text-lg font-semibold">Yayın ve indirme</h2>
          {artifact?.file_url ? (
            <a className="inline-flex rounded-lg border border-white/20 px-3 py-2" href={artifact.file_url} target="_blank" rel="noreferrer">
              AAB indir
            </a>
          ) : (
            <p className="text-white/70">AAB henüz hazır değil.</p>
          )}

          {!hasGooglePlayIntegration ? (
            <div className="mt-2 rounded-lg border border-amber-300/30 bg-amber-500/10 p-3 text-amber-100 space-y-2">
              <h3 className="font-semibold">Google Play bağlantısı gerekli</h3>
              <p>Koschei’nin oyununuzu Play Console hesabınıza gönderebilmesi için Google Play bağlantısı eklemeniz gerekir. İsterseniz şimdilik AAB dosyasını indirip manuel yükleyebilirsiniz.</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/settings/integrations/google-play" className="rounded-lg border border-amber-200/60 px-3 py-2 text-xs">Google Play bağlantısı ekle</Link>
                {artifact?.file_url ? (
                  <a className="rounded-lg border border-amber-200/60 px-3 py-2 text-xs" href={artifact.file_url} target="_blank" rel="noreferrer">AAB indir</a>
                ) : null}
                <button disabled className="rounded-lg border border-amber-200/30 px-3 py-2 text-xs opacity-60">Daha sonra</button>
              </div>
            </div>
          ) : null}
        </article>

        <details className="rounded-xl border border-white/10 bg-black/20 p-4">
          <summary className="cursor-pointer font-semibold">Gelişmiş işlem detayları</summary>
          <div className="mt-3 grid gap-2 text-sm text-white/80">
            <p>Brief durumu: {brief ? 'Hazır' : 'Bekliyor'}</p>
            <p>Üretim işi: {generationJob?.status ?? '-'}</p>
            <p>GitHub commit SHA: {project.unity_commit_sha ?? '-'}</p>
            <p>Unity build id: {buildJob?.external_build_id ?? '-'}</p>
            <p>AAB artifact durumu: {artifact?.file_url ? 'Hazır' : 'Hazır değil'}</p>
            <p>Release işi durumu: {releaseJob?.status ?? '-'}</p>
          </div>
        </details>
      </section>
    </main>
  );
}
