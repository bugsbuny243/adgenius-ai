'use client';

type ResultPanelProps = {
  text: string;
  status: 'completed' | 'failed' | 'pending' | 'processing' | 'idle';
};

export function ResultPanel({ text, status }: ResultPanelProps) {
  const isEmpty = !text.trim();

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-white/50">Üretilen Çıktı</p>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(text)}
          disabled={isEmpty}
          className="rounded border border-white/20 px-2 py-1 text-xs text-white/75 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Kopyala
        </button>
      </div>

      {status === 'failed' ? <p className="rounded-lg border border-red-300/35 bg-red-500/10 px-3 py-2 text-sm text-red-100">Çalıştırma tamamlanamadı. Hata detayını kontrol edip yeniden deneyin.</p> : null}
      {(status === 'pending' || status === 'processing') && isEmpty ? <p className="rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">Çıktı hazırlanıyor. İşlem tamamlandığında bu alan otomatik güncellenecek.</p> : null}
      {status === 'completed' && isEmpty ? <p className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white/70">Çıktı boş döndü.</p> : null}

      {!isEmpty ? <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/30 p-3 text-sm leading-relaxed text-white/85">{text}</pre> : null}
    </div>
  );
}
