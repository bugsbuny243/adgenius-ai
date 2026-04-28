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
      if (!token) {
        alert('Oturum bulunamadı.');
        return;
      }

      const response = await fetch('/api/game-factory/builds/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ projectId })
      });

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.toLowerCase().includes('application/json')) {
        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; error?: string; errors?: Array<string | { message?: string }> }
          | null;

        if (!response.ok || payload?.ok === false) {
          const firstError = payload?.errors?.[0];
          const firstErrorText = typeof firstError === 'string' ? firstError : firstError?.message;
          alert(payload?.error ?? firstErrorText ?? `HTTP ${response.status}`);
          return;
        }

        if (payload?.errors?.length) {
          const firstError = payload.errors[0];
          const firstErrorText = typeof firstError === 'string' ? firstError : firstError?.message;
          if (firstErrorText) alert(firstErrorText);
        }

        router.refresh();
        return;
      }

      const text = await response.text();
      if (!response.ok) {
        alert(`HTTP ${response.status}: ${text.slice(0, 300)}`);
        return;
      }

      router.refresh();
    } finally {
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
