import { NextResponse } from 'next/server';

import { createServerSupabase } from '@/lib/supabase/server';
import { resolveWorkspaceContext } from '@/lib/workspace';

function getAccessToken(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.replace('Bearer ', '').trim();
}

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) {
      return NextResponse.json({ error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' }, { status: 401 });
    }

    const body = (await request.json()) as { projectId?: string; savedOutputId?: string };
    const projectId = body.projectId?.trim();
    const savedOutputId = body.savedOutputId?.trim();

    if (!projectId || !savedOutputId) {
      return NextResponse.json({ error: 'Proje ve çıktı seçimi zorunludur.' }, { status: 422 });
    }

    const supabase = createServerSupabase(accessToken);
    const { user, workspace } = await resolveWorkspaceContext(supabase);

    const { data: savedOutput, error: savedOutputError } = await supabase
      .from('saved_outputs')
      .select('id, title, content')
      .eq('id', savedOutputId)
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (savedOutputError) {
      return NextResponse.json({ error: savedOutputError.message }, { status: 400 });
    }

    if (!savedOutput) {
      return NextResponse.json({ error: 'Seçilen kayıtlı çıktı bulunamadı.' }, { status: 404 });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (projectError) {
      return NextResponse.json({ error: projectError.message }, { status: 400 });
    }

    if (!project) {
      return NextResponse.json({ error: 'Proje bulunamadı.' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('project_items')
      .insert({
        project_id: projectId,
        workspace_id: workspace.id,
        user_id: user.id,
        saved_output_id: savedOutput.id,
        title: savedOutput.title,
        item_type: 'saved_output',
        content: savedOutput.content,
      })
      .select('id, title, item_type, created_at')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Proje öğesi eklenemedi.' }, { status: 400 });
    }

    return NextResponse.json({ item: data });
  } catch (error) {
    console.error('POST /api/projects/items failed:', error);
    return NextResponse.json({ error: 'İşlem sırasında beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}
