'use client';

import { useEffect, useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';
import { bootstrapWorkspaceForUser, loadCurrentUser } from '@/lib/workspace';

type SavedOutputRow = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

export default function SavedPage() {
  const [rows, setRows] = useState<SavedOutputRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSaved() {
      const supabase = createBrowserSupabase();
      const user = await loadCurrentUser(supabase);

      if (!user) {
        setError('Oturum bulunamadı.');
        return;
      }

      const workspace = await bootstrapWorkspaceForUser(supabase, user);
      const { data, error: loadError } = await supabase
        .from('saved_outputs')
        .select('id, title, content, created_at')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (loadError) {
        setError(loadError.message);
        return;
      }

      setRows(data ?? []);
    }

    void loadSaved();
  }, []);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Kaydedilenler</h1>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="space-y-3">
        {rows.map((item) => (
          <article key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <h2 className="text-base font-medium text-zinc-100">{item.title}</h2>
            <p className="mt-1 text-xs text-zinc-400">{new Date(item.created_at).toLocaleString('tr-TR')}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">{item.content.slice(0, 240)}...</p>
          </article>
        ))}

        {rows.length === 0 && !error ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-300">
            Henüz kaydedilmiş çıktı bulunmuyor.
          </p>
        ) : null}
      </div>
    </section>
  );
}
