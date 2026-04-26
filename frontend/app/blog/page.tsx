import type { Metadata } from 'next';
import Link from 'next/link';
import { AdSenseSlot } from '@/components/ads/AdSenseSlot';
import { PublicSiteNav } from '@/components/public-site-nav';
import { blogPosts } from '@/lib/public-content';

export const metadata: Metadata = {
  title: 'Blog | Koschei AI',
  description: 'Koschei blog içerikleri: AI ajanları, SEO üretim akışları ve içerik operasyonu rehberleri.'
};

export default function BlogPage() {
  return (
    <main className="panel space-y-6">
      <PublicSiteNav />
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Blog</p>
        <h1 className="text-3xl font-bold">Koschei Blog</h1>
        <p className="max-w-3xl text-white/75">AI üretim süreçleri, içerik planlama ve ekip operasyonu hakkında özgün yazıları burada bulabilirsiniz.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {blogPosts.map((post) => (
          <article key={post.slug} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs text-white/60">{post.author} • {new Date(post.date).toLocaleDateString('tr-TR')}</p>
            <h2 className="mt-2 text-xl font-semibold">{post.title}</h2>
            <p className="mt-2 text-sm text-white/75">{post.excerpt}</p>
            <Link href={`/blog/${post.slug}`} className="mt-4 inline-block text-sm text-neon hover:underline">Yazıyı oku</Link>
          </article>
        ))}
      </div>

      <AdSenseSlot slot="1000000001" hasContent className="rounded-2xl border border-white/10 bg-black/20 p-4" />
    </main>
  );
}
