'use client';

import { useMemo, useState, useTransition } from 'react';

type SavedItem = {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  agent_run_id: string | null;
  agent_runs: Array<{ id: string; agent_type_id: string }> | null;
};

export function SavedList({ items, onDelete }: { items: SavedItem[]; onDelete: (id: string) => Promise<void> }) {
  const [filter, setFilter] = useState('');
  const [active, setActive] = useState<SavedItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    if (!q) return items;
    return items.filter((item) => `${item.title ?? ''} ${item.content}`.toLowerCase().includes(q));
  }, [filter, items]);

  return (
    <div className="space-y-3">
      <input
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filtrele..."
        className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
      />

      {filtered.map((item) => (
        <div key={item.id} className="rounded-lg border border-white/10 p-3 text-sm">
          <p className="font-medium">{item.title ?? 'Kaydedilen çıktı'}</p>
          <p className="line-clamp-2 text-white/70">{item.content}</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(item.content)}
              className="rounded border border-white/20 px-2 py-1"
            >
              Kopyala
            </button>
            <button onClick={() => setActive(item)} className="rounded border border-white/20 px-2 py-1">
              Detay
            </button>
            {item.agent_runs?.[0]?.agent_type_id && item.agent_run_id ? (
              <a
                href={`/agents/${item.agent_runs[0].agent_type_id}?run_id=${item.agent_run_id}&edit_run_id=${item.agent_run_id}&source=saved`}
                className="rounded border border-white/20 px-2 py-1"
              >
                Düzenle / Yeniden çalıştır
              </a>
            ) : null}
            {item.agent_runs?.[0]?.agent_type_id && item.agent_run_id ? (
              <a
                href={`/agents/${item.agent_runs[0].agent_type_id}?run_id=${item.agent_run_id}`}
                className="rounded border border-neon/50 px-2 py-1 text-neon"
              >
                Sonuca git
              </a>
            ) : null}
            <button
              disabled={isPending}
              onClick={() => {
                const approve = window.confirm('Bu kaydı silmek istediğinize emin misiniz?');
                if (!approve) return;
                startTransition(() => {
                  void onDelete(item.id);
                });
              }}
              className="rounded border border-red-300/40 px-2 py-1 text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Siliniyor...' : 'Sil'}
            </button>
          </div>
        </div>
      ))}

      {active ? (
        <dialog open className="max-w-xl rounded-xl border border-white/20 bg-ink p-4 text-white">
          <h4 className="mb-2 text-lg">{active.title ?? 'Detay'}</h4>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-sm text-white/80">{active.content}</pre>
          <button onClick={() => setActive(null)} className="mt-3 rounded border border-white/20 px-3 py-1">
            Kapat
          </button>
        </dialog>
      ) : null}
    </div>
  );
}
