'use client';

import { useEffect, useState } from 'react';

import { ApiRequestError, postJsonWithSession } from '@/lib/api-client';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { bootstrapWorkspaceForUser, loadCurrentUser } from '@/lib/workspace';

type RunDetail = {
  id: string;
  user_input: string;
  result_text: string | null;
  status: string;
  created_at: string;
  agent_types: {
    name: string;
    slug: string;
  } | null;
};

export default function RunDetailPage({ params }: { params: { id: string } }) {
  const [run, setRun] = useState<RunDetail | null>(null);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    async function loadRunDetail() {
      const supabase = createBrowserSupabase();
      const user = await loadCurrentUser(supabase);
      if (!user) {
        setStatus('Oturum bulunamadı.');
        return;
      }

      const workspace = await bootstrapWorkspaceForUser(supabase, user);

      const { data: runData, error: runError } = await supabase
        .from('agent_runs')
        .select('id, user_input, result_text, status, created_at, agent_types(name, slug)')
        .eq('id', params.id)
        .eq('workspace_id', workspace.id)
        .maybeSingle();

      if (runError) {
        setStatus(runError.message);
        return;
      }

      if (!runData) {
        setStatus('Çalıştırma bulunamadı.');
        return;
      }

      setRun(runData as unknown as RunDetail);

      const { data: savedOutput } = await supabase
        .from('saved_outputs')
        .select('id')
        .eq('agent_run_id', params.id)
        .eq('workspace_id', workspace.id)
        .limit(1)
        .maybeSingle();

      setSaved(Boolean(savedOutput));
    }

    void loadRunDetail();
  }, [params.id]);

  async function onSave() {
    if (!run?.result_text) {
      return;
    }

    try {
      await postJsonWithSession<{ saved: { id: string } }, { runId: string; content: string }>('/api/outputs/save', {
        runId: run.id,
        content: run.result_text,
      });
      setSaved(true);
      setStatus('Çıktı kaydedildi.');
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setStatus(error.message);
        return;
      }

      setStatus(error instanceof Error ? error.message : 'Kaydetme sırasında hata oluştu.');
    }
  }

  if (!run) {
    return <p className="text-sm text-zinc-300">{status || 'Yükleniyor...'}</p>;
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Çalıştırma Detayı</h1>
        <p className="text-zinc-300">
          {run.agent_types?.name ?? run.agent_types?.slug ?? 'Agent'} · {new Date(run.created_at).toLocaleString('tr-TR')}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
        <h2 className="mb-2 text-sm uppercase tracking-wide text-zinc-400">Girdi</h2>
        <p className="whitespace-pre-wrap text-sm text-zinc-100">{run.user_input}</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
        <h2 className="mb-2 text-sm uppercase tracking-wide text-zinc-400">Sonuç</h2>
        <p className="whitespace-pre-wrap text-sm text-zinc-100">{run.result_text ?? 'Sonuç boş.'}</p>
      </div>

      {!saved ? (
        <button
          type="button"
          onClick={onSave}
          className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-400"
        >
          Kaydet
        </button>
      ) : (
        <p className="text-sm text-emerald-300">Bu çıktı kaydedildi.</p>
      )}

      {status ? <p className="text-sm text-zinc-300">{status}</p> : null}
    </section>
  );
}
