'use client';

import { useState } from 'react';

type SocialOutputPanelProps = {
  youtubeTitle?: string | null;
  youtubeDescription?: string | null;
  instagramCaption?: string | null;
  tiktokCaption?: string | null;
  projectId?: string | null;
  youtubeConnected?: boolean;
  bloggerConnected?: boolean;
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

function PlatformCard({ title, blocks, projectId }: { title: string; blocks: Array<{ label: string; content: string | null | undefined; emptyText: string }>; projectId?: string | null }) {
  const available = blocks.some((block) => Boolean(block.content?.trim()));

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-white/55">{title}</p>
        <span className="rounded border border-white/15 px-2 py-1 text-[11px] text-white/70">Platform stüdyosu</span>
      </div>
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

      {!available ? (
        <p className="mt-3 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-white/60">Bu platform için içerik üretilmedi. Diğer platform çıktılarıyla devam edebilirsiniz.</p>
      ) : (
        <div className="mt-3 space-y-2 text-xs">
          <div className="flex flex-wrap gap-2">
            {['Kısa versiyon', 'Daha güçlü hook', 'Daha yumuşak ton', 'Satış odaklı ton', 'Profesyonel ton'].map((variant) => (
              <span key={variant} className="rounded border border-white/20 px-2 py-1">{variant}</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded border border-white/20 px-2 py-1">Projeye ekle</span>
            <span className="rounded border border-white/20 px-2 py-1">Kaydet</span>
            <span className="rounded border border-white/20 px-2 py-1">Queue’ye gönder</span>
            <span className="rounded border border-neon/40 px-2 py-1 text-neon">Farklı versiyon üret</span>
          </div>
          <p className="text-white/55">Bağlı proje: {projectId ?? 'Henüz bağlanmadı'}</p>
        </div>
      )}
    </div>
  );
}

export function SocialOutputPanel({ youtubeTitle, youtubeDescription, instagramCaption, tiktokCaption, projectId, youtubeConnected, bloggerConnected }: SocialOutputPanelProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white/70">
        <p className="font-medium text-white/85">Yayın bağlantı durumu</p>
        <p className="mt-1">YouTube: {youtubeConnected ? 'Bağlı' : 'Bağlı değil'} • Blogger: {bloggerConnected ? 'Bağlı' : 'Bağlı değil'}</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <PlatformCard title="YouTube kartı" projectId={projectId} blocks={[{ label: 'Başlık', content: youtubeTitle, emptyText: 'YouTube başlığı üretilemedi.' }, { label: 'Açıklama', content: youtubeDescription, emptyText: 'YouTube açıklaması üretilemedi.' }]} />
        <PlatformCard title="Instagram kartı" projectId={projectId} blocks={[{ label: 'Caption', content: instagramCaption, emptyText: 'Instagram metni üretilemedi.' }]} />
        <PlatformCard title="TikTok kartı" projectId={projectId} blocks={[{ label: 'Caption', content: tiktokCaption, emptyText: 'TikTok metni üretilemedi.' }]} />
      </div>
    </div>
  );
}
