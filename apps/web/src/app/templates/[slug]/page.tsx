import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteFooter } from '@/components/layout/footer';
import { SiteNavbar } from '@/components/layout/navbar';
import { TemplateActions } from '@/components/templates/template-actions';
import { TemplateViewTracker } from '@/components/templates/template-view-tracker';
import { createServerSupabase } from '@/lib/supabase/server';

type TemplateDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  sample_output: string;
  cover_url: string | null;
  views_count: number;
  clone_count: number;
  run_count: number;
  like_count: number;
  created_at: string;
  creator_profiles:
    | {
        handle: string;
        display_name: string;
        bio: string | null;
        avatar_url: string | null;
      }
    | {
        handle: string;
        display_name: string;
        bio: string | null;
        avatar_url: string | null;
      }[]
    | null;
};

function pickCreator(relation: TemplateDetail['creator_profiles']) {
  if (!relation) return null;
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}


export default async function TemplateDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createServerSupabase();

  const { data } = await supabase
    .from('templates')
    .select(
      'id, slug, title, description, category, tags, sample_output, cover_url, views_count, clone_count, run_count, like_count, created_at, creator_profiles(handle, display_name, bio, avatar_url)',
    )
    .eq('is_public', true)
    .eq('slug', slug)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const template = data as TemplateDetail;
  const creator = pickCreator(template.creator_profiles);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <TemplateViewTracker slug={template.slug} />
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-12 lg:grid-cols-[2fr,1fr]">
        <section className="space-y-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <p className="text-xs uppercase tracking-wide text-indigo-300">{template.category}</p>
            <h1 className="mt-2 text-3xl font-semibold">{template.title}</h1>
            <p className="mt-3 text-zinc-300">{template.description}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-400">
              {template.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-zinc-700 px-2 py-1">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="mt-5 grid gap-3 text-sm text-zinc-300 sm:grid-cols-2 lg:grid-cols-4">
              <p>{template.views_count} görüntülenme</p>
              <p>{template.clone_count} klon</p>
              <p>{template.run_count} run</p>
              <p>{template.like_count} beğeni</p>
            </div>
          </div>

          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="text-xl font-semibold">Örnek Çıktı</h2>
            <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{template.sample_output}</pre>
          </article>
        </section>

        <aside className="space-y-4">
          <TemplateActions templateSlug={template.slug} initialLikeCount={template.like_count} />

          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h2 className="text-sm uppercase tracking-wide text-zinc-400">Creator</h2>
            {creator ? (
              <>
                <p className="mt-2 text-lg font-medium">{creator.display_name}</p>
                {creator.bio ? <p className="mt-2 text-sm text-zinc-300">{creator.bio}</p> : null}
                <Link href={`/creators/${creator.handle}`} className="mt-3 inline-flex text-sm text-indigo-300 hover:text-indigo-200">
                  Profili Gör
                </Link>
              </>
            ) : (
              <p className="mt-2 text-sm text-zinc-300">Creator profili bulunamadı.</p>
            )}
          </article>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
