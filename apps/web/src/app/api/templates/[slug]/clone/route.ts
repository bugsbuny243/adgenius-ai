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

  const { workspaceId } = (await request.json()) as { workspaceId?: string };
  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace seçimi zorunlu.' }, { status: 422 });
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
    .select('id, title, description, category, sample_output, tags, config, clone_count')
    .eq('slug', slug)
    .eq('is_public', true)
    .maybeSingle();

  if (templateError || !template) {
    return NextResponse.json({ error: 'Template bulunamadı.' }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from('template_clones')
    .select('id')
    .eq('template_id', template.id)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Bu workspace için template zaten klonlanmış.' }, { status: 409 });
  }

  const { data: workspaceTemplate, error: insertTemplateError } = await supabase
    .from('workspace_templates')
    .insert({
      workspace_id: workspaceId,
      source_template_id: template.id,
      created_by: user.id,
      title: template.title,
      description: template.description,
      category: template.category,
      sample_output: template.sample_output,
      tags: template.tags,
      config: template.config,
    })
    .select('id')
    .single();

  if (insertTemplateError || !workspaceTemplate) {
    return NextResponse.json({ error: insertTemplateError?.message ?? 'Template klonlanamadı.' }, { status: 500 });
  }

  const { error: cloneInsertError } = await supabase.from('template_clones').insert({
    template_id: template.id,
    workspace_template_id: workspaceTemplate.id,
    workspace_id: workspaceId,
    user_id: user.id,
  });

  if (cloneInsertError) {
    return NextResponse.json({ error: cloneInsertError.message }, { status: 500 });
  }

  const { error: countError } = await supabase
    .from('templates')
    .update({ clone_count: (template.clone_count ?? 0) + 1 })
    .eq('id', template.id);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  return NextResponse.json({ clonedTemplateId: workspaceTemplate.id });
}
