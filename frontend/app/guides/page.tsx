import type { Metadata } from 'next';
import Link from 'next/link';
import { AdSenseSlot } from '@/components/ads/AdSenseSlot';
import { PublicSiteNav } from '@/components/public-site-nav';
import { guides } from '@/lib/public-content';

export const metadata: Metadata = {
  title: 'Rehberler | Koschei AI',
  description: 'Koschei rehberleri: oyun üretimi, yayın kuyruğu ve AI destekli işletme içerik akışları.'
};

export default function GuidesPage() {
  return (
    <main className="panel space-y-6">
      <PublicSiteNav />
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Rehberler</p>
        <h1 className="text-3xl font-bold">Uygulamalı Rehberler</h1>
        <p className="max-w-3xl text-white/75">Koschei ile üretim yapan ekiplerin operasyonel verimliliğini artırmak için hazırlanan kapsamlı rehberleri inceleyin.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {guides.map((guide) => (
          <article key={guide.slug} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs text-white/60">{guide.author} • {new Date(guide.date).toLocaleDateString('tr-TR')}</p>
            <h2 className="mt-2 text-xl font-semibold">{guide.title}</h2>
            <p className="mt-2 text-sm text-white/75">{guide.excerpt}</p>
            <Link href={`/guides/${guide.slug}`} className="mt-4 inline-block text-sm text-neon hover:underline">Rehberi oku</Link>
          </article>
        ))}
      </div>
      <AdSenseSlot slot="1000000003" hasContent className="rounded-2xl border border-white/10 bg-black/20 p-4" />
    </main>
  );
}
