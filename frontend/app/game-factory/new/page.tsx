'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type Platform = 'android' | 'ios';
type DeliveryMode = 'apk_aab_only' | 'play_publish' | 'setup_assisted';
type GameBrief = {
  title: string;
  slug: string;
  packageName: string;
  summary: string;
  gameType: 'runner_2d';
  targetPlatform: 'android';
  mechanics: string[];
  visualStyle: string;
  controls: string;
  monetizationNotes: string;
  releaseNotes: string;
  storeShortDescription: string;
  storeFullDescription: string;
  complexityLevel: 'simple' | 'medium' | 'advanced';
  infrastructureRequired: boolean;
  infrastructureLevel: 'none' | 'basic' | 'advanced';
  requiredInfrastructure: string[];
  requiredUserAccounts: string[];
  monetizationRequired: boolean;
  iapRequired: boolean;
  adsRequired: boolean;
  subscriptionsRequired: boolean;
  backendRequired: boolean;
  multiplayerRequired: boolean;
  publishingRequirements: string[];
  blockersBeforeBuild: string[];
  blockersBeforePublish: string[];
  google_play_required: boolean;
  google_play_account_status: 'unknown' | 'user_has_account' | 'user_needs_setup' | 'artifact_only';
  publishing_blockers: string[];
  delivery_mode: DeliveryMode;
  requires_custom_scope: boolean;
  budget_required: boolean;
  infrastructure_intake_required: boolean;
  estimated_minimum_budget: number;
  estimated_monthly_infrastructure_cost: number;
  scalable_scope_options: Array<{
    label: string;
    one_time_budget_usd: number;
    monthly_infrastructure_budget_usd: number;
    scope: string[];
  }>;
  feasible_mvp_scope: string[];
  deferred_features: string[];
  required_budget_to_include_deferred_features: number;
  infrastructure_gap_analysis: string[];
  recommended_next_step: string;
};

type GooglePlayAccountChoice = 'user_has_account' | 'artifact_only' | 'user_needs_setup';

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error('Supabase yapılandırması eksik.');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Lütfen yeniden giriş yapın.');
  return token;
}

