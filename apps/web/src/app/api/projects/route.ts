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

    const body = (await request.json()) as { name?: string; description?: string };
    const name = body.name?.trim();
    const description = body.description?.trim() ?? null;

    if (!name) {
      return NextResponse.json({ error: 'Proje adı zorunludur.' }, { status: 422 });
    }

    const supabase = createServerSupabase(accessToken);
    const { user, workspace } = await resolveWorkspaceContext(supabase);

    const { data, error } = await supabase
      .from('projects')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        name,
        description,
      })
      .select('id, name, description, created_at')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Proje oluşturulamadı.' }, { status: 400 });
    }

    return NextResponse.json({ project: data });
  } catch (error) {
    console.error('POST /api/projects failed:', error);
    return NextResponse.json({ error: 'İşlem sırasında beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}
