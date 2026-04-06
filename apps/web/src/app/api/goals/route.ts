import { NextResponse } from 'next/server';

import { createServerSupabase } from '@/lib/supabase/server';
import { resolveWorkspaceContext } from '@/lib/workspace';

type GoalPayload = {
  title?: string;
  brief?: string;
  approvalMode?: 'auto' | 'manual' | 'stop_on_review';
};

const defaultStepTemplates = [
  { name: 'Research agent', agent_key: 'research', instructions: 'Hedef için veri, pazar ve referans analizi üret.' },
  { name: 'Strategy agent', agent_key: 'strategy', instructions: 'Araştırmayı uygulanabilir stratejiye dönüştür.' },
  { name: 'Writing agent', agent_key: 'writing', instructions: 'Stratejiye göre üretim metinlerini hazırla.' },
  { name: 'Review agent', agent_key: 'review', instructions: 'Risk, kalite ve marka uyum kontrolü yap.' },
  { name: 'Final delivery', agent_key: 'delivery', instructions: 'Final teslim paketini bölümlendirerek hazırla.' },
];

function getAccessToken(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.replace('Bearer ', '').trim();
}

export async function GET(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    const supabase = createServerSupabase(accessToken ?? undefined);
    const { workspace } = await resolveWorkspaceContext(supabase);

    const { data, error } = await supabase
      .from('goals')
      .select('id, title, brief, status, created_at, goal_runs(id, status, created_at)')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ goals: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Hedefler alınırken hata oluştu.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    const supabase = createServerSupabase(accessToken ?? undefined);
    const { workspace, user } = await resolveWorkspaceContext(supabase);

    const body = (await request.json()) as GoalPayload;
    const title = body.title?.trim();
    const brief = body.brief?.trim();
    const approvalMode = body.approvalMode ?? 'manual';

    if (!title || !brief) {
      return NextResponse.json({ error: 'Hedef başlığı ve açıklaması zorunludur.' }, { status: 422 });
    }

    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        title,
        brief,
        status: 'in_progress',
      })
      .select('id, title, brief, status, created_at')
      .single();

    if (goalError || !goal) {
      return NextResponse.json({ error: goalError?.message ?? 'Hedef oluşturulamadı.' }, { status: 400 });
    }

    const { data: goalRun, error: goalRunError } = await supabase
      .from('goal_runs')
      .insert({
        goal_id: goal.id,
        workspace_id: workspace.id,
        user_id: user.id,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (goalRunError || !goalRun) {
      return NextResponse.json({ error: goalRunError?.message ?? 'Goal run oluşturulamadı.' }, { status: 400 });
    }

    const { data: orchestration, error: orchestrationError } = await supabase
      .from('orchestrations')
      .insert({
        workspace_id: workspace.id,
        goal_id: goal.id,
        name: `${title} orchestration`,
        description: brief,
        approval_mode: approvalMode,
        is_active: true,
      })
      .select('id, approval_mode')
      .single();

    if (orchestrationError || !orchestration) {
      return NextResponse.json(
        { error: orchestrationError?.message ?? 'Orchestration oluşturulamadı.' },
        { status: 400 },
      );
    }

    const stepRows = defaultStepTemplates.map((step, index) => ({
      orchestration_id: orchestration.id,
      step_order: index + 1,
      name: step.name,
      agent_key: step.agent_key,
      instructions: step.instructions,
      requires_approval: approvalMode !== 'auto',
    }));

    const { data: steps, error: stepsError } = await supabase
      .from('orchestration_steps')
      .insert(stepRows)
      .select('id, step_order, name, agent_key, requires_approval');

    if (stepsError || !steps) {
      return NextResponse.json({ error: stepsError?.message ?? 'Adımlar oluşturulamadı.' }, { status: 400 });
    }

    const { data: orchestrationRun, error: orchestrationRunError } = await supabase
      .from('orchestration_runs')
      .insert({
        orchestration_id: orchestration.id,
        goal_run_id: goalRun.id,
        workspace_id: workspace.id,
        user_id: user.id,
        status: approvalMode === 'auto' ? 'running' : 'waiting_approval',
        current_step_order: 1,
        started_at: new Date().toISOString(),
        audit_log: [
          {
            event: 'run_created',
            actor: user.id,
            at: new Date().toISOString(),
            input: { title, brief, approvalMode },
          },
        ],
      })
      .select('id, status')
      .single();

    if (orchestrationRunError || !orchestrationRun) {
      return NextResponse.json(
        { error: orchestrationRunError?.message ?? 'Orchestration run başlatılamadı.' },
        { status: 400 },
      );
    }

    const runSteps = steps
      .sort((a, b) => Number(a.step_order) - Number(b.step_order))
      .map((step, index) => ({
        orchestration_run_id: orchestrationRun.id,
        orchestration_step_id: step.id,
        step_order: Number(step.step_order),
        status: index === 0 ? (step.requires_approval ? 'waiting_approval' : 'running') : 'pending',
        input_payload: {
          goalTitle: title,
          goalBrief: brief,
          orchestrationApprovalMode: approvalMode,
        },
        output_payload: {
          summary: `${step.name} hazırlandı. Onay ile bir sonraki adıma geçilir.`,
        },
        started_at: index === 0 ? new Date().toISOString() : null,
      }));

    const { error: runStepsError } = await supabase.from('orchestration_run_steps').insert(runSteps);

    if (runStepsError) {
      return NextResponse.json({ error: runStepsError.message }, { status: 400 });
    }

    return NextResponse.json({
      goal,
      goalRunId: goalRun.id,
      orchestrationId: orchestration.id,
      orchestrationRunId: orchestrationRun.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Goal oluşturulurken beklenmeyen hata oluştu.' },
      { status: 500 },
    );
  }
}
