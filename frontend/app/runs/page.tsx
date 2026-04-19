import { Nav } from '@/components/nav';
import { RunsList } from '@/components/runs-list';
import { getAppContextOrRedirect } from '@/lib/app-context';

export const dynamic = 'force-dynamic';

export default async function RunsPage() {
  const { supabase, workspace } = await getAppContextOrRedirect();
  const { data, error } = await supabase
    .from('agent_runs')
    .select('id, status, model_name, user_input, created_at, error_message, completed_at, agent_type_id, agent_types(name, slug)')
    .eq('workspace_id', workspace.workspaceId)
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <main>
      <Nav />
      <section className="panel">
        <h2 className="mb-3 text-xl font-semibold">Çalıştırmalar</h2>
        {error ? (
          <p className="text-sm text-red-300">Run verisi alınamadı: {error.message}</p>
        ) : data && data.length > 0 ? (
          <RunsList runs={data} />
        ) : (
          <p className="text-sm text-white/70">Henüz çalıştırma yok.</p>
        )}
      </section>
    </main>
  );
}
