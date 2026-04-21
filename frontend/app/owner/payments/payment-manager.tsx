'use client';

import { useState, useTransition } from 'react';

const STATUSES = ['pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled'] as const;

export function PaymentManager() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  function handleCreate(formData: FormData) {
    const payload = {
      reference: String(formData.get('reference') ?? ''),
      amount: Number(formData.get('amount') ?? 0),
      currency: String(formData.get('currency') ?? 'USD'),
      status: String(formData.get('status') ?? 'pending'),
      notes: String(formData.get('notes') ?? '')
    };

    startTransition(async () => {
      const response = await fetch('/api/owner/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as { ok: boolean; error?: string };
      setMessage(result.ok ? 'Payment record created.' : `Failed: ${result.error ?? 'unknown_error'}`);
    });
  }

  function handleUpdate(formData: FormData) {
    const payload = {
      payment_id: String(formData.get('payment_id') ?? ''),
      status: String(formData.get('update_status') ?? ''),
      notes: String(formData.get('update_notes') ?? '')
    };

    startTransition(async () => {
      const response = await fetch('/api/owner/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as { ok: boolean; error?: string };
      setMessage(result.ok ? 'Payment status updated.' : `Failed: ${result.error ?? 'unknown_error'}`);
    });
  }

  return (
    <div className="grid gap-4">
      <form action={handleCreate} className="grid gap-2 rounded-lg border border-white/10 p-3">
        <p className="text-sm font-medium">Create payment record</p>
        <input name="reference" required placeholder="Reference / invoice code" className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm" />
        <input name="amount" type="number" min="0" step="0.01" required placeholder="Amount" className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm" />
        <input name="currency" defaultValue="USD" className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm" />
        <select name="status" defaultValue="pending" className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm">
          {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <textarea name="notes" placeholder="Notes" rows={2} className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm" />
        <button type="submit" disabled={pending} className="rounded-lg border border-neon/50 px-3 py-2 text-sm text-neon disabled:opacity-50">Create payment</button>
      </form>

      <form action={handleUpdate} className="grid gap-2 rounded-lg border border-white/10 p-3">
        <p className="text-sm font-medium">Manual status update</p>
        <input name="payment_id" required placeholder="Payment ID" className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm" />
        <select name="update_status" required defaultValue="processing" className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm">
          {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <textarea name="update_notes" placeholder="Update notes" rows={2} className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm" />
        <button type="submit" disabled={pending} className="rounded-lg border border-neon/50 px-3 py-2 text-sm text-neon disabled:opacity-50">Update status</button>
      </form>

      {message ? <p className="text-xs text-white/70">{message}</p> : null}
    </div>
  );
}
