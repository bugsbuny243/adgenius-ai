import { NextResponse } from 'next/server';

import { createServerSupabase } from '@/lib/supabase/server';

type WorkspaceRequestBody = {
  name?: string;
};

function getAccessToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.replace('Bearer ', '').trim();
}

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const body = (await request.json()) as WorkspaceRequestBody;
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: 'Çalışma alanı adı zorunludur.' }, { status: 400 });
    }

    const supabase = createServerSupabase(accessToken);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Kullanıcı doğrulanamadı.' }, { status: 401 });
    }

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .maybeSingle();

    if (workspaceError) {
      return NextResponse.json({ error: `Çalışma alanı bulunamadı: ${workspaceError.message}` }, { status: 400 });
    }

    if (!workspace) {
      return NextResponse.json({ error: 'Sadece çalışma alanı sahibi güncelleme yapabilir.' }, { status: 403 });
    }

    const { error: updateError } = await supabase
      .from('workspaces')
      .update({ name })
      .eq('id', workspace.id)
      .eq('owner_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: `Çalışma alanı güncellenemedi: ${updateError.message}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PUT /api/workspace failed:', error);
    return NextResponse.json({ error: 'Çalışma alanı güncellenirken beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}
