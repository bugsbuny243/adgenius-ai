import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdSenseSlot } from '@/components/ads/AdSenseSlot';
import { PublicSiteNav } from '@/components/public-site-nav';
import { blogPosts, getBlogPostBySlug } from '@/lib/public-content';

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getBlogPostBySlug(params.slug);
  if (!post) {
    return { title: 'Blog yazısı bulunamadı | Koschei AI' };
  }

  return {
    title: `${post.title} | Koschei AI Blog`,
    description: post.excerpt
  };
}

export default function BlogDetailPage({ params }: { params: { slug: string } }) {
  const post = getBlogPostBySlug(params.slug);
  if (!post) notFound();

  return (
    <main className="panel space-y-6">
      <PublicSiteNav />
      <article className="space-y-5">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-lilac">Blog Yazısı</p>
          <h1 className="text-3xl font-bold">{post.title}</h1>
          <p className="text-sm text-white/65">{post.author} • {new Date(post.date).toLocaleDateString('tr-TR')}</p>
          <p className="max-w-3xl text-white/75">{post.excerpt}</p>
        </header>
        {post.sections.map((section) => (
          <section key={section.heading} className="space-y-2">
            <h2 className="text-2xl font-semibold">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-white/80">{paragraph}</p>
            ))}
          </section>
        ))}
      </article>
      <AdSenseSlot slot="1000000002" hasContent className="rounded-2xl border border-white/10 bg-black/20 p-4" />
    </main>
  );
}
