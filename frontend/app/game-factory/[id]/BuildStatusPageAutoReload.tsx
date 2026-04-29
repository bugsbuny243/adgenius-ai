'use client';

import { useEffect } from 'react';

type Props = {
  status: string | null | undefined;
};

export function BuildStatusPageAutoReload({ status }: Props) {
  useEffect(() => {
    const normalized = (status ?? '').toLowerCase();
    if (normalized !== 'queued' && normalized !== 'started') return;

    const intervalId = setInterval(() => {
      window.location.reload();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [status]);

  return null;
}
