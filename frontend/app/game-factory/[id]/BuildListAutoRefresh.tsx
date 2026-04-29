'use client';

import { useEffect } from 'react';

type BuildSnapshot = {
  id: string;
  status: string | null;
};

type Props = {
  builds: BuildSnapshot[];
};

export function BuildListAutoRefresh({ builds }: Props) {
  useEffect(() => {
    const hasActive = builds.some((b) => b.status === 'queued' || b.status === 'started');
    if (!hasActive) return;

    const interval = setInterval(async () => {
      const res = await fetch('/api/game-factory/builds/refresh', { method: 'POST' });
      const data = await res.json();
      if (data.results?.some((r: { newStatus?: string }) => r.newStatus === 'succeeded' || r.newStatus === 'success')) {
        window.location.reload();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [builds]);

  return null;
}
