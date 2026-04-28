'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type Platform = 'android' | 'ios';
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
  delivery_mode: 'apk_aab_only' | 'play_publish' | 'setup_assisted';
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
        body: JSON.stringify({ prompt, targetPlatform: platform })
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
