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

export async function POST(request: Request, context: { params: Promise<{ stepId: string }> }) {
  try {
    const accessToken = getAccessToken(request);

    if (!accessToken) {
      return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 });
    }

    const { stepId } = await context.params;
    const body = (await request.json()) as { action?: 'approve' | 'reject'; note?: string };
    const note = body.note?.trim();

    if (!stepId || !body.action) {
      return NextResponse.json({ error: 'Onay aksiyonu eksik.' }, { status: 422 });
    }

    const supabase = createServerSupabase(accessToken);
    const { user, workspace } = await resolveWorkspaceContext(supabase);

    const { data: stepRow, error: stepError } = await supabase
      .from('workflow_run_steps')
      .select('id, status, workflow_run_id, workflow_runs!inner(id, workspace_id)')
      .eq('id', stepId)
      .eq('workflow_runs.workspace_id', workspace.id)
      .maybeSingle();

    if (stepError) {
      return NextResponse.json({ error: stepError.message }, { status: 400 });
    }

    if (!stepRow) {
      return NextResponse.json({ error: 'Onay adımı bulunamadı.' }, { status: 404 });
    }

    const nextStatus = body.action === 'approve' ? 'approved' : 'rejected';

    const { error: updateStepError } = await supabase
      .from('workflow_run_steps')
      .update({
        status: nextStatus,
        rejection_note: body.action === 'reject' ? note ?? null : null,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', stepId);

    if (updateStepError) {
      return NextResponse.json({ error: updateStepError.message }, { status: 400 });
    }

    const { data: runSteps, error: runStepsError } = await supabase
      .from('workflow_run_steps')
      .select('status')
      .eq('workflow_run_id', stepRow.workflow_run_id);

    if (!runStepsError) {
      const allStatuses = (runSteps ?? []).map((item) => item.status);
      const runStatus = allStatuses.includes('rejected')
        ? 'failed'
        : allStatuses.some((status) => status === 'pending_approval' || status === 'pending' || status === 'running')
          ? 'pending_approval'
          : 'completed';

      await supabase
        .from('workflow_runs')
        .update({
          status: runStatus,
          completed_at: runStatus === 'completed' || runStatus === 'failed' ? new Date().toISOString() : null,
        })
        .eq('id', stepRow.workflow_run_id);
    }

    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (error) {
    console.error('POST /api/workflows/steps/[stepId]/approval failed:', error);
    return NextResponse.json({ error: 'Onay işlemi sırasında beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}
