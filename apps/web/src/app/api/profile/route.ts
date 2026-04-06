import { NextResponse } from 'next/server';

import { createServerSupabase } from '@/lib/supabase/server';

type ProfileRequestBody = {
  full_name?: string;
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

    const body = (await request.json()) as ProfileRequestBody;
    const fullName = body.full_name?.trim() ?? null;

    const supabase = createServerSupabase(accessToken);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Kullanıcı doğrulanamadı.' }, { status: 401 });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: `Profil güncellenemedi: ${updateError.message}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PUT /api/profile failed:', error);
    return NextResponse.json({ error: 'Profil güncellenirken beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}
