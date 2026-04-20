'use client';

import { useState } from 'react';

type SocialOutputPanelProps = {
  youtubeTitle?: string | null;
  youtubeDescription?: string | null;
  instagramCaption?: string | null;
  tiktokCaption?: string | null;
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
      className="rounded border border-white/20 px-2 py-1 text-xs text-white/75"
    >
      {copied ? 'Kopyalandı' : 'Kopyala'}
    </button>
  );
}

function PlatformCard({
  title,
  blocks
}: {
  title: string;
  blocks: Array<{ label: string; content: string | null | undefined; emptyText: string }>;
}) {
  const available = blocks.some((block) => Boolean(block.content?.trim()));

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <p className="mb-3 text-xs uppercase tracking-wide text-white/55">{title}</p>
      <div className="space-y-3">
        {blocks.map((block) => {
          const value = block.content?.trim() ?? '';
          return (
            <div key={block.label} className="rounded-md border border-white/10 bg-black/25 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs text-white/65">{block.label}</p>
                {value ? <CopyButton value={value} /> : null}
              </div>
              {value ? <p className="whitespace-pre-wrap text-sm text-white/85">{value}</p> : <p className="text-sm text-white/60">{block.emptyText}</p>}
            </div>
          );
        })}
      </div>
      {!available ? <p className="mt-3 text-xs text-amber-200">Bu platform için içerik üretilmedi; diğer platform çıktıları kullanılabilir.</p> : null}
    </div>
  );
}

export function SocialOutputPanel({ youtubeTitle, youtubeDescription, instagramCaption, tiktokCaption }: SocialOutputPanelProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <PlatformCard
        title="YouTube"
        blocks={[
          { label: 'Başlık', content: youtubeTitle, emptyText: 'YouTube başlığı üretilemedi.' },
          { label: 'Açıklama', content: youtubeDescription, emptyText: 'YouTube açıklaması üretilemedi.' }
        ]}
      />
      <PlatformCard
        title="Instagram"
        blocks={[
          { label: 'Caption', content: instagramCaption, emptyText: 'Instagram metni üretilemedi.' }
        ]}
      />
      <PlatformCard
        title="TikTok"
        blocks={[
          { label: 'Caption', content: tiktokCaption, emptyText: 'TikTok metni üretilemedi.' }
        ]}
      />
    </div>
  );
}
