import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { requireActiveGameAgentPackage } from '@/lib/game-agent-access';
import { normalizeBrief } from '@/lib/game-factory/brief/service';
import { saveGeneratedBrief } from '@/lib/game-factory/brief/repository';
import { parsePlatform, parsePrompt, type BriefRequest } from '@/lib/game-factory/brief/validation';

export async function POST(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  const packageGateResponse = await requireActiveGameAgentPackage(context.supabase, context.userId, context.workspaceId);
  if (packageGateResponse) return packageGateResponse;

  const body = (await request.json().catch(() => null)) as BriefRequest | null;
  if (!body) return json({ ok: false, error: 'Geçersiz body.' }, 400);

  const prompt = parsePrompt(body);
  if (!prompt) return json({ ok: false, error: 'prompt zorunlu.' }, 400);

  const platform = parsePlatform(body);
  if (platform !== 'android') return json({ ok: false, error: 'Sadece android desteklenir.' }, 400);

  const brief = normalizeBrief({ title: prompt, summary: prompt, mechanics: ['runner'] }, prompt);

  const { data: project } = await context.supabase
    .from('unity_game_projects')
    .insert({ workspace_id: context.workspaceId, user_id: context.userId, app_name: brief.title, package_name: brief.packageName, status: 'draft', metadata: brief })
    .select('id')
    .single();

  if (!project?.id) return json({ ok: false, error: 'Proje oluşturulamadı.' }, 400);
  await saveGeneratedBrief(context.supabase, project.id, context.workspaceId, brief);

  return json({ ok: true, brief, projectId: project.id });
}
