'use client';

import { useEffect, useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';
import { resolveWorkspaceContext } from '@/lib/workspace';

type SavedOutputRow = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  agent_runs: {
    agent_types: {
      name: string;
      slug: string;
    } | null;
  } | null;
};

export default function SavedPage() {
  const [rows, setRows] = useState<SavedOutputRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSaved() {
      try {
        const supabase = createBrowserSupabase();
        const { workspace } = await resolveWorkspaceContext(supabase);

        const { data, error: loadError } = await supabase
          .from('saved_outputs')
          .select('id, title, content, created_at, agent_runs(agent_types(name, slug))')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (loadError) {
          setError(loadError.message);
          return;
        }

        setRows((data ?? []) as unknown as SavedOutputRow[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
      }
    }

    void loadSaved();
  }, []);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Kayıtlı çıktılar</h1>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="space-y-3">
        {rows.map((item) => (
          <article key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-medium text-zinc-100">{item.title}</h2>
              <p className="text-xs text-zinc-400">{new Date(item.created_at).toLocaleString('tr-TR')}</p>
            </div>
            <p className="mt-1 text-xs text-zinc-400">{item.agent_runs?.agent_types?.name ?? item.agent_runs?.agent_types?.slug ?? 'Agent'}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">{item.content.slice(0, 260)}...</p>
          </article>
        ))}

        {rows.length === 0 && !error ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-300">Henüz kaydedilmiş çıktı bulunmuyor.</p>
        ) : null}
      </div>
    </section>
  );
}
