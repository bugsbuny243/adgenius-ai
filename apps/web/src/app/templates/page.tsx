import Link from 'next/link';

import { SiteFooter } from '@/components/layout/footer';
import { SiteNavbar } from '@/components/layout/navbar';
import { createServerSupabase } from '@/lib/supabase/server';

const categories = ['all', 'marketing', 'sales', 'operations', 'research', 'support'] as const;

type TemplateCard = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  clone_count: number;
  views_count: number;
  like_count: number;
  published_at: string | null;
  creator_profiles:
    | {
        handle: string;
        display_name: string;
      }
    | {
        handle: string;
        display_name: string;
      }[]
    | null;
};

function pickCreator(relation: TemplateCard['creator_profiles']) {
  if (!relation) return null;
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

export const metadata = {
  title: 'Public Template Gallery | Koschei',
  description:
    'Koschei public template marketplace içinde arama, kategori ve popülerlik sıralamasıyla en iyi AI template örneklerini keşfedin.',
};

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const category = typeof params.category === 'string' ? params.category : 'all';
  const sort = typeof params.sort === 'string' ? params.sort : 'popular';

  const supabase = createServerSupabase();

  let query = supabase
    .from('templates')
    .select('id, slug, title, description, category, tags, clone_count, views_count, like_count, published_at, creator_profiles(handle, display_name)')
    .eq('is_public', true)
    .limit(100);

  if (category !== 'all') {
    query = query.eq('category', category);
  }

  if (q.length > 0) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  if (sort === 'new') {
    query = query.order('published_at', { ascending: false, nullsFirst: false });
  } else if (sort === 'most-cloned') {
    query = query.order('clone_count', { ascending: false });
  } else {
    query = query.order('like_count', { ascending: false }).order('clone_count', { ascending: false });
  }

  const { data } = await query;
  const templates = (data ?? []) as TemplateCard[];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-12">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Marketplace</p>
          <h1 className="text-3xl font-semibold md:text-4xl">Public Template Gallery</h1>
          <p className="max-w-3xl text-zinc-300">
            Arama, kategori ve sıralama filtreleriyle topluluk tarafından üretilen template&apos;leri keşfedin.
          </p>
        </header>

        <form className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:grid-cols-4" method="get">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Template ara"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 md:col-span-2"
          />
          <select
            name="category"
            defaultValue={category}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === 'all' ? 'Tüm kategoriler' : item}
              </option>
            ))}
          </select>
          <select name="sort" defaultValue={sort} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100">
            <option value="popular">Popüler</option>
            <option value="new">Yeni</option>
            <option value="most-cloned">En Çok Klonlanan</option>
          </select>
          <button className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 md:col-span-4" type="submit">
            Filtreleri Uygula
          </button>
        </form>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => {
            const creator = pickCreator(template.creator_profiles);
            return (
              <article key={template.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                <p className="text-xs uppercase tracking-wide text-indigo-300">{template.category}</p>
                <h2 className="mt-2 text-lg font-semibold">{template.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm text-zinc-300">{template.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
                  {template.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full border border-zinc-700 px-2 py-1">
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
                  <span>{template.clone_count} klon</span>
                  <span>{template.views_count} görüntülenme</span>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Oluşturan:{' '}
                  {creator ? (
                    <Link href={`/creators/${creator.handle}`} className="text-zinc-300 hover:text-white">
                      {creator.display_name}
                    </Link>
                  ) : (
                    'Koschei Creator'
                  )}
                </p>
                <Link
                  href={`/templates/${template.slug}`}
                  className="mt-4 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500"
                >
                  Template Detayı
                </Link>
              </article>
            );
          })}
        </section>

        {templates.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-4 text-sm text-zinc-300">
            Aramanız ile eşleşen public template bulunamadı.
          </p>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
