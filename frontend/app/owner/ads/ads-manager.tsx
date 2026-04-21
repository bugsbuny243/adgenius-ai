'use client';

import { useState, useTransition } from 'react';

export function AdsManager() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>('');

  function onSubmit(formData: FormData) {
    const payload = {
      slot_name: String(formData.get('slot_name') ?? ''),
      page_path: String(formData.get('page_path') ?? ''),
      position: String(formData.get('position') ?? ''),
      status: String(formData.get('status') ?? 'draft'),
      internal_section: String(formData.get('internal_section') ?? ''),
      notes: String(formData.get('notes') ?? ''),
      config_metadata: String(formData.get('config_metadata') ?? '')
    };

    startTransition(async () => {
      const response = await fetch('/api/owner/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as { ok: boolean; error?: string };
      if (result.ok) {
        setMessage('Placement created. Refresh to view latest records.');
      } else {
        setMessage(`Failed: ${result.error ?? 'unknown_error'}`);
      }
    });
  }

  return (
    <form
      action={onSubmit}
      className="grid gap-2"
    >
      <input name="slot_name" required placeholder="Slot name" className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm" />
      <input name="page_path" required placeholder="Page path (/articles/...)" className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm" />
      <input name="position" required placeholder="Position (hero/sidebar/footer)" className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm" />
      <input name="internal_section" placeholder="Internal section link" className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm" />
      <select name="status" defaultValue="draft" className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm">
        <option value="draft">draft</option>
        <option value="active">active</option>
        <option value="paused">paused</option>
      </select>
      <textarea name="config_metadata" placeholder="Config metadata (JSON or notes)" rows={3} className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm" />
      <textarea name="notes" placeholder="Notes" rows={2} className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm" />
      <button disabled={pending} type="submit" className="rounded-lg border border-neon/50 px-3 py-2 text-sm text-neon disabled:opacity-50">
        {pending ? 'Creating...' : 'Create ad placement'}
      </button>
      {message ? <p className="text-xs text-white/70">{message}</p> : null}
    </form>
  );
}
