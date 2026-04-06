import { NextResponse } from 'next/server';

import { createServerSupabase } from '@/lib/supabase/server';
import { resolveWorkspaceContext } from '@/lib/workspace';

type Params = {
  params: { runId: string; stepId: string };
};

function getAccessToken(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.replace('Bearer ', '').trim();
}

export async function POST(request: Request, { params }: Params) {
  try {
    const accessToken = getAccessToken(request);
    const supabase = createServerSupabase(accessToken ?? undefined);
    const { workspace, user } = await resolveWorkspaceContext(supabase);
    const { runId, stepId } = params;

    const now = new Date().toISOString();

    const { data: step, error: stepError } = await supabase
      .from('orchestration_run_steps')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: now,
        completed_at: now,
      })
      .eq('id', stepId)
      .eq('orchestration_run_id', runId)
      .select('id, step_order')
      .single();

    if (stepError || !step) {
      return NextResponse.json({ error: stepError?.message ?? 'Step onaylanamadı.' }, { status: 400 });
    }

    const { data: allSteps, error: allStepsError } = await supabase
      .from('orchestration_run_steps')
      .select('id, step_order, status')
      .eq('orchestration_run_id', runId)
      .order('step_order', { ascending: true });

    if (allStepsError || !allSteps) {
      return NextResponse.json({ error: allStepsError?.message ?? 'Run adımları okunamadı.' }, { status: 400 });
    }

    const nextPending = allSteps.find((item) => item.status === 'pending');
    const hasBlocking = allSteps.some((item) => item.status === 'waiting_approval' || item.status === 'failed');

    if (nextPending) {
      await supabase
        .from('orchestration_run_steps')
        .update({
          status: 'waiting_approval',
          started_at: now,
          input_payload: { trigger: 'previous_step_approved', workspaceId: workspace.id },
          output_payload: { summary: 'Adım çalıştı. Kullanıcı onayı bekleniyor.' },
        })
        .eq('id', nextPending.id)
        .eq('orchestration_run_id', runId);

      await supabase
        .from('orchestration_runs')
        .update({
          status: 'waiting_approval',
          current_step_order: nextPending.step_order,
        })
        .eq('id', runId)
        .eq('workspace_id', workspace.id);

      return NextResponse.json({ status: 'advanced', currentStepOrder: nextPending.step_order });
    }

    if (!hasBlocking) {
      await supabase
        .from('orchestration_runs')
        .update({
          status: 'completed',
          completed_at: now,
        })
        .eq('id', runId)
        .eq('workspace_id', workspace.id);

      return NextResponse.json({ status: 'completed' });
    }

    return NextResponse.json({ status: 'waiting' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Step onayı sırasında hata oluştu.' },
      { status: 500 },
    );
  }
}
