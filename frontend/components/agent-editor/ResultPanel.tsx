'use client';

type ResultPanelProps = {
  text: string;
};

function asLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line, index, arr) => line || (index > 0 && arr[index - 1] !== ''));
}

export function ResultPanel({ text }: ResultPanelProps) {
  const lines = asLines(text);

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-white/50">Üretilen Çalışma</p>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(text)}
          className="rounded border border-white/20 px-2 py-1 text-xs text-white/75"
        >
          Kopyala
        </button>
      </div>

      <div className="space-y-2 text-sm text-white/85">
        {lines.map((line, index) => {
          if (line.endsWith(':') && line.length < 72) {
            return (
              <p key={`${line}-${index}`} className="pt-2 text-sm font-semibold text-neon">
                {line}
              </p>
            );
          }

          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <p key={`${line}-${index}`} className="pl-3 text-white/80">
                • {line.slice(2)}
              </p>
            );
          }

          return (
            <p key={`${line}-${index}`} className="whitespace-pre-wrap leading-relaxed text-white/80">
              {line}
            </p>
          );
        })}
      </div>
    </div>
  );
}
