'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { SiteFooter } from '@/components/layout/footer';
import { SiteNavbar } from '@/components/layout/navbar';
import { createBrowserSupabase } from '@/lib/supabase/client';

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
      const supabase = createBrowserSupabase();
      const { data, error: loadError } = await supabase
        .from('agent_types')
        .select('id, slug, name, icon, description')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (loadError) {
        setError(loadError.message);
        return;
      }

      setAgents(data ?? []);
    }

    void loadAgents();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-12">
        <header>
          <h1 className="text-3xl font-semibold md:text-4xl">Koschei Agent Kataloğu</h1>
          <p className="mt-2 max-w-3xl text-zinc-300">
            Agent türünü seç, görevi yaz ve task composer içinde tek akışta sonucu üret, düzenle ve kaydet.
          </p>
        </header>

        {error ? <p className="rounded-lg border border-rose-800 bg-rose-950/50 p-3 text-sm text-rose-200">{error}</p> : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <article key={agent.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <p className="text-2xl">{agent.icon ?? '🤖'}</p>
              <h2 className="mt-2 text-lg font-medium">{agent.name}</h2>
              <p className="mt-2 text-sm text-zinc-300">{agent.description ?? 'Bu agent ile görev akışını hızlıca başlatın.'}</p>
              <Link
                href={`/agents/${agent.slug}`}
                className="mt-4 inline-flex rounded-lg bg-indigo-500 px-3 py-2 text-sm text-white hover:bg-indigo-400"
              >
                Agentı Aç
              </Link>
            </article>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
