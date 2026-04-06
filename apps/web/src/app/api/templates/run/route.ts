import { NextResponse } from 'next/server';

import { runAgent } from '@/lib/server/agent-service';
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

    const body = (await request.json()) as {
      templateId?: string;
      prompt?: string;
    };

    const templateId = body.templateId?.trim();
    const customPrompt = body.prompt?.trim();

    if (!accessToken) {
      return NextResponse.json({ error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' }, { status: 401 });
    }

    if (!templateId) {
      return NextResponse.json({ error: 'Template seçimi zorunludur.' }, { status: 422 });
    }

    const supabase = createServerSupabase(accessToken);
    const { workspace } = await resolveWorkspaceContext(supabase);

    const { data: templateRow, error: templateError } = await supabase
      .from('templates')
      .select('id, default_prompt, agent_type_id, agent_types(slug)')
      .eq('id', templateId)
      .eq('workspace_id', workspace.id)
      .maybeSingle();

    if (templateError) {
      return NextResponse.json({ error: templateError.message }, { status: 400 });
    }

    if (!templateRow) {
      return NextResponse.json({ error: 'Template bulunamadı.' }, { status: 404 });
    }

    const agentType = Array.isArray(templateRow.agent_types) ? templateRow.agent_types[0] : templateRow.agent_types;

    if (!agentType?.slug) {
      return NextResponse.json({ error: 'Template agent tipi bulunamadı.' }, { status: 400 });
    }

    const prompt = customPrompt && customPrompt.length > 0 ? customPrompt : templateRow.default_prompt;
    const runResult = await runAgent({
      accessToken,
      type: agentType.slug,
      userInput: prompt,
    });

    if (!runResult.ok) {
      return NextResponse.json({ error: runResult.error }, { status: 400 });
    }

    return NextResponse.json({
      runId: runResult.data.run.id,
      createdAt: runResult.data.run.created_at,
      status: runResult.data.run.status,
      result: runResult.data.result,
      usage: runResult.data.usage,
    });
  } catch (error) {
    console.error('POST /api/templates/run failed:', error);
    return NextResponse.json({ error: 'Template çalıştırılırken beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}
