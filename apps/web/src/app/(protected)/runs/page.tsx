'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';
import { resolveWorkspaceContext } from '@/lib/workspace';

type RunRow = {
  id: string;
  status: string;
  user_input: string;
  result_text: string | null;
  created_at: string;
  agent_type_id: string;
  agent_types: {
    name: string;
    slug: string;
  } | null;
};

function truncate(value: string | null | undefined, limit = 140): string {
  if (!value) {
    return '-';
  }

  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

const PAGE_SIZE = 20;

export default function RunsPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [workspaceId, setWorkspaceId] = useState('');
  const [selectedAgentTypeId, setSelectedAgentTypeId] = useState('all');

  async function loadRuns(cursorCreatedAt?: string): Promise<void> {
    try {
      const supabase = createBrowserSupabase();

      let currentWorkspaceId = workspaceId;
      if (!currentWorkspaceId) {
        const { workspace } = await resolveWorkspaceContext(supabase);
        currentWorkspaceId = workspace.id;
        setWorkspaceId(workspace.id);
      }

      let query = supabase
        .from('agent_runs')
        .select('id, status, user_input, result_text, created_at, agent_type_id, agent_types(name, slug)')
        .eq('workspace_id', currentWorkspaceId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (selectedAgentTypeId !== 'all') {
        query = query.eq('agent_type_id', selectedAgentTypeId);
      }

      if (cursorCreatedAt) {
        query = query.lt('created_at', cursorCreatedAt);
      }

      const { data, error: loadError } = await query;

      if (loadError) {
        setError(loadError.message);
        return;
      }

      const nextBatch = (data ?? []) as unknown as RunRow[];
      setRuns((prev) => (cursorCreatedAt ? [...prev, ...nextBatch] : nextBatch));
      setHasMore(nextBatch.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    setRuns([]);
    setHasMore(true);
    void loadRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgentTypeId]);

  const agentOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const run of runs) {
      if (run.agent_type_id) {
        map.set(run.agent_type_id, run.agent_types?.name ?? run.agent_types?.slug ?? 'Agent');
      }
    }
    return Array.from(map.entries());
  }, [runs]);

  const lastCreatedAt = runs[runs.length - 1]?.created_at;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Son çalıştırmalar</h1>
        <label className="text-sm text-zinc-300">
          Agent filtresi
          <select
            value={selectedAgentTypeId}
            onChange={(event) => setSelectedAgentTypeId(event.target.value)}
            className="ml-2 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100"
          >
            <option value="all">Tümü</option>
            {agentOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

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

        {loading ? <p className="text-sm text-zinc-300">Çalıştırmalar yükleniyor...</p> : null}

        {runs.length === 0 && !error && !loading ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-300">Henüz bir çalıştırma yok.</p>
        ) : null}

        {hasMore && runs.length > 0 ? (
          <button
            type="button"
            disabled={loadingMore || !lastCreatedAt}
            onClick={() => {
              if (!lastCreatedAt) {
                return;
              }
              setLoadingMore(true);
              void loadRuns(lastCreatedAt);
            }}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500 disabled:opacity-60"
          >
            {loadingMore ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
          </button>
        ) : null}
      </div>
    </section>
  );
}