export default function NewGameFactoryPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [platform, setPlatform] = useState<Platform>('android');
  const [prompt, setPrompt] = useState('');
  const [brief, setBrief] = useState<GameBrief | null>(null);
  const [projectId, setProjectId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [advancedIntake, setAdvancedIntake] = useState({
    project_type: 'other',
    desired_game_or_app_description: '',
    existing_server_provider: '',
    has_vps_or_dedicated_server: false,
    has_backend_api: false,
    has_database: false,
    has_auth_system: false,
    has_realtime_server: false,
    has_domain_ssl: false,
    has_google_play_console: false,
    has_admob_or_ads_account: false,
    has_iap_setup: false,
    one_time_budget_usd: '',
    monthly_infrastructure_budget_usd: '',
    expected_daily_users: '',
    expected_concurrent_users: '',
    target_regions: '',
    required_features: '',
    optional_features: '',
    delivery_mode: 'play_publish' as DeliveryMode
  });
  const [technicalChecks, setTechnicalChecks] = useState<Record<string, boolean>>({
    infra_ack: false,
    backend_ack: false,
    google_play_ack: false,
    monetization_ack: false,
    publish_blocker_ack: false
  });
  const router = useRouter();

  const isCreateDisabled = useMemo(() => loading || prompt.trim().length < 10, [loading, prompt]);

  async function createBrief() {
    setLoading(true);
    setError('');
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/game-factory/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prompt,
          targetPlatform: platform,
          advancedProjectIntake: {
            ...advancedIntake,
            target_regions: advancedIntake.target_regions.split(',').map((item) => item.trim()).filter(Boolean),
            required_features: advancedIntake.required_features.split(',').map((item) => item.trim()).filter(Boolean),
            optional_features: advancedIntake.optional_features.split(',').map((item) => item.trim()).filter(Boolean)
          }
        })
      });

      const raw = await response.text();
      let data: { ok: boolean; error?: string; projectId?: string; brief?: GameBrief };
      try {
        data = JSON.parse(raw) as { ok: boolean; error?: string; projectId?: string; brief?: GameBrief };
      } catch {
        throw new Error('Brief oluşturulurken sunucu yanıtı okunamadı.');
      }

      if (!response.ok || !data.ok || !data.brief || !data.projectId) {
        throw new Error(data.error ?? 'Brief oluşturulamadı.');
      }

      setBrief(data.brief);
      setProjectId(data.projectId);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  }

  async function approveProject() {
    setLoading(true);
    setError('');
    try {
      const googlePlayAccountChoice: GooglePlayAccountChoice =
        brief?.google_play_account_status === 'artifact_only'
          ? 'artifact_only'
          : brief?.google_play_account_status === 'user_has_account'
            ? 'user_has_account'
            : 'user_needs_setup';
      const ackAccountRequired = technicalChecks.google_play_ack;
      const ackUserResponsibilities = technicalChecks.publish_blocker_ack;
      const token = await getAccessToken();
      const confirmationKeys = Object.entries(technicalChecks)
        .filter(([, checked]) => checked)
        .map(([key]) => key);

      const technicalResponse = await fetch('/api/game-factory/technical-checklist/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ projectId, confirmedItems: confirmationKeys })
      });
      const technicalPayload = (await technicalResponse.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!technicalResponse.ok || !technicalPayload?.ok) {
        throw new Error(technicalPayload?.error ?? 'Teknik gereksinim onayı tamamlanamadı.');
      }

      const response = await fetch('/api/game-factory/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          projectId,
          googlePlayAccountStatus: googlePlayAccountChoice,
          confirmations: {
            understandPlayConsoleRequired: ackAccountRequired,
            understandUserResponsibility: ackUserResponsibilities
          }
        })
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? 'Onay işlemi başarısız.');
      }
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  async function startBuild() {
    setLoading(true);
    setError('');
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/game-factory/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ projectId })
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? 'Build başlatılamadı.');
      }
      router.push(`/game-factory/${projectId}/builds`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="panel space-y-4">
      <h1 className="text-3xl font-bold">Yeni Oyun Projesi</h1>
      <p className="text-sm text-white/70">Adım {step}/3</p>

      {step === 1 ? (
        <section className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
          <h2 className="text-xl font-semibold">1) Fikir</h2>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={7}
            placeholder="Oyununu anlat... (örn: 'Türkçe kelime bulmaca oyunu, reklamlarla para kazan, sade görsel')"
            className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setPlatform('android')} className={`rounded-lg px-3 py-2 ${platform === 'android' ? 'bg-neon text-ink' : 'border border-white/20'}`}>
              Android
            </button>
            <button type="button" disabled className="cursor-not-allowed rounded-lg border border-white/10 px-3 py-2 text-white/50">
              iOS (yakında)
            </button>
          </div>
          <div className="space-y-3 rounded-lg border border-white/15 bg-black/20 p-3 text-sm">
            <h3 className="text-base font-semibold">Altyapı ve Bütçe Analizi</h3>
            <p className="text-white/80">
              Gelişmiş online/sunucu gerektiren projeler kullanıcıya ait altyapı veya yönetilen setup gerektirir.
              Koschei, bütçene göre gerçekçi kapsam önerir ve özellikleri MVP + sonraki fazlara bölebilir.
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              <input value={advancedIntake.desired_game_or_app_description} onChange={(event) => setAdvancedIntake((prev) => ({ ...prev, desired_game_or_app_description: event.target.value }))} placeholder="desired_game_or_app_description" className="rounded-lg border border-white/20 bg-black/30 px-2 py-1 md:col-span-2" />
              <input value={advancedIntake.project_type} onChange={(event) => setAdvancedIntake((prev) => ({ ...prev, project_type: event.target.value }))} placeholder="project_type" className="rounded-lg border border-white/20 bg-black/30 px-2 py-1" />
              <input value={advancedIntake.existing_server_provider} onChange={(event) => setAdvancedIntake((prev) => ({ ...prev, existing_server_provider: event.target.value }))} placeholder="existing_server_provider" className="rounded-lg border border-white/20 bg-black/30 px-2 py-1" />
              <input value={advancedIntake.one_time_budget_usd} onChange={(event) => setAdvancedIntake((prev) => ({ ...prev, one_time_budget_usd: event.target.value }))} placeholder="one_time_budget_usd" className="rounded-lg border border-white/20 bg-black/30 px-2 py-1" />
              <input value={advancedIntake.monthly_infrastructure_budget_usd} onChange={(event) => setAdvancedIntake((prev) => ({ ...prev, monthly_infrastructure_budget_usd: event.target.value }))} placeholder="monthly_infrastructure_budget_usd" className="rounded-lg border border-white/20 bg-black/30 px-2 py-1" />
              <input value={advancedIntake.expected_daily_users} onChange={(event) => setAdvancedIntake((prev) => ({ ...prev, expected_daily_users: event.target.value }))} placeholder="expected_daily_users" className="rounded-lg border border-white/20 bg-black/30 px-2 py-1" />
              <input value={advancedIntake.expected_concurrent_users} onChange={(event) => setAdvancedIntake((prev) => ({ ...prev, expected_concurrent_users: event.target.value }))} placeholder="expected_concurrent_users" className="rounded-lg border border-white/20 bg-black/30 px-2 py-1" />
              <input value={advancedIntake.target_regions} onChange={(event) => setAdvancedIntake((prev) => ({ ...prev, target_regions: event.target.value }))} placeholder="target_regions (virgülle)" className="rounded-lg border border-white/20 bg-black/30 px-2 py-1 md:col-span-2" />
              <input value={advancedIntake.required_features} onChange={(event) => setAdvancedIntake((prev) => ({ ...prev, required_features: event.target.value }))} placeholder="required_features (virgülle)" className="rounded-lg border border-white/20 bg-black/30 px-2 py-1 md:col-span-2" />
              <input value={advancedIntake.optional_features} onChange={(event) => setAdvancedIntake((prev) => ({ ...prev, optional_features: event.target.value }))} placeholder="optional_features (virgülle)" className="rounded-lg border border-white/20 bg-black/30 px-2 py-1 md:col-span-2" />
              <select value={advancedIntake.delivery_mode} onChange={(event) => setAdvancedIntake((prev) => ({ ...prev, delivery_mode: event.target.value as DeliveryMode }))} className="rounded-lg border border-white/20 bg-black/30 px-2 py-1">
                <option value="play_publish">play_publish</option>
                <option value="setup_assisted">setup_assisted</option>
                <option value="apk_aab_only">apk_aab_only</option>
              </select>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {([
                ['has_vps_or_dedicated_server', 'VPS/Dedicated server'],
                ['has_backend_api', 'Backend API'],
                ['has_database', 'Database'],
                ['has_auth_system', 'Auth'],
                ['has_realtime_server', 'Realtime server'],
                ['has_domain_ssl', 'Domain+SSL'],
                ['has_google_play_console', 'Google Play Console'],
                ['has_admob_or_ads_account', 'AdMob/Ads account'],
                ['has_iap_setup', 'IAP setup']
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input type="checkbox" checked={advancedIntake[key]} onChange={(event) => setAdvancedIntake((prev) => ({ ...prev, [key]: event.target.checked }))} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
          <button type="button" disabled={isCreateDisabled} onClick={createBrief} className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink disabled:opacity-50">
            Brief Oluştur
          </button>
          {loading ? <p className="animate-pulse text-sm text-white/70">AI brief hazırlıyor...</p> : null}
        </section>
      ) : null}

      {step === 2 && brief ? (
        <section className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
          <h2 className="text-xl font-semibold">2) Brief Önizleme</h2>
          <p><b>Oyun adı:</b> {brief.title}</p>
          <p><b>Paket adı:</b> {brief.packageName}</p>
          <p><b>Oyun tipi:</b> {brief.gameType}</p>
          <p><b>Özet:</b> {brief.summary}</p>
          <p><b>Store kısa açıklama:</b> {brief.storeShortDescription}</p>
          <p><b>Görsel stil:</b> {brief.visualStyle}</p>
          <p><b>Kontroller:</b> {brief.controls}</p>
          <p><b>Google Play gerekliliği:</b> {brief.google_play_required ? 'Gerekli (yayın için)' : 'Gerekli değil'}</p>
          <p><b>Teslim modu:</b> {brief.delivery_mode}</p>
          <ul className="list-disc pl-5">
            {brief.mechanics.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="space-y-2 rounded-lg border border-white/15 bg-black/25 p-3">
            <h3 className="text-base font-semibold">Technical Requirements</h3>
            <p><b>Karmaşıklık:</b> {brief.complexityLevel}</p>
            <p><b>Altyapı seviyesi:</b> {brief.infrastructureLevel}</p>
            <p><b>Gerekli altyapı:</b> {brief.requiredInfrastructure.length ? brief.requiredInfrastructure.join(', ') : 'Yok'}</p>
            <p><b>Google Play hesabı:</b> Gerekli (veya sadece APK/AAB teslim seçeneği)</p>
            <p><b>Server/Backend/DB:</b> {brief.backendRequired ? 'Gerekli' : 'Gerekli değil'}</p>
            <p><b>IAP gereksinimi:</b> {brief.iapRequired ? 'Gerekli' : 'Yok'}</p>
            <p><b>Ads gereksinimi:</b> {brief.adsRequired ? 'Gerekli' : 'Yok'}</p>
            <p><b>Kullanıcı sorumlulukları:</b> Hesap bağlantıları, dış servis kurulumları, politika/uyumluluk belgeleri</p>
            <p><b>Opsiyonel kurulum hizmetleri:</b> Backend/IAP/Ads entegrasyon desteği ayrıca planlanabilir</p>
            <p><b>Özel kapsam:</b> {brief.requires_custom_scope ? 'Gerekli' : 'Gerekli değil'}</p>
            <p><b>Tahmini minimum bütçe:</b> ${brief.estimated_minimum_budget}</p>
            <p><b>Tahmini aylık altyapı:</b> ${brief.estimated_monthly_infrastructure_cost}</p>
            <p><b>Deferred özellikler için gerekli bütçe:</b> ${brief.required_budget_to_include_deferred_features}</p>
            <p><b>Önerilen sonraki adım:</b> {brief.recommended_next_step}</p>
            <p><b>Feasible MVP scope:</b> {brief.feasible_mvp_scope.join(', ') || 'Yok'}</p>
            <p><b>Deferred features:</b> {brief.deferred_features.join(', ') || 'Yok'}</p>
            <p><b>Infrastructure gap analizi:</b> {brief.infrastructure_gap_analysis.join(', ') || 'Yok'}</p>
            <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
              {([
                ['infra_ack', 'I understand this project may require external/user-owned infrastructure.'],
                ['backend_ack', 'I have or will provide the required server/backend/database services.'],
                ['google_play_ack', 'I have a Google Play Console account or choose APK/AAB-only delivery.'],
                ['monetization_ack', 'I understand IAP/ads require additional setup.'],
                ['publish_blocker_ack', 'I understand Koschei cannot publish until required accounts/configuration are connected.']
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={technicalChecks[key]}
                    onChange={(event) => setTechnicalChecks((prev) => ({ ...prev, [key]: event.target.checked }))}
                    className="mt-0.5"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={approveProject} disabled={loading || Object.values(technicalChecks).some((v) => !v)} className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink disabled:opacity-50">
              Onayla ve Devam Et
            </button>
            <button type="button" onClick={() => setStep(1)} disabled={loading} className="rounded-lg border border-white/20 px-4 py-2 disabled:opacity-50">
              Tekrar Oluştur
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
          <h2 className="text-xl font-semibold">3) Build Başlat</h2>
          <p className="text-sm text-white/70">Projen onaylandı. Şimdi ilk build işlemini başlatabilirsin.</p>
          <button type="button" onClick={startBuild} disabled={loading} className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink disabled:opacity-50">
            Build Başlat
          </button>
        </section>
      ) : null}

      {error ? <p className="rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-200">{error}</p> : null}
    </main>
  );
}
