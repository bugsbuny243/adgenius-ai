'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function StartBuildButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const supabase = (await import('@/lib/supabase-browser')).createSupabaseBrowserClient();
      if (!supabase) { setError('Supabase yapılandırması eksik.'); return; }
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) { setError('Oturum bulunamadı.'); return; }

      const res = await fetch('/api/game-factory/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ projectId }),
      });

      const data = await res.json();
      if (!data.ok) { setError(data.error ?? 'Build başlatılamadı.'); return; }

      router.refresh();
    } catch {
      setError('Bağlantı hatası. Tekrar dene.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-xl bg-neon px-5 py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {loading ? 'Build başlatılıyor...' : 'Yeni Build Başlat'}
      </button>
      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
    </div>
  );
}
