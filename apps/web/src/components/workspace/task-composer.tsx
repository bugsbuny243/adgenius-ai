'use client';

type TaskComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isRunning: boolean;
  maxLength?: number;
  placeholder?: string;
  lastPrompt: string;
  onUseLastPrompt: () => void;
};

export function TaskComposer({
  value,
  onChange,
  onSubmit,
  isRunning,
  maxLength = 2000,
  placeholder = 'Ne yapmak istediğini yaz. Örn: LinkedIn için profesyonel bir tanıtım metni hazırla.',
  lastPrompt,
  onUseLastPrompt,
}: TaskComposerProps) {
  const canRun = value.trim().length > 0 && !isRunning;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-zinc-200">Görev Yaz</h2>
        <button
          type="button"
          onClick={onUseLastPrompt}
          disabled={lastPrompt.trim().length === 0 || isRunning}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Son görevi doldur
        </button>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && canRun) {
            event.preventDefault();
            onSubmit();
          }
        }}
        rows={8}
        maxLength={maxLength}
        placeholder={placeholder}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none ring-indigo-400 placeholder:text-zinc-500 focus:ring"
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className={`text-xs ${value.length >= maxLength ? 'text-rose-400' : 'text-zinc-400'}`}>
          {value.length} / {maxLength}
        </p>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canRun}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isRunning ? 'Çalıştırılıyor...' : 'Çalıştır'}
        </button>
      </div>
    </section>
  );
}
