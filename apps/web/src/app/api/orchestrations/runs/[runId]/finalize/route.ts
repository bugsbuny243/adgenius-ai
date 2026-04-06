import { NextResponse } from 'next/server';

import { createServerSupabase } from '@/lib/supabase/server';
import { resolveWorkspaceContext } from '@/lib/workspace';

type Params = {
  params: { runId: string };
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
    const { runId } = params;

    const { data: runSteps, error: runStepError } = await supabase
      .from('orchestration_run_steps')
      .select('step_order, status, output_payload, orchestration_steps(name)')
      .eq('orchestration_run_id', runId)
      .order('step_order', { ascending: true });

    if (runStepError || !runSteps) {
      return NextResponse.json({ error: runStepError?.message ?? 'Run adımları alınamadı.' }, { status: 400 });
    }

    const waitingApproval = runSteps.find((item) => item.status === 'waiting_approval' || item.status === 'pending');
    if (waitingApproval) {
      return NextResponse.json(
        { error: 'Tüm adımlar onaylanmadan final teslim oluşturulamaz.' },
        { status: 409 },
      );
    }

    const sections = runSteps.map((item) => {
      const stepName = Array.isArray(item.orchestration_steps)
        ? item.orchestration_steps[0]?.name
        : item.orchestration_steps?.name;
      const summary = (item.output_payload as { summary?: string } | null)?.summary ?? 'Özet yok.';
      return {
        title: stepName ?? `Adım ${item.step_order}`,
        body: summary,
      };
    });

    const summary = sections.map((section, index) => `${index + 1}. ${section.title}: ${section.body}`).join('\n');
    const markdown = `# Final Delivery\n\n${sections
      .map((section) => `## ${section.title}\n\n${section.body}`)
      .join('\n\n')}`;

    const { data: deliverable, error: deliverableError } = await supabase
      .from('final_deliverables')
      .insert({
        workspace_id: workspace.id,
        orchestration_run_id: runId,
        user_id: user.id,
        title: 'Final Delivery',
        summary,
        sections,
        content_markdown: markdown,
      })
      .select('id, title, summary, content_markdown, sections, created_at')
      .single();

    if (deliverableError || !deliverable) {
      return NextResponse.json({ error: deliverableError?.message ?? 'Final teslim kaydedilemedi.' }, { status: 400 });
    }

    return NextResponse.json({ deliverable });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Finalization sırasında hata oluştu.' },
      { status: 500 },
    );
  }
}
