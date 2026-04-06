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
  agent_types: {
    name: string;
    slug: string;
  } | null;
};

const PAGE_SIZE = 20;

function truncate(value: string | null | undefined, limit = 140) {
  if (!value) {
    return '-';
  }

  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

export default function RunsPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [error, setError] = useState('');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [agentSlugs, setAgentSlugs] = useState<string[]>([]);

  useEffect(() => {
    async function loadRuns() {
      try {
        setLoadingInitial(true);
        const supabase = createBrowserSupabase();
        const { workspace } = await resolveWorkspaceContext(supabase);
        setWorkspaceId(workspace.id);

        const [{ data: agentTypeData, error: agentTypeError }, { data, error: loadError }] = await Promise.all([
          supabase.from('agent_types').select('slug').eq('is_active', true).order('slug', { ascending: true }),
          supabase
            .from('agent_runs')
            .select('id, status, user_input, result_text, created_at, agent_types(name, slug)')
            .eq('workspace_id', workspace.id)
            .order('created_at', { ascending: false })
            .limit(PAGE_SIZE),
        ]);

        if (agentTypeError || loadError) {
          setError(agentTypeError?.message ?? loadError?.message ?? 'Kayıtlar yüklenemedi.');
          return;
        }

        setAgentSlugs((agentTypeData ?? []).map((item) => String(item.slug)).filter((slug) => slug.length > 0));
        const mappedData = (data ?? []) as unknown as RunRow[];
        const nextCursor = mappedData.length > 0 ? mappedData[mappedData.length - 1]?.created_at ?? null : null;

        setRuns(mappedData);
        setCursor(nextCursor);
        setHasMore(mappedData.length === PAGE_SIZE);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
      } finally {
        setLoadingInitial(false);
      }
    }

    void loadRuns();
  }, []);

  const agentOptions = useMemo(() => {
    const dynamicSlugs = runs.map((run) => run.agent_types?.slug).filter((slug): slug is string => Boolean(slug));
    const unique = Array.from(new Set([...agentSlugs, ...dynamicSlugs]));
    return unique.sort((a, b) => a.localeCompare(b, 'tr'));
  }, [agentSlugs, runs]);

  const visibleRuns = useMemo(() => {
    if (selectedAgent === 'all') {
      return runs;
    }

    return runs.filter((run) => run.agent_types?.slug === selectedAgent);
  }, [runs, selectedAgent]);

  async function handleLoadMore() {
    if (!workspaceId || !cursor || loadingMore) {
      return;
    }

    setLoadingMore(true);
    setError('');

    try {
      const supabase = createBrowserSupabase();
      const { data, error: loadError } = await supabase
        .from('agent_runs')
        .select('id, status, user_input, result_text, created_at, agent_types(name, slug)')
        .eq('workspace_id', workspaceId)
        .lt('created_at', cursor)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (loadError) {
        setError('Daha fazla kayıt yüklenemedi. Lütfen tekrar dene.');
        return;
      }

      const mappedData = (data ?? []) as unknown as RunRow[];
      if (mappedData.length === 0) {
        setHasMore(false);
        return;
      }

      const nextCursor = mappedData[mappedData.length - 1]?.created_at ?? null;
      setRuns((current) => [...current, ...mappedData]);
      setCursor(nextCursor);
      setHasMore(mappedData.length === PAGE_SIZE);
    } catch {
      setError('Daha fazla kayıt yüklenirken beklenmeyen bir hata oluştu.');
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Son çalıştırmalar</h1>
        <label className="flex items-center gap-2 text-sm text-zinc-300" htmlFor="agent-filter">
          Agent filtresi
          <select
            id="agent-filter"
            value={selectedAgent}
            onChange={(event) => setSelectedAgent(event.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 outline-none ring-indigo-400 focus:ring"
          >
            <option value="all">Tüm Agentlar</option>
            {agentOptions.map((slug) => (
              <option key={slug} value={slug}>
                {slug}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p> : null}

      <div className="space-y-3">
        {loadingInitial ? <p className="text-sm text-zinc-400">Kayıtlar yükleniyor...</p> : null}

        {visibleRuns.map((run) => (
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

        {visibleRuns.length === 0 && !error && !loadingInitial ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-300">
            {runs.length === 0 ? 'Henüz bir çalıştırma yok.' : 'Bu filtreye uygun kayıt bulunamadı.'}
          </p>
        ) : null}

        {hasMore ? (
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => {
              void handleLoadMore();
            }}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loadingMore ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
          </button>
        ) : null}
      </div>
    </section>
  );
}
