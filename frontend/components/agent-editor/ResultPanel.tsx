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

  if (agentSlug === 'eposta') {
    return [
      { title: 'Konu', content: lines[0] ?? 'Konu satırı bulunamadı.' },
      { title: 'Giriş', content: lines[1] ?? paragraph.slice(0, 240) },
      { title: 'Gövde', content: paragraph.slice(0, 1_800) },
      { title: 'CTA', content: lines.find((line) => line.toLowerCase().includes('cta')) ?? 'CTA metni içerikte belirtilmedi.' }
    ];
  }

  if (agentSlug === 'icerik') {
    return [
      { title: 'Başlık', content: lines[0] ?? 'Başlık bulunamadı.' },
      { title: 'Outline', content: lines.slice(1, 8).join('\n') || 'Outline çıkarılamadı.' },
      { title: 'Gövde', content: paragraph.slice(0, 2_200) }
    ];
  }

  if (agentSlug === 'rapor') {
    return [
      { title: 'Özet', content: lines[0] ?? paragraph.slice(0, 260) },
      { title: 'Bölümler', content: lines.slice(1, 10).join('\n') || 'Bölüm yapısı bulunamadı.' },
      { title: 'Metrik / Notlar', content: paragraph.slice(0, 2_000) }
    ];
  }

  if (agentSlug === 'yazilim') {
    return [
      { title: 'Görev Özeti', content: lines[0] ?? 'Görev özeti bulunamadı.' },
      { title: 'Önerilen Çözüm', content: lines.slice(1, 12).join('\n') || paragraph.slice(0, 800) },
      { title: 'Dikkat Noktaları', content: lines.slice(12).join('\n') || 'Ek dikkat noktası belirtilmedi.' }
    ];
  }

  if (agentSlug === 'sosyal') {
    return [
      { title: 'Platform Özeti', content: lines.slice(0, 4).join('\n') || 'Platform özeti bulunamadı.' },
      { title: 'Öne Çıkan Mesaj', content: lines.slice(4, 12).join('\n') || paragraph.slice(0, 500) },
      { title: 'CTA / Kapanış', content: lines.slice(12).join('\n') || 'CTA bilgisi bulunamadı.' }
    ];
  }

  return [{ title: 'Çıktı', content: paragraph }];
}

export function ResultPanel({ text, status, agentSlug, projectHref, resultHref, rerunHref }: ResultPanelProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isEmpty = !text.trim();
  const sections = buildSections(agentSlug, text);

  const copyOutput = async () => {
    if (isEmpty) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-white/50">Üretilen Çıktı</p>
        <button
          type="button"
          onClick={() => {
            void copyOutput();
          }}
          disabled={isEmpty}
          className="rounded border border-white/20 px-2 py-1 text-xs text-white/75 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        {projectHref ? <Link href={projectHref} className="rounded border border-white/20 px-2 py-1 hover:border-neon">Projeye ekle</Link> : <span className="rounded border border-white/10 px-2 py-1 text-white/50">Projeye ekle</span>}
        {resultHref ? <Link href={resultHref} className="rounded border border-white/20 px-2 py-1 hover:border-neon">Kaydet</Link> : <span className="rounded border border-white/10 px-2 py-1 text-white/50">Kaydet</span>}
        {rerunHref ? <Link href={rerunHref} className="rounded border border-white/20 px-2 py-1 hover:border-neon">Tekrar çalıştır</Link> : <span className="rounded border border-white/10 px-2 py-1 text-white/50">Tekrar çalıştır</span>}
      </div>

      {status === 'failed' ? <p className="rounded-lg border border-red-300/35 bg-red-500/10 px-3 py-2 text-sm text-red-100">Çalıştırma tamamlanamadı. Hata mesajını kontrol ederek yeniden deneyin.</p> : null}
      {(status === 'pending' || status === 'processing') && <p className="rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">Çıktı hazırlanıyor. Durum güncellendiğinde içerik burada görünecek.</p>}
      {status === 'completed' && isEmpty ? <p className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white/70">Çalıştırma tamamlandı ancak sonuç metni boş döndü.</p> : null}
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
