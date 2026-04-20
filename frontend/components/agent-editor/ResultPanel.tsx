'use client';

import Link from 'next/link';
import { useState } from 'react';

type ResultPanelProps = {
  text: string;
  status: 'completed' | 'failed' | 'pending' | 'processing' | 'idle';
  agentSlug?: string;
  projectHref?: string | null;
  resultHref?: string | null;
  rerunHref?: string | null;
};

function buildSections(agentSlug: string | undefined, text: string): Array<{ title: string; content: string }> {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const lines = trimmed.split('\n').filter((line) => line.trim().length > 0);
  const paragraph = lines.join('\n');

  if (agentSlug === 'eposta') return [{ title: 'Konu', content: lines[0] ?? '-' }, { title: 'Giriş', content: lines[1] ?? '-' }, { title: 'Gövde', content: paragraph.slice(0, 1800) }, { title: 'Kapanış / CTA', content: lines.slice(-2).join('\n') || '-' }];
  if (agentSlug === 'icerik') return [{ title: 'Başlık', content: lines[0] ?? '-' }, { title: 'Outline', content: lines.slice(1, 8).join('\n') || '-' }, { title: 'İçerik Bölümleri', content: paragraph.slice(0, 2200) }];
  if (agentSlug === 'rapor') return [{ title: 'Özet', content: lines[0] ?? '-' }, { title: 'Bölüm Yapısı', content: lines.slice(1, 10).join('\n') || '-' }, { title: 'Metrik Vurguları', content: paragraph.slice(0, 2000) }];
  if (agentSlug === 'yazilim') return [{ title: 'Görev Özeti', content: lines[0] ?? '-' }, { title: 'Önerilen Çözüm', content: lines.slice(1, 12).join('\n') || '-' }, { title: 'Dikkat Noktaları', content: lines.slice(12).join('\n') || '-' }, { title: 'Sonraki Adım', content: lines.slice(-3).join('\n') || '-' }];
  if (agentSlug === 'arastirma') return [{ title: 'Kapsam', content: lines[0] ?? '-' }, { title: 'Ana Bulgular', content: lines.slice(1, 8).join('\n') || '-' }, { title: 'Karşılaştırma Başlıkları', content: lines.slice(8, 16).join('\n') || '-' }];
  if (agentSlug === 'sosyal') return [{ title: 'Platform Blokları', content: lines.slice(0, 5).join('\n') || '-' }, { title: 'Başlık / Caption', content: lines.slice(5, 12).join('\n') || '-' }, { title: 'CTA', content: lines.slice(12).join('\n') || '-' }];
  return [{ title: 'Üretilen Çıktı', content: paragraph }];
}

export function ResultPanel({ text, status, agentSlug, projectHref, resultHref, rerunHref }: ResultPanelProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isEmpty = !text.trim();
  const sections = buildSections(agentSlug, text);

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-white/50">Üretilen Çıktı</p>
        <button
          type="button"
          onClick={async () => {
            if (isEmpty) return;
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1000);
          }}
          disabled={isEmpty}
          className="rounded border border-white/20 px-2 py-1 text-xs text-white/75 disabled:opacity-50"
        >
          {copied ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        {projectHref ? <Link href={projectHref} className="rounded border border-white/20 px-2 py-1 hover:border-neon">Projeye ekle</Link> : null}
        {resultHref ? <Link href={resultHref} className="rounded border border-white/20 px-2 py-1 hover:border-neon">Kaydet</Link> : null}
        {rerunHref ? <Link href={rerunHref} className="rounded border border-white/20 px-2 py-1 hover:border-neon">Tekrar çalıştır</Link> : null}
        {rerunHref ? <Link href={rerunHref} className="rounded border border-neon/40 px-2 py-1 text-neon hover:bg-neon/10">Yeni varyasyon üret</Link> : null}
      </div>

      {status === 'failed' ? <p className="rounded-lg border border-red-300/35 bg-red-500/10 px-3 py-2 text-sm text-red-100">Çalıştırma tamamlanamadı. Hata mesajını kontrol ederek yeniden deneyin.</p> : null}
      {(status === 'pending' || status === 'processing') && <p className="rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">Çıktı hazırlanıyor. Durum güncellendiğinde içerik burada görünecek.</p>}
      {status === 'idle' ? <p className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white/70">Henüz bir sonuç üretilmedi.</p> : null}

      {!isEmpty ? (
        <div className="mt-3 space-y-2">
          {sections.map((section) => (
            <section key={section.title} className="rounded-lg border border-white/10 bg-black/30 p-3">
              <p className="text-xs uppercase tracking-wide text-white/55">{section.title}</p>
              <pre className={`mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/85 ${expanded ? 'max-h-none' : 'max-h-52 overflow-auto'}`}>{section.content}</pre>
            </section>
          ))}
          <button type="button" onClick={() => setExpanded((current) => !current)} className="rounded border border-white/20 px-2 py-1 text-xs text-white/75">
            {expanded ? 'Uzun çıktıyı daralt' : 'Uzun çıktıyı genişlet'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
