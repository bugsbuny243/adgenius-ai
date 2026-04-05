'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { getJsonWithSession } from '@/lib/api-client';

type AgentRow = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  description: string | null;
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAgents() {
      try {
        const response = await getJsonWithSession<{ items: AgentRow[] }>('/api/agents/catalog');
        setAgents(response.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Agent listesi yüklenemedi.');
      }
    }

    void loadAgents();
  }, []);

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Agent kataloğu</h1>
        <p className="text-zinc-300">İhtiyacına uygun agentı seç, görevi gir ve saniyeler içinde sonuç al.</p>
      </div>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <article key={agent.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <p className="text-2xl">{agent.icon ?? '🤖'}</p>
            <h2 className="mt-2 text-lg font-medium">{agent.name}</h2>
            <p className="mt-2 text-sm text-zinc-300">{agent.description}</p>
            <Link
              href={`/agents/${agent.slug}`}
              className="mt-4 inline-flex rounded-lg bg-indigo-500 px-3 py-2 text-sm text-white hover:bg-indigo-400"
            >
              Agentı Aç
            </Link>
          </article>
        ))}
      </div>
      {!error && agents.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-300">Aktif agent bulunamadı.</p>
      ) : null}
    </section>
  );
}
