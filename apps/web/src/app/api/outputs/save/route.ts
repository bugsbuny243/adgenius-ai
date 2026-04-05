import { NextResponse } from 'next/server';

import { createServerSupabase } from '@/lib/supabase/server';
import { bootstrapWorkspaceForUser, loadCurrentUser } from '@/lib/workspace';

function getAccessToken(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.replace('Bearer ', '').trim();
}

function deriveTitle(content: string) {
  const compact = content.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return 'Kaydedilen Çıktı';
  }

  return compact.length > 64 ? `${compact.slice(0, 64)}...` : compact;
}

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken(request);

    if (!accessToken) {
      return NextResponse.json({ error: 'Oturum bulunamadı. Lütfen giriş yapın.' }, { status: 401 });
    }

    const body = (await request.json()) as {
      runId?: string;
      title?: string;
      content?: string;
    };

    if (!body.runId || !body.content?.trim()) {
      return NextResponse.json({ error: 'runId ve content zorunludur.' }, { status: 400 });
    }

    const supabase = createServerSupabase(accessToken);
    const user = await loadCurrentUser(supabase);

    if (!user) {
      return NextResponse.json({ error: 'Oturum doğrulanamadı. Tekrar giriş yapın.' }, { status: 401 });
    }

    const workspace = await bootstrapWorkspaceForUser(supabase, user);

    const { data: runRow, error: runError } = await supabase
      .from('agent_runs')
      .select('id')
      .eq('id', body.runId)
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (runError) {
      return NextResponse.json({ error: `Çalıştırma kontrolü başarısız: ${runError.message}` }, { status: 500 });
    }

    if (!runRow) {
      return NextResponse.json({ error: 'Kaydedilecek çalıştırma bulunamadı.' }, { status: 404 });
    }

    const safeTitle = body.title?.trim() || deriveTitle(body.content);

    const { data: saved, error: saveError } = await supabase
      .from('saved_outputs')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        agent_run_id: body.runId,
        title: safeTitle,
        content: body.content,
      })
      .select('id, title, created_at')
      .single();

    if (saveError || !saved) {
      return NextResponse.json(
        { error: `Çıktı kaydedilemedi: ${saveError?.message ?? 'Bilinmeyen hata'}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
