'use client';

type LivePreviewPanelProps = {
  title: string;
  helpText: string;
  blocks: Array<{ title: string; content: string }>;
  derivedPrompt: string;
};

export function LivePreviewPanel({ title, helpText, blocks, derivedPrompt }: LivePreviewPanelProps) {
  return (
    <aside className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-white/65">{helpText}</p>

      <div className="space-y-2">
        {blocks.map((block) => (
          <div key={block.title} className="rounded-lg border border-white/10 bg-black/30 p-3">
            <p className="text-xs uppercase tracking-wide text-white/50">{block.title}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-white/85">{block.content}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-neon/30 bg-neon/10 p-3">
        <p className="text-xs uppercase tracking-wide text-neon">Çalıştırma Önizlemesi</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-white/85">{derivedPrompt}</p>
      </div>
    </aside>
  );
}
