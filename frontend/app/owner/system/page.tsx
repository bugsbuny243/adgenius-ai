import { getOwnerAccessContextOrRedirect } from '@/lib/owner-access';

export default async function OwnerSystemPage() {
  const { supabase, workspaceId } = await getOwnerAccessContextOrRedirect();
  const healthBase = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_ORIGIN ?? 'http://localhost:3000';

  const [projectRes, buildRes, releaseRes, healthResponse] = await Promise.all([
    supabase.from('game_projects').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('game_build_jobs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('game_release_jobs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    fetch(`${healthBase}/api/health`, { cache: 'no-store' }).catch(() => null)
  ]);

  let healthText = 'health check unavailable';
  let diagnostics: Record<string, boolean> = {};
  if (healthResponse?.ok) {
    const payload = (await healthResponse.json()) as {
      ok?: boolean;
      githubUnityConfigured?: boolean;
      unityBuildConfigured?: boolean;
      googleOAuthConfigured?: boolean;
      googlePlayEncryptionConfigured?: boolean;
      supabase?: boolean;
    };
    healthText = payload.ok ? 'healthy' : 'degraded';
    diagnostics = {
      supabase: Boolean(payload.supabase),
      githubUnityConfigured: Boolean(payload.githubUnityConfigured),
      unityBuildConfigured: Boolean(payload.unityBuildConfigured),
      googleOAuthConfigured: Boolean(payload.googleOAuthConfigured),
      googlePlayEncryptionConfigured: Boolean(payload.googlePlayEncryptionConfigured)
    };
  }

  return (
    <section className="panel">
      <h2 className="text-lg font-semibold">System status</h2>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
        <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Health: {healthText}</p>
        <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Game projects: {projectRes.count ?? 0}</p>
        <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Build jobs: {buildRes.count ?? 0}</p>
        <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Release jobs: {releaseRes.count ?? 0}</p>
      </div>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(diagnostics).map(([key, value]) => (
          <p key={key} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            {key}: {value ? 'hazır' : 'kurulum gerekli'}
          </p>
        ))}
      </div>
      <p className="mt-3 text-xs text-white/60">Provider secrets and integration keys remain server-side and are not rendered in this panel.</p>
    </section>
  );
}
