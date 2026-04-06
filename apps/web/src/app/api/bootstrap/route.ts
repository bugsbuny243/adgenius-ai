import { NextResponse } from 'next/server';

import { createServerSupabase } from '@/lib/supabase/server';

function getAccessToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.replace('Bearer ', '').trim() : null;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabase(accessToken);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Kullanıcı doğrulanamadı' }, { status: 401 });
    }

    const { data: existingMembership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (existingMembership) {
      return NextResponse.json({ ok: true, existing: true });
    }

    const slug = `ws-${user.id.replace(/-/g, '').slice(0, 12)}`;
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert({
        name: user.email?.split('@')[0] ?? 'Çalışma Alanım',
        slug,
        owner_id: user.id,
      })
      .select('id')
      .single();

    if (wsError || !workspace) {
      return NextResponse.json(
        { error: `Workspace oluşturulamadı: ${wsError?.message}` },
        { status: 500 },
      );
    }

    await supabase.from('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'owner',
    });

    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: user.email?.split('@')[0] ?? null,
    });

    await supabase.from('subscriptions').insert({
      workspace_id: workspace.id,
      plan_name: 'free',
      run_limit: 30,
      status: 'active',
    });

    return NextResponse.json({ ok: true, workspaceId: workspace.id });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
