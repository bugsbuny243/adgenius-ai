import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { requireActiveGameAgentPackage } from '@/lib/game-agent-access';
import { generateGameBriefWithGroq } from '@/lib/ai-engine';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

type GenerateRequestBody = {
  prompt?: string | null;
  project_id?: string | null;
};

export async function POST(request: Request) {
  try {
    const context = await getApiAuthContext(request);
    if (context instanceof Response) return context;

    const packageGateResponse = await requireActiveGameAgentPackage(context.supabase, context.userId, context.workspaceId);
    if (packageGateResponse) return packageGateResponse;

    const payload = (await request.json().catch(() => null)) as GenerateRequestBody | null;
    const prompt = String(payload?.prompt ?? '').trim();
    const projectId = String(payload?.project_id ?? '').trim();

    if (!prompt) return json({ ok: false, error: 'prompt zorunlu.' }, 400);
    if (!projectId) return json({ ok: false, error: 'project_id zorunlu.' }, 400);

    const gameBrief = await generateGameBriefWithGroq(prompt);

    const serviceRole = getSupabaseServiceRoleClient();
    const { error: insertError } = await serviceRole.from('game_briefs').insert({
      workspace_id: context.workspaceId,
      user_id: context.userId,
      unity_game_project_id: projectId,
      prompt,
      model: process.env.GROQ_MODEL?.trim() || null,
      brief_json: gameBrief
    });

    if (insertError) {
      return json({ ok: false, error: insertError.message }, 400);
    }

    return json({ ok: true, brief: gameBrief }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.';
    return json({ ok: false, error: message }, 500);
  }
}
