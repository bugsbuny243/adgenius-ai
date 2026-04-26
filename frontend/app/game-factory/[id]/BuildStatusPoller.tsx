'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export function BuildStatusPoller({ activeJobId }: { activeJobId: string | null }) {
  const router = useRouter();

  useEffect(() => {
    if (!activeJobId) return;

    const timer = setInterval(async () => {
      const supabase = createSupabaseBrowserClient();
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      if (!token) return;

      await fetch(`/api/game-factory/build-status?jobId=${activeJobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      router.refresh();
    }, 30000);

    return () => clearInterval(timer);
  }, [activeJobId, router]);

  return null;
}
