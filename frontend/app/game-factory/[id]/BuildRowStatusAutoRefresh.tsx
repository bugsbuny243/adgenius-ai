'use client';

import { useEffect, useState } from 'react';

type Props = {
  buildId: string;
  initialStatus: string | null;
};

function badge(status: string) {
  if (status === 'queued') return 'bg-amber-500/20 text-amber-200';
  if (status === 'started') return 'bg-blue-500/20 text-blue-200';
  if (status === 'success') return 'bg-emerald-500/20 text-emerald-200';
  if (status === 'failure') return 'bg-red-500/20 text-red-200';
  return 'bg-white/10 text-white';
}

export function BuildRowStatusAutoRefresh({ buildId, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus ?? '-');

  useEffect(() => {
    const normalized = (status ?? '').toLowerCase();
    if (!buildId || (normalized !== 'queued' && normalized !== 'started')) return;

    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/builds/${buildId}/refresh`, { method: 'POST' });
        if (!response.ok) return;

        const payload = (await response.json()) as { newStatus?: string | null; status?: string | null };
        const nextStatus = payload.newStatus ?? payload.status;
        if (!nextStatus) return;

        setStatus(nextStatus);
      } catch {
        // Sessizce geç: bir sonraki periyotta tekrar dene.
      }
    }, 10000);

    return () => clearInterval(timer);
  }, [buildId, status]);

  return <span className={`rounded-full px-3 py-1 text-xs ${badge(status ?? '')}`}>{status}</span>;
}
