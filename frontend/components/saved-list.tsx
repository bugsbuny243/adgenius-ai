'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';

type SavedItem = {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  agent_run_id: string | null;
  agent_runs: Array<{ id: string; agent_type_id: string }> | null;
};

function createDedupedList(items: SavedItem[]): SavedItem[] {
  const seen = new Set<string>();
  const result: SavedItem[] = [];

  for (const item of items) {
    const key = item.agent_run_id ? `run:${item.agent_run_id}` : `content:${item.content.slice(0, 140)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

export function SavedList({ items, onDelete }: { items: SavedItem[]; onDelete: (id: string) => Promise<void> }) {
  const [filter, setFilter] = useState('');
  const [active, setActive] = useState<SavedItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const deduped = useMemo(() => createDedupedList(items), [items]);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    if (!q) return deduped;
    return deduped.filter((item) => `${item.title ?? ''} ${item.content}`.toLowerCase().includes(q));
  }, [filter, deduped]);

  return (
    <div className="space-y-3">
      <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Başlık veya içerik filtrele..." className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />

      {filtered.map((item) => {
        const agentTypeId = item.agent_runs?.[0]?.agent_type_id;
        const runId = item.agent_run_id;

        return (
          <div key={item.id} className="rounded-lg border border-white/10 p-3 text-sm">
            <p className="font-medium">{item.title ?? 'Kaydedilen çıktı'}</p>
            <p className="line-clamp-2 text-white/70">{item.content}</p>
            <p className="mt-1 text-xs text-white/60">{new Date(item.created_at).toLocaleString('tr-TR')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => navigator.clipboard.writeText(item.content)} className="rounded border border-white/20 px-2 py-1">Kopyala</button>
              <button onClick={() => setActive(item)} className="rounded border border-white/20 px-2 py-1">Modal</button>
              {agentTypeId && runId ? (
                <Link href={`/agents/${agentTypeId}?run_id=${runId}`} className="rounded border border-neon/50 px-2 py-1 text-neon">
                  İlgili sonuca git
                </Link>
              ) : null}
              {agentTypeId && runId ? (
                <Link href={`/agents/${agentTypeId}?run_id=${runId}&edit_run_id=${runId}&source=saved`} className="rounded border border-white/20 px-2 py-1">
                  Yeniden çalıştır
                </Link>
              ) : null}
              <button
                disabled={isPending}
                onClick={() => {
                  if (!window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
                  startTransition(() => {
                    void onDelete(item.id);
                  });
                }}
                className="rounded border border-red-300/40 px-2 py-1 text-red-200 disabled:opacity-60"
              >
                {isPending ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        );
      })}

      {active ? (
        <dialog open className="max-w-xl rounded-xl border border-white/20 bg-ink p-4 text-white">
          <h4 className="mb-2 text-lg">{active.title ?? 'Detay'}</h4>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-sm text-white/80">{active.content}</pre>
          <div className="mt-3 flex gap-2">
            <button onClick={() => navigator.clipboard.writeText(active.content)} className="rounded border border-white/20 px-3 py-1">Kopyala</button>
            <button onClick={() => setActive(null)} className="rounded border border-white/20 px-3 py-1">Kapat</button>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
