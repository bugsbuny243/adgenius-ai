'use client';

export type WorkspaceRunItem = {
  id: string;
  created_at: string;
  status: string;
  user_input: string;
  result_text: string | null;
};

type RunHistoryProps = {
  runs: WorkspaceRunItem[];
  onSelect: (run: WorkspaceRunItem) => void;
  onRerun: (run: WorkspaceRunItem) => void;
  activeRunId: string | null;
};

function statusLabel(status: string) {
  switch (status) {
    case 'completed':
      return 'Tamamlandı';
    case 'failed':
      return 'Hata';
    case 'running':
      return 'Çalışıyor';
    case 'pending':
      return 'Sırada';
    default:
      return status;
  }
}

export function RunHistory({ runs, onSelect, onRerun, activeRunId }: RunHistoryProps) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-200">Son Çalışmalar</h2>
        <span className="text-xs text-zinc-400">Son 10 run</span>
      </div>

      {runs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-3 text-sm text-zinc-300">
          Bu agent için henüz çalışma yok.
        </p>
      ) : null}

      <div className="space-y-2">
        {runs.map((run) => (
          <article
            key={run.id}
            className={`rounded-xl border p-3 ${activeRunId === run.id ? 'border-indigo-500/60 bg-indigo-500/10' : 'border-zinc-800 bg-zinc-900/60'}`}
          >
            <button type="button" className="w-full text-left" onClick={() => onSelect(run)}>
              <p className="line-clamp-2 text-sm text-zinc-100">{run.user_input}</p>
              <p className="mt-1 text-xs text-zinc-400">
                {new Date(run.created_at).toLocaleString('tr-TR')} · {statusLabel(run.status)}
              </p>
            </button>
            <button
              type="button"
              onClick={() => onRerun(run)}
              className="mt-2 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              Tekrar çalıştır
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
