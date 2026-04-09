import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const agents = [
  { name: 'Creative Strategist', status: 'Healthy', queue: 3 },
  { name: 'Copy Optimizer', status: 'Healthy', queue: 7 },
  { name: 'Spend Guard', status: 'Attention', queue: 14 }
];

export default async function AgentsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <main>
      <Nav />
      <section className="panel">
        <h2 className="mb-4 text-2xl font-semibold">Agent Operations</h2>
        <div className="space-y-3">
          {agents.map((agent) => (
            <div key={agent.name} className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
              <div>
                <p className="font-medium">{agent.name}</p>
                <p className="text-sm text-white/60">Status: {agent.status}</p>
              </div>
              <p className="text-sm">Queue: {agent.queue}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
