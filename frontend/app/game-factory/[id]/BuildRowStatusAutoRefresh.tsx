'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type Props = {
  buildId: string;
  projectId: string;
  initialStatus: string | null;
};

function badge(status: string) {
  if (status === 'queued') return 'bg-amber-500/20 text-amber-200';
  if (status === 'claimed' || status === 'running' || status === 'started') return 'bg-blue-500/20 text-blue-200';
  if (status === 'success') return 'bg-emerald-500/20 text-emerald-200';
  if (status === 'failure') return 'bg-red-500/20 text-red-200';
  return 'bg-white/10 text-white';
}

export function BuildRowStatusAutoRefresh({ buildId, projectId, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus ?? '-');

  useEffect(() => {
    const normalized = (status ?? '').toLowerCase();
    const shouldPoll = normalized === 'queued' || normalized === 'started';
    if (!buildId || !projectId || !shouldPoll) return;

    const timer = setInterval(async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        if (!supabase) return;
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) return;

        const response = await fetch('/api/game-factory/builds/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ projectId })
        });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          newStatus?: string | null;
          status?: string | null;
          results?: Array<{ jobId?: string; newStatus?: string | null; previousStatus?: string | null }>;
        };
        const matchedJob = payload.results?.find((item) => item.jobId === buildId);
        let nextStatus = (matchedJob?.newStatus ?? payload.newStatus ?? payload.status)?.toLowerCase() ?? null;

        if (!nextStatus) {
          const { data: latestRow } = await supabase
            .from('unity_build_jobs')
            .select('status')
            .eq('id', buildId)
            .maybeSingle();
          nextStatus = (latestRow?.status ?? '').toLowerCase() || null;
        }

        if (!nextStatus) return;

        setStatus(nextStatus);

        if (nextStatus === 'success' || nextStatus === 'failure') {
          clearInterval(timer);
        }
      } catch {
        // Sessizce geç: bir sonraki periyotta tekrar dene.
      }
    }, 10000);

    return () => clearInterval(timer);
  }, [buildId, projectId, status]);

  return <span className={`rounded-full px-3 py-1 text-xs ${badge((status ?? '').toLowerCase())}`}>{status}</span>;
}
