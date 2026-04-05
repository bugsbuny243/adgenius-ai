import { NextResponse } from 'next/server';

import { runAgent } from '@/lib/gemini';
import { createServerSupabase } from '@/lib/supabase/server';
import { incrementMonthlyUsage, assertCanRun } from '@/lib/usage';
import { bootstrapWorkspaceForUser, loadCurrentUser } from '@/lib/workspace';

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
      return NextResponse.json({ error: 'Oturum bulunamadı. Lütfen giriş yapın.' }, { status: 401 });
    }

    const body = (await request.json()) as {
      type?: string;
      userInput?: string;
      model?: string;
    };

    if (!body.type || !body.userInput?.trim()) {
      return NextResponse.json({ error: 'Agent türü ve görev metni zorunludur.' }, { status: 400 });
    }

    const supabase = createServerSupabase(accessToken);
    const user = await loadCurrentUser(supabase);

    if (!user) {
      return NextResponse.json({ error: 'Oturum doğrulanamadı. Tekrar giriş yapın.' }, { status: 401 });
    }

    const workspace = await bootstrapWorkspaceForUser(supabase, user);

    const { data: agentType, error: agentTypeError } = await supabase
      .from('agent_types')
      .select('id, slug, name, system_prompt, is_active')
      .eq('slug', body.type)
      .maybeSingle();

    if (agentTypeError) {
      return NextResponse.json({ error: `Agent bilgisi alınamadı: ${agentTypeError.message}` }, { status: 500 });
    }

    if (!agentType || !agentType.is_active) {
      return NextResponse.json({ error: 'Bu agent şu anda aktif değil veya bulunamadı.' }, { status: 404 });
    }

    try {
      await assertCanRun(supabase, workspace.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kullanım limiti kontrolü başarısız oldu.';
      return NextResponse.json({ error: message }, { status: 403 });
    }

    let resultText = '';
    try {
      resultText = await runAgent({
        systemPrompt: agentType.system_prompt,
        userInput: body.userInput,
        model: body.model,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gemini isteği başarısız oldu.';
      return NextResponse.json({ error: `Model hatası: ${message}` }, { status: 502 });
    }

    const { data: runRow, error: insertRunError } = await supabase
      .from('agent_runs')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        agent_type_id: agentType.id,
        user_input: body.userInput,
        model_name: body.model ?? 'gemini-2.5-flash',
        result_text: resultText,
        status: 'completed',
      })
      .select('id, created_at')
      .single();

    if (insertRunError || !runRow) {
      return NextResponse.json(
        { error: `Çalıştırma kaydedilemedi: ${insertRunError?.message ?? 'Bilinmeyen hata'}` },
        { status: 500 }
      );
    }

    await incrementMonthlyUsage(supabase, workspace.id);

    return NextResponse.json({
      result: resultText,
      runId: runRow.id,
      createdAt: runRow.created_at,
      agent: {
        slug: agentType.slug,
        name: agentType.name,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
