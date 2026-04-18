'use client';

type LivePreviewPanelProps = {
  title: string;
  helpText: string;
  blocks: Array<{ title: string; content: string }>;
  derivedPrompt: string;
};

export function LivePreviewPanel({ title, helpText, blocks, derivedPrompt }: LivePreviewPanelProps) {
  const filledBlockCount = blocks.filter((block) => !block.content.includes('Henüz belirtilmedi')).length;

  return (
    <aside className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4 lg:sticky lg:top-4 lg:h-fit">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-white/65">{helpText}</p>
        <p className="mt-2 text-xs text-white/50">
          Önizleme doluluk: {filledBlockCount}/{blocks.length}
        </p>
      </div>

      <div className="space-y-2">
        {blocks.map((block) => (
          <div key={block.title} className="rounded-lg border border-white/10 bg-black/30 p-3">
            <p className="text-xs uppercase tracking-wide text-white/50">{block.title}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/85">{block.content}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-neon/30 bg-neon/10 p-3">
        <p className="text-xs uppercase tracking-wide text-neon">Çalıştırmaya Giden Yapılandırılmış İstek</p>
        <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-white/80">{derivedPrompt}</p>
      </div>
    </aside>
  );
}
