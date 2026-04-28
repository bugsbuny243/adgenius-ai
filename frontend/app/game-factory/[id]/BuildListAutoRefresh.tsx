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
    const hasActive = builds.some((b) => {
      const status = (b.status ?? '').toLowerCase();
      return status === 'queued' || status === 'started';
    });

    if (!hasActive) return;

    const interval = setInterval(async () => {
      const res = await fetch('/api/game-factory/builds/refresh', { method: 'POST' });
      if (res.ok) {
        window.location.reload();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [builds]);

  return null;
}
