import { Nav } from '@/components/nav';
import { getAppContextOrRedirect } from '@/lib/app-context';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function toDisplayModel(modelName: string | null): string {
  if (!modelName) return 'AI motoru';
  return 'AI motoru';
}

function toDisplayStatus(status: string): string {
  if (status === 'completed') return 'Tamamlandı';
  if (status === 'processing') return 'İşleniyor';
  if (status === 'pending') return 'Sırada';
  if (status === 'failed') return 'Hata';
  return status;
}

export default async function DashboardPage() {
  try {
    const { supabase, workspace } = await getAppContextOrRedirect();

    const [
      projectsRes,
      runsRes,
      savedRes,
      recentRunsRes,
      recentSavedRes,
      workspaceMembersRes
    ] = await Promise.all([
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.workspaceId),
      supabase.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.workspaceId),
      supabase.from('saved_outputs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.workspaceId),
      supabase
        .from('agent_runs')
        .select('id, status, model_name, error_message, user_input, created_at, completed_at')
        .eq('workspace_id', workspace.workspaceId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('saved_outputs')
        .select('id, title, content, created_at')
        .eq('workspace_id', workspace.workspaceId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('workspace_members').select('workspace_id', { count: 'exact', head: true }).eq('workspace_id', workspace.workspaceId)
    ]);

    const metrics = {
      projects: projectsRes.count ?? 0,
      runs: runsRes.count ?? 0,
      saved: savedRes.count ?? 0,
      members: workspaceMembersRes.count ?? 0
    };

    return (
      <main>
        <Nav />
        <section className="panel mb-4">
          <h2 className="text-lg font-semibold">Çalışma Alanı</h2>
          <p className="text-white/70">{workspace.workspaceName}</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Proje" value={metrics.projects} />
          <MetricCard title="Çalıştırma" value={metrics.runs} />
          <MetricCard title="Kaydedilen Çıktı" value={metrics.saved} />
          <MetricCard title="Üye" value={metrics.members} />
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="panel">
            <h3 className="mb-3 text-lg font-semibold">Son Çalıştırmalar</h3>
            {recentRunsRes.error ? (
              <p className="text-sm text-red-300">Çalıştırmalar alınamadı: {recentRunsRes.error.message}</p>
            ) : recentRunsRes.data && recentRunsRes.data.length > 0 ? (
              <div className="space-y-2 text-sm">
                {recentRunsRes.data.map((run) => (
                  <div key={run.id} className="rounded-lg border border-white/10 px-3 py-2">
                    <p>Durum: {run.status}</p>
                    <p className="text-white/70">Etiket: {toDisplayStatus(run.status)}</p>
                    <p className="text-white/70">Çalışma motoru: {toDisplayModel(run.model_name)}</p>
                    <p className="line-clamp-2 text-white/65">{run.user_input || 'İstem kaydı yok.'}</p>
                    <p className="text-white/70">{new Date(run.created_at).toLocaleString('tr-TR')}</p>
                    {run.completed_at ? <p className="text-white/60">Tamamlanma: {new Date(run.completed_at).toLocaleString('tr-TR')}</p> : null}
                    {run.status === 'failed' && run.error_message ? <p className="text-red-200">Hata: {run.error_message}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/70">Henüz çalıştırma yok.</p>
            )}
          </article>

          <article className="panel">
            <h3 className="mb-3 text-lg font-semibold">Son Kaydedilenler</h3>
            {recentSavedRes.error ? (
              <p className="text-sm text-red-300">Kayıtlar alınamadı: {recentSavedRes.error.message}</p>
            ) : recentSavedRes.data && recentSavedRes.data.length > 0 ? (
              <div className="space-y-2 text-sm">
                {recentSavedRes.data.map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/10 px-3 py-2">
                    <p className="font-medium">{item.title ?? 'Kaydedilen çıktı'}</p>
                    <p className="line-clamp-2 text-white/70">{item.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/70">Henüz kaydedilen çıktı yok.</p>
            )}
          </article>
        </section>
      </main>
    );
  } catch (error) {
    return (
      <main>
        <Nav />
        <section className="panel">
          <h2 className="text-lg font-semibold">Dashboard geçici olarak kullanılamıyor</h2>
          <p className="mt-2 text-sm text-white/70">
            Sistem çekirdek servisleri hazır değil ya da çalışma alanı başlatılamadı.
          </p>
          <p className="mt-2 text-xs text-red-300">{error instanceof Error ? error.message : 'Bilinmeyen hata'}</p>
        </section>
      </main>
    );
  }
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <article className="panel">
      <h2 className="text-sm text-white/70">{title}</h2>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </article>
  );
}
