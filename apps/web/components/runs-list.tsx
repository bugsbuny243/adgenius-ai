'use client';

import { useMemo, useState } from 'react';

type RunItem = {
  id: string;
  status: string;
  model_name: string | null;
  prompt: string | null;
  created_at: string;
};

export function RunsList({ runs }: { runs: RunItem[] }) {
  const [status, setStatus] = useState('all');
  const [active, setActive] = useState<RunItem | null>(null);

  const filtered = useMemo(() => {
    if (status === 'all') return runs;
    return runs.filter((run) => run.status === status);
  }, [runs, status]);

  return (
    <div className="space-y-3 text-sm">
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-white/20 bg-black/30 px-3 py-2">
        <option value="all">Tümü</option>
        <option value="completed">Tamamlandı</option>
        <option value="pending">Bekliyor</option>
        <option value="failed">Hata</option>
      </select>

      {filtered.map((run) => (
        <div key={run.id} className="rounded-lg border border-white/10 p-3">
          <p>Durum: {run.status}</p>
          <p className="text-white/70">Model: {run.model_name ?? '-'}</p>
          <p className="text-white/70">{new Date(run.created_at).toLocaleString('tr-TR')}</p>
          <button onClick={() => setActive(run)} className="mt-2 rounded border border-white/20 px-2 py-1">
            Detay
          </button>
        </div>
      ))}

      {active ? (
        <dialog open className="max-w-xl rounded-xl border border-white/20 bg-ink p-4 text-white">
          <h4 className="mb-2 text-lg">Run Detayı</h4>
          <p className="mb-2 text-xs text-white/60">ID: {active.id}</p>
          <p className="text-sm">Prompt:</p>
          <pre className="whitespace-pre-wrap text-sm text-white/80">{active.prompt ?? '-'}</pre>
          <button onClick={() => setActive(null)} className="mt-3 rounded border border-white/20 px-3 py-1">
            Kapat
          </button>
        </dialog>
      ) : null}
    </div>
  );
}
