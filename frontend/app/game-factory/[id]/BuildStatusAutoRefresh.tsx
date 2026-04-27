'use client';

import { useEffect, useState } from 'react';

type Props = {
  jobId: string;
  initialStatus: string | null;
};

export function BuildStatusAutoRefresh({ jobId, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus ?? '-');


  useEffect(() => {
    const normalized = (status ?? '').toLowerCase();
    if (!jobId || (normalized !== 'queued' && normalized !== 'started')) return;

    const timer = setInterval(async () => {
      try {
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

        if (nextStatus === 'success' || nextStatus === 'failure') {
          clearInterval(timer);
        }
      } catch {
        // Sessizce geç: bir sonraki periyotta tekrar dene.
      }
    }, 10000);

    return () => clearInterval(timer);
  }, [jobId, status]);

  return <>{status}</>;
}
