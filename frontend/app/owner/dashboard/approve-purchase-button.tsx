'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export function ApprovePurchaseButton({ purchaseId }: { purchaseId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  function handleApprove() {
    startTransition(async () => {
      const response = await fetch(`/api/owner/package-purchases/${purchaseId}/approve`, { method: 'PATCH' });
      const result = (await response.json().catch(() => ({ ok: false, error: 'unknown_error' }))) as { ok: boolean; error?: string };
      if (!result.ok) {
        setMessage(`Hata: ${result.error ?? 'unknown_error'}`);
        return;
      }
      setMessage('Onaylandı');
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={handleApprove} disabled={pending} className="rounded-lg border border-neon/50 px-2 py-1 text-xs text-neon disabled:opacity-50">
        {pending ? 'Onaylanıyor...' : 'Onayla'}
      </button>
      {message ? <span className="text-xs text-white/70">{message}</span> : null}
    </div>
  );
}
