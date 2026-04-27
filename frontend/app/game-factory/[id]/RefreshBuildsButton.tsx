'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export function RefreshBuildsButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onRefresh() {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      if (!token) return;

      const response = await fetch('/api/game-factory/builds/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ projectId })
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || payload?.ok === false) {
        alert(payload?.error ?? 'Build yenileme sırasında bir hata oluştu.');
      }
    } finally {
      router.refresh();
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="rounded-lg border border-white/20 px-3 py-2 text-sm disabled:opacity-60"
      onClick={onRefresh}
      disabled={loading}
    >
      {loading ? 'Yenileniyor...' : 'Yenile'}
    </button>
  );
}
