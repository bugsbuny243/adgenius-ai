'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';
import { bootstrapWorkspaceForUser, loadCurrentUser } from '@/lib/workspace';

type RunRow = {
  id: string;
  status: string;
  result_text: string | null;
  created_at: string;
  agent_types: {
    name: string;
    slug: string;
  } | null;
};

export default function RunsPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadRuns() {
      const supabase = createBrowserSupabase();
      const user = await loadCurrentUser(supabase);

      if (!user) {
        setError('Oturum bulunamadı.');
        return;
      }

      const workspace = await bootstrapWorkspaceForUser(supabase, user);
      const { data, error: loadError } = await supabase
        .from('agent_runs')
        .select('id, status, result_text, created_at, agent_types(name, slug)')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (loadError) {
        setError(loadError.message);
        return;
      }

      setRuns((data ?? []) as unknown as RunRow[]);
    }

    void loadRuns();
  }, []);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Çalıştırma Geçmişi</h1>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="space-y-3">
        {runs.map((run) => (
          <article key={run.id} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-zinc-200">
                {run.agent_types?.name ?? run.agent_types?.slug ?? 'Agent'}
              </p>
              <span className="text-xs text-zinc-400">{new Date(run.created_at).toLocaleString('tr-TR')}</span>
            </div>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-400">Durum: {run.status}</p>
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-300">
              {run.result_text || 'Bu çalıştırmada sonuç metni yok.'}
            </p>
            <Link href={`/runs/${run.id}`} className="mt-3 inline-block text-sm text-indigo-300 hover:text-indigo-200">
              Detayı Aç
            </Link>
          </article>
        ))}

        {runs.length === 0 && !error ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-300">
            Henüz bir çalıştırma yok.
          </p>
        ) : null}
      </div>
    </section>
  );
}
