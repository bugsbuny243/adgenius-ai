import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicSiteNav } from '@/components/public-site-nav';
import { getPublicArticleBySlug, publicArticles } from '@/lib/public-articles';

export function generateStaticParams() {
  return publicArticles.map((article) => ({ slug: article.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const article = getPublicArticleBySlug(params.slug);
  if (!article) {
    return {
      title: 'Yazı bulunamadı | Koschei AI'
    };
  }

  return {
    title: `${article.title} | Koschei AI`,
    description: article.description
  };
}

export default function ArticleDetailPage({ params }: { params: { slug: string } }) {
  const article = getPublicArticleBySlug(params.slug);
  if (!article) {
    notFound();
  }

  return (
    <main className="panel space-y-6">
      <PublicSiteNav />
      <article className="space-y-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-lilac">Yazı</p>
          <h1 className="text-3xl font-bold">{article.title}</h1>
          <p className="max-w-3xl text-white/75">{article.description}</p>
        </header>

        {article.sections.map((section) => (
          <section key={section.heading} className="space-y-2">
            <h2 className="text-2xl font-semibold">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-white/80">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
