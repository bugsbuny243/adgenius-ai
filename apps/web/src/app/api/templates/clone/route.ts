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
    const body = (await request.json()) as { templateId?: string };

    if (!accessToken) {
      return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 });
    }

    const templateId = body.templateId?.trim();
    if (!templateId) {
      return NextResponse.json({ error: 'Template id zorunlu.' }, { status: 422 });
    }

    const supabase = createServerSupabase(accessToken);
    const { workspace, user } = await resolveWorkspaceContext(supabase);

    const { data: sourceTemplate, error: sourceError } = await supabase
      .from('templates')
      .select('id, title, description, agent_type_id, default_prompt, tags')
      .eq('id', templateId)
      .eq('workspace_id', workspace.id)
      .maybeSingle();

    if (sourceError) {
      return NextResponse.json({ error: sourceError.message }, { status: 400 });
    }

    if (!sourceTemplate) {
      return NextResponse.json({ error: 'Kopyalanacak template bulunamadı.' }, { status: 404 });
    }

    const { data: clonedTemplate, error: cloneError } = await supabase
      .from('templates')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        title: `${sourceTemplate.title} (Kopya)`,
        description: sourceTemplate.description,
        agent_type_id: sourceTemplate.agent_type_id,
        default_prompt: sourceTemplate.default_prompt,
        tags: sourceTemplate.tags ?? [],
        is_public: false,
        is_private: true,
      })
      .select('id, title, created_at')
      .single();

    if (cloneError || !clonedTemplate) {
      return NextResponse.json({ error: cloneError?.message ?? 'Template kopyalanamadı.' }, { status: 400 });
    }

    const { data: sourceSteps, error: stepsError } = await supabase
      .from('template_steps')
      .select('step_order, title, prompt_override, agent_type_id')
      .eq('template_id', sourceTemplate.id)
      .order('step_order', { ascending: true });

    if (stepsError) {
      return NextResponse.json({ error: stepsError.message }, { status: 400 });
    }

    if ((sourceSteps ?? []).length > 0) {
      const { error: insertStepsError } = await supabase.from('template_steps').insert(
        (sourceSteps ?? []).map((step) => ({
          template_id: clonedTemplate.id,
          step_order: step.step_order,
          title: step.title,
          prompt_override: step.prompt_override,
          agent_type_id: step.agent_type_id,
        })),
      );

      if (insertStepsError) {
        return NextResponse.json({ error: insertStepsError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ template: clonedTemplate });
  } catch (error) {
    console.error('POST /api/templates/clone failed:', error);
    return NextResponse.json({ error: 'Template klonlanırken beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}
