'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type BuildSnapshot = {
  id: string;
  status: string | null;
};

type Props = {
  projectId: string;
  builds: BuildSnapshot[];
};

function normalizeStatus(status: string | null | undefined): string {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'success') return 'succeeded';
  if (normalized === 'failure') return 'failed';
  if (normalized === 'canceled') return 'cancelled';
  return normalized;
}

function isTerminal(status: string): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'cancelled';
}

function shouldPoll(status: string): boolean {
  return status === 'queued' || status === 'started' || status === 'running' || status === 'claimed';
}

export function BuildListAutoRefresh({ projectId, builds }: Props) {
  const initialStatuses = useMemo(() => {
    return Object.fromEntries(builds.map((build) => [build.id, normalizeStatus(build.status)]));
  }, [builds]);

  const [buildStatuses, setBuildStatuses] = useState<Record<string, string>>(initialStatuses);
  const statusesRef = useRef(buildStatuses);

  useEffect(() => {
    statusesRef.current = buildStatuses;
  }, [buildStatuses]);

  const hasActiveBuild = useMemo(() => {
    return Object.values(buildStatuses).some((status) => shouldPoll(status));
  }, [buildStatuses]);

  useEffect(() => {
    if (!projectId || !hasActiveBuild) return;

    const intervalId = setInterval(async () => {
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
          results?: Array<{ jobId?: string; previousStatus?: string | null; newStatus?: string | null }>;
        };
        if (!payload.results?.length) return;

        const currentStatuses = statusesRef.current;
        const nextStatuses = { ...currentStatuses };
        let hasStatusChange = false;

        for (const result of payload.results) {
          const jobId = result.jobId;
          if (!jobId || !(jobId in nextStatuses)) continue;

          const previous = normalizeStatus(result.previousStatus ?? nextStatuses[jobId]);
          const next = normalizeStatus(result.newStatus ?? previous);
          nextStatuses[jobId] = next;

          if (previous && next && previous !== next) {
            hasStatusChange = true;
          }
        }

        statusesRef.current = nextStatuses;
        setBuildStatuses(nextStatuses);

        const allTerminal = Object.values(nextStatuses).every((status) => status && isTerminal(status));
        if (allTerminal) {
          clearInterval(intervalId);
        }

        if (hasStatusChange) {
          window.location.reload();
        }
      } catch {
        // Sessizce devam et.
      }
    }, 15000);

    return () => clearInterval(intervalId);
  }, [hasActiveBuild, projectId]);

  return null;
}
