import { NextResponse } from 'next/server';

import { createServerSupabase } from '@/lib/supabase/server';

function getAccessToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.replace('Bearer ', '').trim() : null;
}

function createBaseWorkspaceSlug(userId: string): string {
  return `ws-${userId.replace(/-/g, '').slice(0, 12)}`;
}

function createFallbackWorkspaceSlug(userId: string): string {
  return `ws-${userId.replace(/-/g, '').slice(0, 8)}-${Math.random().toString(36).slice(2, 6)}`;
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

    let workspaceId: string | null = null;
    let slug = createBaseWorkspaceSlug(user.id);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .insert({
          name: user.email?.split('@')[0] ?? 'Çalışma Alanım',
          slug,
          owner_id: user.id,
        })
        .select('id')
        .single();

      if (!wsError && workspace) {
        workspaceId = workspace.id;
        break;
      }

      if (wsError?.code === '23505' && attempt === 0) {
        slug = createFallbackWorkspaceSlug(user.id);
        continue;
      }

      return NextResponse.json(
        { error: `Workspace oluşturulamadı: ${wsError?.message ?? 'Bilinmeyen hata'}` },
        { status: 500 }
      );
    }

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace oluşturulamadı.' }, { status: 500 });
    }

    await supabase.from('workspace_members').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      role: 'owner',
    });

    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: user.email?.split('@')[0] ?? null,
    });

    await supabase.from('subscriptions').insert({
      workspace_id: workspaceId,
      plan_name: 'free',
      run_limit: 30,
      status: 'active',
    });

    return NextResponse.json({ ok: true, workspaceId });
  } catch (error) {
    console.error('Bootstrap route failed:', error);
    return NextResponse.json({ error: 'Beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}
