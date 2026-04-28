import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { PublishButton } from '@/components/game-factory/publish-button';
import { approveReleaseAction, publishReleaseAction, setProjectGooglePlayIntegrationAction, updateReleaseNotesAction } from '@/app/game-factory/actions';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';
import { BuildStatusAutoRefresh } from '@/app/game-factory/[id]/BuildStatusAutoRefresh';

export const dynamic = 'force-dynamic';

export default async function GameFactoryReleasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseReadonlyServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const [{ data: project }, { data: brief }, { data: buildJob }, { data: releaseJob }, { data: artifact }, { data: integrations }, { data: consoleReadiness }, { data: latestPreflight }] = await Promise.all([
    supabase.from('unity_game_projects').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('game_briefs').select('*').eq('unity_game_project_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('unity_build_jobs').select('*').eq('unity_game_project_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('game_release_jobs').select('*').eq('unity_game_project_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('game_artifacts').select('*').eq('unity_game_project_id', id).eq('artifact_type', 'aab').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('user_integrations').select('id, display_name, service_account_email, default_track, status').eq('user_id', user.id).eq('provider', 'google_play').order('created_at', { ascending: false }),
    supabase.from('play_console_readiness').select('*').eq('project_id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('play_release_preflight_checks').select('status, blockers, warnings, details').eq('project_id', id).eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  ]);
  const { data: readiness } = await supabase
    .from('google_play_readiness')
    .select('delivery_mode, google_play_account_status, confirmed_at, confirmed_requirements, status, blockers, has_google_account, has_play_console, has_service_account, service_account_valid, permissions_valid, app_access_valid')
    .eq('unity_game_project_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!project) notFound();

  const selectedIntegration = (integrations ?? []).find((integration) => integration.id === project.google_play_integration_id) ?? null;
  const shouldShowConnectionWarning = Boolean(releaseJob?.error_message && /google play bağlantısı gerekli/i.test(releaseJob.error_message));
  const blockerReasons = Array.isArray(releaseJob?.blocker_reasons) ? (releaseJob?.blocker_reasons as string[]) : [];
  const readinessBlockers = Array.isArray(readiness?.blockers) ? (readiness.blockers as string[]) : [];
  const deliveryMode = readiness?.delivery_mode ?? 'play_publish';
  const deliveryModeLabel =
    deliveryMode === 'apk_aab_only'
      ? 'APK/AAB teslimi'
      : deliveryMode === 'setup_assisted'
        ? 'Setup assisted'
        : 'Google Play publish';
  const readinessStatus =
    readiness?.google_play_account_status === 'user_has_account'
      ? 'Hesap bağlı'
      : readiness?.google_play_account_status === 'user_needs_setup'
        ? 'Kurulum gerekli'
        : readiness?.google_play_account_status === 'artifact_only'
          ? 'Sadece artifact teslimi'
          : 'Bilinmiyor';
  const publishBlockedReason = !artifact?.file_url
    ? 'Yayın başlatmak için önce başarılı bir AAB build çıktısı gerekli.'
    : !selectedIntegration && deliveryMode !== 'apk_aab_only'
      ? 'Google Play’e göndermek için bir Google Play bağlantısı seçin.'
      : null;
  const preflightDetails = latestPreflight?.details && typeof latestPreflight.details === 'object' && !Array.isArray(latestPreflight.details)
    ? (latestPreflight.details as Record<string, boolean>)
    : {};
  const checklistItems = [
    { label: 'AAB hazır', ok: Boolean(preflightDetails.latest_aab_exists && preflightDetails.artifact_file_url_exists) },
    { label: 'Google Play bağlantısı', ok: Boolean(preflightDetails.google_play_integration_valid) },
    { label: 'Package name', ok: Boolean(preflightDetails.package_name_exists) },
    { label: 'Store listing', ok: Boolean(preflightDetails.store_title_exists && preflightDetails.store_short_description_exists && preflightDetails.store_full_description_exists) },
    { label: 'Privacy policy', ok: Boolean(preflightDetails.privacy_policy_ready) },
    { label: 'Data Safety', ok: Boolean(preflightDetails.data_safety_ready) },
    { label: 'Target audience', ok: Boolean(preflightDetails.target_audience_ready) },
    { label: 'Ads declaration', ok: Boolean(preflightDetails.ads_declaration_ready) },
    { label: 'IAP products', ok: Boolean(preflightDetails.iap_products_ready) },
    { label: 'Release track', ok: Boolean(preflightDetails.release_track_exists && preflightDetails.production_track_gate) }
  ];
  const latestPreflightBlockers = Array.isArray(latestPreflight?.blockers) ? (latestPreflight.blockers as string[]) : [];
  const latestPreflightWarnings = Array.isArray(latestPreflight?.warnings) ? (latestPreflight.warnings as string[]) : [];

  return (
    <main>
      <Nav />
      <section className="panel space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{project.app_name ?? project.name} · Yayın</h1>
          <Link href={`/game-factory/${id}`} className="rounded-lg border border-white/20 px-3 py-2 text-sm">Projeye dön</Link>
        </div>

        <div className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
          <p>Ürün adı: {project.app_name || project.product_name || project.name}</p>
          <p>Paket adı: {project.package_name}</p>
          <p>Sürüm: {buildJob?.version_name ?? project.current_version_name} ({buildJob?.version_code ?? project.current_version_code})</p>
          <p>Build durumu: {buildJob?.id ? <BuildStatusAutoRefresh jobId={buildJob.id} initialStatus={buildJob.status} withLabel /> : '-'}</p>
          <p>Yayın kanalı: {releaseJob?.track ?? project.release_track}</p>
          <p>Google Play bağlantısı: {selectedIntegration?.display_name ?? 'Seçilmedi'}</p>
          <p>Teslim modu: {deliveryModeLabel}</p>
          <p>Google Play hesap durumu: {readinessStatus}</p>
          <p>Readiness: {readiness?.status ?? 'not_connected'}</p>
          <p>Checklist onayı: {readiness?.confirmed_at ? new Date(readiness.confirmed_at).toLocaleString('tr-TR') : 'Bekleniyor'}</p>
          <p>Google hesabı: {readiness?.has_google_account ? 'Bağlı' : 'Bağlı değil'}</p>
          <p>Play Console: {readiness?.has_play_console ? 'Bağlı' : 'Bağlı değil'}</p>
          <p>Service account: {readiness?.has_service_account ? 'Yüklü' : 'Yok'}</p>
          <p>API token: {readiness?.service_account_valid ? 'Geçerli' : 'Eksik/Geçersiz'}</p>
          <p>API izinleri: {readiness?.permissions_valid ? 'Geçerli' : 'Eksik'}</p>
          <p>Package erişimi: {readiness?.app_access_valid ? 'Geçerli' : 'Eksik'}</p>
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

        <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm space-y-3">
          <h3 className="text-base font-semibold">Google Play Yayın Hazırlığı</h3>
          <ul className="grid gap-1 sm:grid-cols-2">
            {checklistItems.map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <span className={item.ok ? 'text-emerald-300' : 'text-amber-300'}>{item.ok ? '✓' : '•'}</span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
          {latestPreflightBlockers.length > 0 ? (
            <div className="rounded-lg border border-red-400/30 bg-red-950/20 p-3 text-red-100">
              <p className="font-medium">Preflight blockers</p>
              <ul className="list-disc pl-5">
                {latestPreflightBlockers.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {latestPreflightWarnings.length > 0 ? (
            <div className="rounded-lg border border-amber-400/30 bg-amber-950/20 p-3 text-amber-100">
              <p className="font-medium">Preflight uyarıları</p>
              <ul className="list-disc pl-5">
                {latestPreflightWarnings.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {blockerReasons.length > 0 ? (
          <div className="rounded-xl border border-red-400/30 bg-red-950/20 p-4 text-sm text-red-100">
            <h3 className="font-semibold">Publish Blockers</h3>
            <ul className="list-disc pl-5">
              {blockerReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : null}

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

        <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/80 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/settings/integrations/google-play" className="rounded-lg border border-white/20 px-3 py-2 text-sm">
              Google / Play Console Bağla
            </Link>
            <Link href="/settings/integrations/google-play" className="rounded-lg border border-white/20 px-3 py-2 text-sm">
              Entegrasyon ayarları
            </Link>
          </div>
          {readinessBlockers.length > 0 ? (
            <ul className="list-disc pl-5 text-amber-100">
              {readinessBlockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : (
            <p className="text-emerald-200">Google Play readiness kontrolünde blocker yok.</p>
          )}
        </div>

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

        {publishBlockedReason ? (
          <p className="text-sm text-white/70">{publishBlockedReason}</p>
        ) : (
          <form action={publishReleaseAction.bind(null, id)} className="space-y-2">
            <PublishButton label="Google Play’e gönder" />
          </form>
        )}

        {!selectedIntegration ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            Play Store yayını için kullanıcıya ait Google Play Console hesabı gerekir.
          </div>
        ) : null}

        {deliveryMode === 'setup_assisted' ? (
          <div className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-4 text-sm text-blue-100">
            Setup assisted durumu aktif. Build devam eder; yayın yalnızca Google Play entegrasyonu bağlanıp doğrulandıktan sonra açılır.
          </div>
        ) : null}

        {shouldShowConnectionWarning ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100 space-y-2">
            <h3 className="font-semibold">Google Play bağlantısı gerekli</h3>
            <p>Google Play’e gönderebilmek için önce Google Play bağlantınızı ekleyin veya projeye atayın.</p>
            <Link href="/settings/integrations/google-play" className="inline-flex rounded-lg border border-amber-200/60 px-3 py-2 text-xs">
              Google Play bağlantısı ekle
            </Link>
          </div>
        ) : null}

        {releaseJob?.error_message ? (
          <p className="rounded-lg border border-red-400/40 bg-red-950/30 p-3 text-sm text-red-200">{releaseJob.error_message}</p>
        ) : null}
      </section>
    </main>
  );
}
