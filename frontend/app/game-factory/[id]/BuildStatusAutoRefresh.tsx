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
        const response = await fetch(`/api/builds/${jobId}/refresh`, {
          method: 'POST'
        });

        if (!response.ok) return;

        const payload = (await response.json()) as { status?: string | null };
        if (payload.status) {
          setStatus(payload.status);
        }
      } catch {
        // Sessizce geç: bir sonraki periyotta tekrar dene.
      }
    }, 15000);

    return () => clearInterval(timer);
  }, [jobId, status]);

  return <>{status}</>;
}
