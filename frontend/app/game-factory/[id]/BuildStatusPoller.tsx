'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export function BuildStatusPoller({ activeJobId, projectId }: { activeJobId: string | null; projectId: string }) {
  const router = useRouter();

  useEffect(() => {
    if (!activeJobId) return;

    const timer = setInterval(async () => {
      const supabase = createSupabaseBrowserClient();
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      if (!token) return;

      await fetch('/api/game-factory/builds/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ projectId })
      });
      router.refresh();
    }, 30000);

    return () => clearInterval(timer);
  }, [activeJobId, projectId, router]);

  return null;
}
