'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export function StartBuildButton({ projectId, workspaceId }: { projectId: string; workspaceId?: string | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function onClick() {
    setLoading(true);
    setError('');
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error('Supabase yapılandırması eksik.');
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı.');

      const response = await fetch('/api/game-factory/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(workspaceId ? { 'x-workspace-id': workspaceId } : {})
        },
        body: JSON.stringify({ projectId })
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Build başlatılamadı.');
      router.push(`/game-factory/${projectId}/builds`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={onClick} disabled={loading} className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink disabled:opacity-60">
        Yeni Build Başlat
      </button>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
