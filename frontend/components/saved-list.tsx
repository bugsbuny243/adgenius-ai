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
  project_id?: string | null;
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
          <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{item.title ?? 'Kaydedilen çıktı'}</p>
              <span className="rounded border border-white/15 px-2 py-1 text-[11px] text-white/65">{new Date(item.created_at).toLocaleDateString('tr-TR')}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-white/70">{item.content}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <button onClick={() => navigator.clipboard.writeText(item.content)} className="rounded border border-white/20 px-2 py-1">Kopyala</button>
              <button onClick={() => setActive(item)} className="rounded border border-white/20 px-2 py-1">Detay modalı</button>
              {agentTypeId && runId ? <Link href={`/agents/${agentTypeId}?run_id=${runId}`} className="rounded border border-neon/50 px-2 py-1 text-neon">Sonuca git</Link> : null}
              {item.project_id ? <Link href={`/projects/${item.project_id}`} className="rounded border border-white/20 px-2 py-1">Projeye git</Link> : null}
              {agentTypeId && runId ? <Link href={`/agents/${agentTypeId}?run_id=${runId}&edit_run_id=${runId}&source=saved`} className="rounded border border-white/20 px-2 py-1">Bu çıktıyla yeniden çalış</Link> : null}
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
        <dialog open className="max-w-2xl rounded-xl border border-white/20 bg-ink p-4 text-white">
          <h4 className="mb-2 text-lg">{active.title ?? 'Detay'}</h4>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-white/80">{active.content}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => navigator.clipboard.writeText(active.content)} className="rounded border border-white/20 px-3 py-1">Kopyala</button>
            {active.project_id ? <Link href={`/projects/${active.project_id}`} className="rounded border border-white/20 px-3 py-1">Projeye git</Link> : null}
            <button onClick={() => setActive(null)} className="rounded border border-white/20 px-3 py-1">Kapat</button>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
