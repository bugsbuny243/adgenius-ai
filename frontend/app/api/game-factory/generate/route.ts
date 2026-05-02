import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { requireActiveGameAgentPackage } from '@/lib/game-agent-access';
import { type GameBrief, generateGameBriefWithGroq } from '@/lib/ai-engine';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

type GenerateRequestBody = {
  prompt?: string | null;
  project_id?: string | null;
};

type UnityBuildTarget = 'koschei-android' | 'koschei-webgl' | 'koschei-windows64';

const BUILD_TARGET_BY_PLATFORM: Record<GameBrief['target_platforms'][number], UnityBuildTarget> = {
  Android: 'koschei-android',
  WebGL: 'koschei-webgl',
  StandaloneWindows64: 'koschei-windows64'
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
    const orchestrationMetadata: Pick<GameBrief, 'target_engine' | 'target_platforms'> = {
      target_engine: gameBrief.target_engine,
      target_platforms: gameBrief.target_platforms
    };
    const primaryPlatform = orchestrationMetadata.target_platforms[0];
    const selectedBuildTarget = BUILD_TARGET_BY_PLATFORM[primaryPlatform];

    if (!selectedBuildTarget) {
      return json({ ok: false, error: 'AI geçersiz platform döndürdü.' }, 400);
    }

    console.info('[Koschei][GameFactory] Generated orchestration decision', {
      projectId,
      targetEngine: orchestrationMetadata.target_engine,
      targetPlatforms: orchestrationMetadata.target_platforms,
      selectedBuildTarget
    });

    const serviceRole = getSupabaseServiceRoleClient();
    const { error: insertError } = await serviceRole.from('game_briefs').insert({
      workspace_id: context.workspaceId,
      user_id: context.userId,
      unity_game_project_id: projectId,
      prompt,
      model: process.env.GROQ_MODEL?.trim() || null,
      brief_json: gameBrief,
      target_platform: orchestrationMetadata.target_platforms.join(','),
      metadata: orchestrationMetadata
    });

    if (insertError) {
      return json({ ok: false, error: insertError.message }, 400);
    }

    const queuedAt = new Date().toISOString();
    const { error: buildJobError } = await serviceRole.from('unity_build_jobs').insert({
      unity_game_project_id: projectId,
      workspace_id: context.workspaceId,
      user_id: context.userId,
      requested_by: context.userId,
      build_target: selectedBuildTarget,
      build_type: 'design-plan',
      status: 'queued',
      queued_at: queuedAt,
      metadata: {
        source: 'ai_generate',
        targetPlatforms: orchestrationMetadata.target_platforms
      }
    });

    if (buildJobError) {
      console.error('[Koschei][GameFactory] Failed to queue unity_build_jobs record', {
        projectId,
        selectedBuildTarget,
        message: buildJobError.message
      });
      return json({ ok: false, error: buildJobError.message }, 400);
    }

    return json({ ok: true, brief: gameBrief }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.';
    return json({ ok: false, error: message }, 500);
  }
}
