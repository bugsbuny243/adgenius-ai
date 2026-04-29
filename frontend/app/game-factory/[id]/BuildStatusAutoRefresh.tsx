'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type Props = {
  jobId?: string | null;
  projectId?: string | null;
  initialStatus?: string | null;
  withLabel?: boolean;
};

const ACTIVE_STATUSES = new Set(['queued', 'claimed', 'running', 'started', 'senttobuilder', 'restarted']);

export function BuildStatusAutoRefresh({ jobId, projectId, initialStatus, withLabel = false }: Props) {
  const [status, setStatus] = useState(initialStatus ?? '-');
  const router = useRouter();

  useEffect(() => {
    const normalized = (status ?? '').toLowerCase();
    const shouldPollByStatus = ACTIVE_STATUSES.has(normalized);
    const shouldPollProject = Boolean(projectId);

    if ((!jobId || !shouldPollByStatus) && !shouldPollProject) return;

    const timer = setInterval(async () => {
      try {
        if (shouldPollProject && projectId) {
          const supabase = createSupabaseBrowserClient();
          const token = (await supabase?.auth.getSession())?.data.session?.access_token;
          if (!token) return;

          const response = await fetch('/api/game-factory/builds/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ projectId })
          });

          if (response.ok) {
            router.refresh();
          }
        }

        if (jobId && shouldPollByStatus) {
          const response = await fetch('/api/builds/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId })
          });

          if (!response.ok) return;

          const payload = (await response.json()) as { newStatus?: string | null; status?: string | null };
          const nextStatus = payload.newStatus ?? payload.status;
          if (!nextStatus) return;

          setStatus(nextStatus);

          if (!ACTIVE_STATUSES.has(nextStatus.toLowerCase())) {
            clearInterval(timer);
          }
        }
      } catch {
        // Sessizce geç: bir sonraki periyotta tekrar dene.
      }
    }, 10000);

    return () => clearInterval(timer);
  }, [jobId, projectId, router, status]);

  return withLabel ? <>{status}</> : null;
}
