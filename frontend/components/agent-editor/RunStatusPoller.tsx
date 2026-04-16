'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type RunStatusPollerProps = {
  status: string;
  intervalMs?: number;
  maxPollCount?: number;
};

export function RunStatusPoller({ status, intervalMs = 2500, maxPollCount = 18 }: RunStatusPollerProps) {
  const router = useRouter();
  const pollCountRef = useRef(0);

  useEffect(() => {
    if (status !== 'pending') {
      pollCountRef.current = 0;
      return;
    }

    const timer = window.setInterval(() => {
      pollCountRef.current += 1;
      router.refresh();

      if (pollCountRef.current >= maxPollCount) {
        window.clearInterval(timer);
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [status, intervalMs, maxPollCount, router]);

  return null;
}
