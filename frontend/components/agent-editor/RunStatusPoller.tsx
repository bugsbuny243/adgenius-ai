'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type RunStatusPollerProps = {
  runId: string;
  status: string;
  intervalMs?: number;
  maxPollCount?: number;
};

export function RunStatusPoller({ runId, status, intervalMs = 2500, maxPollCount = 120 }: RunStatusPollerProps) {
  const router = useRouter();
  const pollCountRef = useRef(0);
  const isPollingStatus = status === 'pending' || status === 'processing';

  useEffect(() => {
    if (!isPollingStatus) {
      pollCountRef.current = 0;
      return;
    }

    router.refresh();
    const timer = window.setInterval(() => {
      pollCountRef.current += 1;
      router.refresh();

      if (pollCountRef.current >= maxPollCount) {
        window.clearInterval(timer);
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [runId, isPollingStatus, intervalMs, maxPollCount, router]);

  return null;
}
