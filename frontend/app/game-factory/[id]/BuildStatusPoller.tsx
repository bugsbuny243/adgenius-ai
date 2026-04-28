'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function BuildStatusPoller({ jobId, token }: { jobId: string; token: string }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/game-factory/build-status?jobId=${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.status === 'success' || data.status === 'failed' || data.status === 'cancelled') {
          clearInterval(interval);
          router.refresh();
        }
      } catch {
        // sessizce devam et
      }
    }, 20_000); // 20 saniyede bir

    return () => clearInterval(interval);
  }, [jobId, token, router]);

  return null;
}
