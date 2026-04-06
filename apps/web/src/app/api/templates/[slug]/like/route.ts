import { NextResponse } from 'next/server';

import { createServerSupabase } from '@/lib/supabase/server';

function getAccessToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.replace('Bearer ', '').trim() : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const accessToken = getAccessToken(request);

  if (!accessToken) {
    return NextResponse.json({ error: 'Giriş yapmalısınız.' }, { status: 401 });
  }

  const supabase = createServerSupabase(accessToken);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Kullanıcı doğrulanamadı.' }, { status: 401 });
  }

  const { data: template, error: templateError } = await supabase
    .from('templates')
    .select('id, like_count')
    .eq('slug', slug)
    .eq('is_public', true)
    .maybeSingle();

  if (templateError || !template) {
    return NextResponse.json({ error: 'Template bulunamadı.' }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from('template_likes')
    .select('id')
    .eq('template_id', template.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    const { error: removeError } = await supabase.from('template_likes').delete().eq('id', existing.id);
    if (removeError) {
      return NextResponse.json({ error: removeError.message }, { status: 500 });
    }
  } else {
    const { error: addError } = await supabase.from('template_likes').insert({ template_id: template.id, user_id: user.id });
    if (addError) {
      return NextResponse.json({ error: addError.message }, { status: 500 });
    }
  }

  const { data: updated } = await supabase.from('templates').select('like_count').eq('id', template.id).single();

  return NextResponse.json({ likeCount: updated?.like_count ?? template.like_count });
}
