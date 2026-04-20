'use client';

import { useState } from 'react';
import Link from 'next/link';

type SocialOutputPanelProps = {
  youtubeTitle?: string | null;
  youtubeDescription?: string | null;
  instagramCaption?: string | null;
  tiktokCaption?: string | null;
  agentId?: string;
  runId?: string;
  contentItemId?: string;
  projectId?: string | null;
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
  platformKey,
  blocks
}: {
  title: string;
  platformKey: 'youtube' | 'instagram' | 'tiktok';
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
      {available ? (
        <div className="mt-3 grid gap-2">
          <p className="text-xs text-white/60">Varyant üretimi</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link href={`?variant=${platformKey}-kisa`} className="rounded border border-white/20 px-2 py-1 hover:border-neon">Kısa versiyon</Link>
            <Link href={`?variant=${platformKey}-hook`} className="rounded border border-white/20 px-2 py-1 hover:border-neon">Daha güçlü hook</Link>
            <Link href={`?variant=${platformKey}-yumusak`} className="rounded border border-white/20 px-2 py-1 hover:border-neon">Daha yumuşak ton</Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SocialOutputPanel({ youtubeTitle, youtubeDescription, instagramCaption, tiktokCaption, agentId, runId, contentItemId, projectId }: SocialOutputPanelProps) {
  const actionContextAvailable = Boolean(agentId && runId && contentItemId);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-3">
      <PlatformCard
        title="YouTube"
        platformKey="youtube"
        blocks={[
          { label: 'Başlık', content: youtubeTitle, emptyText: 'YouTube başlığı üretilemedi.' },
          { label: 'Açıklama', content: youtubeDescription, emptyText: 'YouTube açıklaması üretilemedi.' }
        ]}
      />
      <PlatformCard
        title="Instagram"
        platformKey="instagram"
        blocks={[
          { label: 'Caption', content: instagramCaption, emptyText: 'Instagram metni üretilemedi.' }
        ]}
      />
      <PlatformCard
        title="TikTok"
        platformKey="tiktok"
        blocks={[
          { label: 'Caption', content: tiktokCaption, emptyText: 'TikTok metni üretilemedi.' }
        ]}
      />
      </div>
      {actionContextAvailable ? (
        <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white/70">
          <p>Platform kartlarından içerik kopyalayabilir, ardından aşağıdaki aksiyonlarla projeye ekleme ve yayın kuyruğuna gönderim yapabilirsiniz.</p>
          <p className="mt-1 text-white/55">Bağlı proje: {projectId ?? 'Henüz bağlanmadı'}</p>
        </div>
      ) : null}
    </div>
  );
}
