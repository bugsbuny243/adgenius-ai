import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';
import { publicArticles } from '@/lib/public-articles';

export const metadata: Metadata = {
  title: 'Yazılar | Koschei AI',
  description: 'AI agent, içerik operasyonu ve ekip iş akışları hakkında Koschei AI kaynakları.'
};

export default function ArticlesPage() {
  return (
    <main className="panel space-y-6">
      <PublicSiteNav />
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Kaynaklar</p>
        <h1 className="text-3xl font-bold">Yazılar</h1>
        <p className="max-w-3xl text-white/75">
          Bu bölümde AI destekli içerik operasyonu, proje akışları ve ekip çalışma modeli hakkında pratik içerikler
          bulabilirsiniz.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {publicArticles.map((article) => (
          <article key={article.slug} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <h2 className="text-xl font-semibold">{article.title}</h2>
            <p className="mt-2 text-sm text-white/75">{article.description}</p>
            <Link href={`/articles/${article.slug}`} className="mt-4 inline-block text-sm text-neon hover:underline">
              Yazıyı oku
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
