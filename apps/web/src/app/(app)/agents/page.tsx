import Link from 'next/link';

import { agents } from '@/lib/agents';

export default function AgentsPage() {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Agent Kataloğu</h1>
        <p className="text-zinc-300">İhtiyacına uygun agentı seç, görevi gir ve saniyeler içinde sonuç al.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <article key={agent.slug} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <p className="text-2xl">{agent.icon}</p>
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
    </section>
  );
}
