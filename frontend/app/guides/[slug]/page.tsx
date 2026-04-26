import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdSenseSlot } from '@/components/ads/AdSenseSlot';
import { PublicSiteNav } from '@/components/public-site-nav';
import { getGuideBySlug, guides } from '@/lib/public-content';

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const guide = getGuideBySlug(params.slug);
  if (!guide) {
    return { title: 'Rehber bulunamadı | Koschei AI' };
  }

  return {
    title: `${guide.title} | Koschei Rehberler`,
    description: guide.excerpt
  };
}

export default function GuideDetailPage({ params }: { params: { slug: string } }) {
  const guide = getGuideBySlug(params.slug);
  if (!guide) notFound();

  return (
    <main className="panel space-y-6">
      <PublicSiteNav />
      <article className="space-y-5">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-lilac">Rehber</p>
          <h1 className="text-3xl font-bold">{guide.title}</h1>
          <p className="text-sm text-white/65">{guide.author} • {new Date(guide.date).toLocaleDateString('tr-TR')}</p>
          <p className="max-w-3xl text-white/75">{guide.excerpt}</p>
        </header>
        {guide.sections.map((section) => (
          <section key={section.heading} className="space-y-2">
            <h2 className="text-2xl font-semibold">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-white/80">{paragraph}</p>
            ))}
          </section>
        ))}
      </article>
      <AdSenseSlot slot="1000000004" hasContent className="rounded-2xl border border-white/10 bg-black/20 p-4" />
    </main>
  );
}
