import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Nav } from '@/components/nav';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AgentsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { workspaceId } = await getWorkspaceContext();

  const { data: agents, error } = await supabase
    .from('agent_types')
    .select('id, key, name, description, model_name, is_active')
    .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to load agents: ${error.message}`);
  }

  return (
    <main>
      <Nav />
      <section className="panel">
        <h2 className="mb-4 text-2xl font-semibold">Agent Registry</h2>
        {agents && agents.length > 0 ? (
          <div className="space-y-3">
            {agents.map((agent) => (
              <div key={agent.id} className="rounded-xl border border-white/10 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{agent.name}</p>
                    <p className="text-sm text-white/60">Key: {agent.key}</p>
                    <p className="text-sm text-white/60">Model: {agent.model_name}</p>
                    <p className="mt-1 text-sm text-white/80">{agent.description || 'No description yet.'}</p>
                  </div>
                  <span className="rounded-md border border-white/10 px-2 py-1 text-xs uppercase text-white/70">
                    {agent.is_active ? 'active' : 'inactive'}
                  </span>
                </div>
                <div className="mt-3">
                  <Link href={`/agents/${agent.id}`} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:border-neon">
                    Run agent
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/70">No agent types found in this workspace yet.</p>
        )}
      </section>
    </main>
  );
}
