import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteFooter } from '@/components/layout/footer';
import { SiteNavbar } from '@/components/layout/navbar';
import { createServerSupabase } from '@/lib/supabase/server';

type CreatorProfile = {
  user_id: string;
  display_name: string;
  handle: string;
  bio: string | null;
  avatar_url: string | null;
  website: string | null;
};

type CreatorTemplate = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  clone_count: number;
  like_count: number;
  views_count: number;
};

export default async function CreatorPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const supabase = createServerSupabase();

  const { data: creator } = await supabase
    .from('creator_profiles')
    .select('user_id, display_name, handle, bio, avatar_url, website')
    .eq('public_profile_enabled', true)
    .eq('handle', handle)
    .maybeSingle();

  if (!creator) {
    notFound();
  }

  const { data: templates } = await supabase
    .from('templates')
    .select('id, slug, title, description, category, clone_count, like_count, views_count')
    .eq('is_public', true)
    .eq('creator_id', creator.user_id)
    .order('clone_count', { ascending: false });

  const items = (templates ?? []) as CreatorTemplate[];
  const profile = creator as CreatorProfile;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-12">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Creator Profile</p>
          <h1 className="mt-2 text-3xl font-semibold">{profile.display_name}</h1>
          <p className="mt-1 text-sm text-indigo-300">@{profile.handle}</p>
          {profile.bio ? <p className="mt-3 text-zinc-300">{profile.bio}</p> : null}
          {profile.website ? (
            <a href={profile.website} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm text-zinc-200 underline">
              {profile.website}
            </a>
          ) : null}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Public Template&apos;leri</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((template) => (
              <article key={template.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">{template.category}</p>
                <h3 className="mt-1 text-lg font-medium">{template.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-zinc-300">{template.description}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  {template.clone_count} klon • {template.like_count} beğeni • {template.views_count} görüntülenme
                </p>
                <Link href={`/templates/${template.slug}`} className="mt-3 inline-flex text-sm text-indigo-300 hover:text-indigo-200">
                  Template Detayı
                </Link>
              </article>
            ))}
          </div>
          {items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-4 text-sm text-zinc-300">
              Bu creator henüz public template paylaşmadı.
            </p>
          ) : null}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
