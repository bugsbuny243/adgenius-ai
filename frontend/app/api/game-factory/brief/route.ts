import OpenAI from 'openai';
import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';

type BriefRequest = { prompt: string; platform: 'android' | 'ios' };

type GameBrief = {
  appName: string;
  packageName: string;
  genre: 'runner' | 'platformer' | 'puzzle' | 'arcade' | 'casual';
  description: string;
  storeShortDescription: string;
  storeFullDescription: string;
  visualStyle: string;
  controls: string;
  monetization: 'ads' | 'iap' | 'free';
  targetAge: 'kids' | 'all' | 'teens';
  keyFeatures: string[];
};

function cleanJsonFence(raw: string): string {
  return raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
}

export async function POST(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  const body = (await request.json()) as Partial<BriefRequest>;
  const prompt = body.prompt?.trim();
  const platform = body.platform;

  if (!prompt || (platform !== 'android' && platform !== 'ios')) {
    return json({ ok: false, error: 'Geçersiz istek.' }, 400);
  }

  if (!process.env.OPENAI_API_KEY) {
    return json({ ok: false, error: 'OPENAI_API_KEY eksik.' }, 500);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL_PRIMARY?.trim() || 'gpt-4o';

  const response = await client.responses.create({
    model,
    instructions:
      'Sen bir oyun tasarımcısısın. Kullanıcının oyun fikrine göre yapılandırılmış bir oyun brief\'i oluştur. SADECE JSON döndür, başka hiçbir şey yazma.',
    input: `Kullanıcı fikri: ${prompt}\nPlatform: ${platform}\n\nİstenen JSON formatını birebir kullan.`
  });

  const text = typeof response.output_text === 'string' ? response.output_text : '';
  const parsed = JSON.parse(cleanJsonFence(text)) as GameBrief;

  const { data, error } = await context.supabase
    .from('unity_game_projects')
    .insert({
      workspace_id: context.workspaceId,
      user_id: context.userId,
      app_name: parsed.appName,
      user_prompt: prompt,
      package_name: parsed.packageName,
      target_platform: platform,
      status: 'brief_ready',
      approval_status: 'pending',
      game_brief: parsed
    })
    .select('id')
    .single();

  if (error || !data) {
    return json({ ok: false, error: error?.message ?? 'Kayıt oluşturulamadı.' }, 400);
  }

  return json({ ok: true, projectId: data.id, brief: parsed });
}
