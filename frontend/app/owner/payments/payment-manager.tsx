'use client';

import { useState, useTransition } from 'react';

const STATUSES = ['approved', 'rejected', 'cancelled'] as const;

export function PaymentManager() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  function handleUpdate(formData: FormData) {
    const payload = {
      orderId: String(formData.get('order_id') ?? ''),
      status: String(formData.get('status') ?? ''),
      note: String(formData.get('note') ?? '')
    };

    startTransition(async () => {
      const response = await fetch('/api/owner/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as { ok: boolean; error?: string };
      setMessage(result.ok ? 'Ödeme kaydı güncellendi.' : `Hata: ${result.error ?? 'unknown_error'}`);
    });
  }

  return (
    <div className="grid gap-4">
      <form action={handleUpdate} className="grid gap-2 rounded-lg border border-white/10 p-3">
        <p className="text-sm font-medium">Payment order durum güncelle</p>
        <input name="order_id" required placeholder="Payment Order ID" className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm" />
        <select name="status" required defaultValue="approved" className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm">
          {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <textarea name="note" placeholder="Referans / not / red nedeni" rows={3} className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm" />
        <button type="submit" disabled={pending} className="rounded-lg border border-neon/50 px-3 py-2 text-sm text-neon disabled:opacity-50">Kaydet</button>
      </form>

      {message ? <p className="text-xs text-white/70">{message}</p> : null}
    </div>
  );
}
