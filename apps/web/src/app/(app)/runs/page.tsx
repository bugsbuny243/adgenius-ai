'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';
import { resolveWorkspaceContext } from '@/lib/workspace';

type RunRow = {
  id: string;
  status: string;
  user_input: string;
  result_text: string | null;
  created_at: string;
  agent_types: {
    name: string;
    slug: string;
  } | null;
};

function truncate(value: string | null | undefined, limit = 140) {
  if (!value) {
    return '-';
  }

  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

export default function RunsPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadRuns() {
      try {
        const supabase = createBrowserSupabase();
        const { workspace } = await resolveWorkspaceContext(supabase);

        const { data, error: loadError } = await supabase
          .from('agent_runs')
          .select('id, status, user_input, result_text, created_at, agent_types(name, slug)')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false })
          .limit(30);

        if (loadError) {
          setError(loadError.message);
          return;
        }

        setRuns((data ?? []) as unknown as RunRow[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
      }
    }

    void loadRuns();
  }, []);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Son çalıştırmalar</h1>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="space-y-3">
        {runs.map((run) => (
          <article key={run.id} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-zinc-200">{run.agent_types?.name ?? run.agent_types?.slug ?? 'Agent'}</p>
              <span className="text-xs text-zinc-400">{new Date(run.created_at).toLocaleString('tr-TR')}</span>
            </div>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-400">Durum: {run.status}</p>
            <p className="mt-2 text-sm text-zinc-300">
              <strong>Girdi:</strong> {truncate(run.user_input)}
            </p>
            <p className="mt-1 text-sm text-zinc-300">
              <strong>Sonuç:</strong> {truncate(run.result_text)}
            </p>
            <Link href={`/runs/${run.id}`} className="mt-3 inline-block text-sm text-indigo-300 hover:text-indigo-200">
              Detayı Aç
            </Link>
          </article>
        ))}

        {runs.length === 0 && !error ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-300">Henüz bir çalıştırma yok.</p>
        ) : null}
      </div>
    </section>
  );
}
