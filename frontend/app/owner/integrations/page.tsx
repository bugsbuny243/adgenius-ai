import { requirePlatformOwner } from '@/lib/owner-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

function getMaskedStatus(name: string) {
  const value = process.env[name]?.trim() ?? '';
  return {
    hasValue: value.length > 0,
    length: value.length
  };
}

export default async function OwnerIntegrationsPage() {
  await requirePlatformOwner();
  const supabase = createSupabaseServiceRoleClient();

  const [{ count: googlePlayUserIntegrationCount }, { count: openAiModelConfigCount }] = await Promise.all([
    supabase.from('google_play_integrations').select('id', { count: 'exact', head: true }),
    supabase.from('billing_events').select('id', { count: 'exact', head: true }).ilike('event_type', '%model%')
  ]);

  const rows = [
    ['GITHUB_UNITY_REPO_OWNER', getMaskedStatus('GITHUB_UNITY_REPO_OWNER')],
    ['GITHUB_UNITY_REPO_NAME', getMaskedStatus('GITHUB_UNITY_REPO_NAME')],
    ['GITHUB_UNITY_REPO_BRANCH', getMaskedStatus('GITHUB_UNITY_REPO_BRANCH')],
    ['GITHUB_UNITY_REPO_AUTH_TOKEN', getMaskedStatus('GITHUB_UNITY_REPO_AUTH_TOKEN')],
    ['UNITY_ORG_ID', getMaskedStatus('UNITY_ORG_ID')],
    ['UNITY_PROJECT_ID', getMaskedStatus('UNITY_PROJECT_ID')],
    ['UNITY_BUILD_TARGET_ID', getMaskedStatus('UNITY_BUILD_TARGET_ID')],
    ['UNITY_SERVICE_ACCOUNT_KEY_ID', getMaskedStatus('UNITY_SERVICE_ACCOUNT_KEY_ID')],
    ['UNITY_SERVICE_ACCOUNT_SECRET', getMaskedStatus('UNITY_SERVICE_ACCOUNT_SECRET')],
    ['SUPABASE_URL', getMaskedStatus('SUPABASE_URL')],
    ['SUPABASE_ANON_KEY', getMaskedStatus('SUPABASE_ANON_KEY')],
    ['SUPABASE_SERVER_KEY', getMaskedStatus('SUPABASE_SERVER_KEY')],
    ['GOOGLE_PLAY_DEFAULT_TRACK', getMaskedStatus('GOOGLE_PLAY_DEFAULT_TRACK')],
    ['OPENAI_API_KEY', getMaskedStatus('OPENAI_API_KEY')]
  ] as const;

  return (
    <section className="panel">
      <h2 className="text-lg font-semibold">Sistem Entegrasyonları</h2>
      <p className="mt-1 text-sm text-white/70">Sadece var/yok ve uzunluk bilgisi gösterilir; gerçek secret değerleri asla gösterilmez.</p>

      <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
        {rows.map(([key, info]) => (
          <p key={key} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            {key}: {info.hasValue ? 'var' : 'yok'} (uzunluk: {info.length})
          </p>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
        <p>Google Play kullanıcı entegrasyon sayısı: {googlePlayUserIntegrationCount ?? 0}</p>
        <p>Google Play durum: {(googlePlayUserIntegrationCount ?? 0) > 0 ? 'connected' : 'requires setup'}</p>
        <p>OpenAI model config durumu: {(openAiModelConfigCount ?? 0) > 0 ? 'configured' : 'basic env-only config'}</p>
      </div>
    </section>
  );
}
