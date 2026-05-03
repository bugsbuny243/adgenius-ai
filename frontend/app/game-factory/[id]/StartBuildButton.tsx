'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export function StartBuildButton({ projectId, workspaceId }: { projectId: string; workspaceId?: string | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);
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
        // İŞTE BURAYI DEĞİŞTİRDİK! username ve gameName eklendi.
        body: JSON.stringify({ projectId, username: "admin", gameName: "koschei_oyun" })
      });

      const payload = (await response.json()) as { ok: boolean; error?: string };

      if (response.status === 403) {
        setShowPaywall(true);
        return;
      }
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
      {showPaywall ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/20 bg-zinc-900 p-5">
            <h3 className="text-lg font-semibold">Aktif Paket Gerekli</h3>
            <p className="mt-2 text-sm text-white/80">Bu işlem için aktif bir pakete ihtiyacınız var.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg border border-white/20 px-3 py-2 text-sm" onClick={() => setShowPaywall(false)}>Kapat</button>
              <button
                type="button"
                className="rounded-lg bg-neon px-3 py-2 text-sm font-semibold text-ink"
                onClick={() => router.push('/pricing')}
              >
                Paketleri Gör
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
