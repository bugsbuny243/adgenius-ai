'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type Props = {
  projectId: string;
  initialStatus: string | null;
};

const ACTIVE_STATUSES = new Set(['queued', 'started', 'claimed', 'running', 'senttobuilder', 'restarted']);

export function BuildListAutoRefresh({ projectId, initialStatus }: Props) {
  const router = useRouter();

  useEffect(() => {
    const normalized = (initialStatus ?? '').toLowerCase();
    if (!projectId || !ACTIVE_STATUSES.has(normalized)) return;

    const timer = setInterval(async () => {
      try {
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
      } catch {
        // Sessizce devam et.
      }
    }, 10000);

    return () => clearInterval(timer);
  }, [projectId, initialStatus, router]);

  return null;
}
