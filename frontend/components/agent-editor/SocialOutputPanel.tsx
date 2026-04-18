'use client';

type SocialOutputPanelProps = {
  youtubeTitle?: string | null;
  youtubeDescription?: string | null;
  instagramCaption?: string | null;
  tiktokCaption?: string | null;
};

function OutputCard({
  title,
  content,
  emptyText
}: {
  title: string;
  content: string | null | undefined;
  emptyText: string;
}) {
  const hasContent = Boolean(content && content.trim());

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-white/55">{title}</p>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(content ?? '')}
          disabled={!hasContent}
          className="rounded border border-white/20 px-2 py-1 text-xs text-white/75 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Kopyala
        </button>
      </div>
      {hasContent ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/85">{content}</p>
      ) : (
        <p className="rounded border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-white/60">{emptyText}</p>
      )}
    </div>
  );
}

export function SocialOutputPanel({ youtubeTitle, youtubeDescription, instagramCaption, tiktokCaption }: SocialOutputPanelProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <OutputCard title="YouTube Başlık" content={youtubeTitle} emptyText="Bu çalıştırmada YouTube başlığı üretilemedi." />
        <OutputCard
          title="YouTube Açıklama"
          content={youtubeDescription}
          emptyText="Bu çalıştırmada YouTube açıklaması üretilemedi."
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <OutputCard
          title="Instagram Açıklama Metni"
          content={instagramCaption}
          emptyText="Bu çalıştırmada Instagram metni üretilemedi."
        />
        <OutputCard title="TikTok Açıklama Metni" content={tiktokCaption} emptyText="Bu çalıştırmada TikTok metni üretilemedi." />
      </div>
    </div>
  );
}
