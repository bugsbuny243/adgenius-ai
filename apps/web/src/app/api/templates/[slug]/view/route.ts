import { NextResponse } from 'next/server';

import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createServerSupabase();

  const { data: template, error: templateError } = await supabase
    .from('templates')
    .select('id, views_count')
    .eq('slug', slug)
    .eq('is_public', true)
    .maybeSingle();

  if (templateError || !template) {
    return NextResponse.json({ error: 'Template bulunamadı.' }, { status: 404 });
  }

  const nextViews = (template.views_count ?? 0) + 1;

  const { error: updateError } = await supabase.from('templates').update({ views_count: nextViews }).eq('id', template.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ viewsCount: nextViews });
}
