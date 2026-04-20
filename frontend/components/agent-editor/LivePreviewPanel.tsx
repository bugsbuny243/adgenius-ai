'use client';

type LivePreviewPanelProps = {
  title: string;
  helpText: string;
  blocks: Array<{ title: string; content: string }>;
  derivedPrompt: string;
};

export function LivePreviewPanel({ title, helpText, blocks, derivedPrompt }: LivePreviewPanelProps) {
  const filledBlockCount = blocks.filter((block) => !block.content.includes('Henüz belirtilmedi')).length;
  const completionRate = Math.round((filledBlockCount / Math.max(1, blocks.length)) * 100);

  return (
    <aside className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4 lg:sticky lg:top-4 lg:h-fit">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-white/65">{helpText}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <p className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-white/65">Dolu blok: {filledBlockCount}/{blocks.length}</p>
          <p className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-white/65">Hazırlık: %{completionRate}</p>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-neon" style={{ width: `${completionRate}%` }} />
        </div>
      </div>

      <div className="space-y-2">
        {blocks.map((block) => (
          <div key={block.title} className="rounded-lg border border-white/10 bg-black/30 p-3">
            <p className="text-xs uppercase tracking-wide text-white/50">{block.title}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/85">{block.content}</p>
          </div>
        ))}
      </div>

      <details className="rounded-lg border border-white/10 bg-black/25 p-3">
        <summary className="cursor-pointer text-xs uppercase tracking-wide text-white/70">Hızlı kalite kontrol listesi</summary>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-white/75">
          <li>Hedef kitle ve amaç birlikte net yazıldı mı?</li>
          <li>Ton ve format birbiriyle uyumlu mu?</li>
          <li>Kısıtlar, yasaklar veya kapsam dışı alanlar belirtildi mi?</li>
        </ul>
      </details>

      <details className="rounded-lg border border-neon/30 bg-neon/10 p-3" open>
        <summary className="cursor-pointer text-xs uppercase tracking-wide text-neon">Çalıştırmaya giden yapılandırılmış istek</summary>
        <p className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-white/80">{derivedPrompt}</p>
      </details>
    </aside>
  );
}
