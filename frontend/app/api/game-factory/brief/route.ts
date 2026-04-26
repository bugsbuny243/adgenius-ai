import OpenAI from 'openai';
import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';

type BriefRequest = {
  prompt?: unknown;
  userPrompt?: unknown;
  gameIdea?: unknown;
  targetPlatform?: unknown;
  platform?: unknown;
};

type GameBrief = {
  title: string;
  slug: string;
  packageName: string;
  summary: string;
  gameType: 'runner_2d';
  targetPlatform: 'android';
  mechanics: string[];
  visualStyle: string;
  controls: string;
  monetizationNotes: string;
  releaseNotes: string;
  storeShortDescription: string;
  storeFullDescription: string;
};

function logRouteError(stage: 'request_parse' | 'ai_call' | 'ai_parse' | 'db_write', error: unknown, extras?: Record<string, unknown>) {
  const normalized = error instanceof Error
    ? { message: error.message, stack: error.stack }
    : { message: typeof error === 'string' ? error : 'Unknown error' };

  console.error('[game-factory brief]', {
    route: 'game-factory brief',
    stage,
    ...extras,
    ...normalized
  });
}

function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const noFence = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const firstBrace = noFence.indexOf('{');
  const lastBrace = noFence.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    return noFence;
  }

  return noFence.slice(firstBrace, lastBrace + 1);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidBrief(parsed: unknown): parsed is GameBrief {
  if (!parsed || typeof parsed !== 'object') return false;
  const value = parsed as Record<string, unknown>;

  return (
    isNonEmptyString(value.title) &&
    isNonEmptyString(value.slug) &&
    isNonEmptyString(value.packageName) &&
    isNonEmptyString(value.summary) &&
    value.gameType === 'runner_2d' &&
    value.targetPlatform === 'android' &&
    Array.isArray(value.mechanics) && value.mechanics.length > 0 && value.mechanics.every(isNonEmptyString) &&
    isNonEmptyString(value.visualStyle) &&
    isNonEmptyString(value.controls) &&
    isNonEmptyString(value.monetizationNotes) &&
    isNonEmptyString(value.releaseNotes) &&
    isNonEmptyString(value.storeShortDescription) &&
    isNonEmptyString(value.storeFullDescription)
  );
}

export async function POST(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  let requestBody: BriefRequest;
  try {
    const rawBody = await request.text();
    if (!rawBody || !rawBody.trim()) {
      return json({ ok: false, error: 'Oyun fikri okunamadı. Lütfen tekrar deneyin.' }, 400);
    }

    requestBody = JSON.parse(rawBody) as BriefRequest;
  } catch (error) {
    logRouteError('request_parse', error);
    return json({ ok: false, error: 'Oyun fikri okunamadı. Lütfen tekrar deneyin.' }, 400);
  }

  const promptValue = requestBody.prompt ?? requestBody.userPrompt ?? requestBody.gameIdea;
  const prompt = typeof promptValue === 'string' ? promptValue.trim() : '';

  if (!prompt) {
    return json({ ok: false, error: 'Oyun fikri boş olamaz.' }, 400);
  }

  const requestedPlatform = requestBody.targetPlatform ?? requestBody.platform;
  const targetPlatform = requestedPlatform === 'android' ? 'android' : 'android';

  if (!process.env.OPENAI_API_KEY) {
    return json({ ok: false, error: 'OPENAI_API_KEY eksik.' }, 500);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL_PRIMARY?.trim() || 'gpt-4o';

  let aiText = '';
  try {
    const response = await client.responses.create({
      model,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: 'Sen bir oyun tasarımcısısın. Sadece geçerli JSON yanıtı üret. Başka metin, markdown veya açıklama ekleme.'
            }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text:
                `Kullanıcı oyun fikri: ${prompt}\n` +
                `Hedef platform: ${targetPlatform}\n\n` +
                'Aşağıdaki şemaya tam uyan bir JSON nesnesi üret:\n' +
                '{"title":"string","slug":"string","packageName":"string","summary":"string","gameType":"runner_2d","targetPlatform":"android","mechanics":["string"],"visualStyle":"string","controls":"string","monetizationNotes":"string","releaseNotes":"string","storeShortDescription":"string","storeFullDescription":"string"}'
            }
          ]
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'game_factory_brief',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: [
              'title',
              'slug',
              'packageName',
              'summary',
              'gameType',
              'targetPlatform',
              'mechanics',
              'visualStyle',
              'controls',
              'monetizationNotes',
              'releaseNotes',
              'storeShortDescription',
              'storeFullDescription'
            ],
            properties: {
              title: { type: 'string', minLength: 1 },
              slug: { type: 'string', minLength: 1 },
              packageName: { type: 'string', minLength: 1 },
              summary: { type: 'string', minLength: 1 },
              gameType: { type: 'string', enum: ['runner_2d'] },
              targetPlatform: { type: 'string', enum: ['android'] },
              mechanics: { type: 'array', minItems: 1, items: { type: 'string', minLength: 1 } },
              visualStyle: { type: 'string', minLength: 1 },
              controls: { type: 'string', minLength: 1 },
              monetizationNotes: { type: 'string', minLength: 1 },
              releaseNotes: { type: 'string', minLength: 1 },
              storeShortDescription: { type: 'string', minLength: 1 },
              storeFullDescription: { type: 'string', minLength: 1 }
            }
          }
        }
      }
    } as never);

    aiText = typeof response.output_text === 'string' ? response.output_text.trim() : '';
    if (!aiText) {
      return json({ ok: false, error: 'AI sağlayıcısı boş yanıt döndürdü. Lütfen tekrar deneyin.' }, 502);
    }
  } catch (error) {
    logRouteError('ai_call', error);
    return json(
      { ok: false, error: "Oyun brief'i oluşturulamadı. Lütfen fikri biraz daha net yazıp tekrar deneyin." },
      502
    );
  }

  let parsed: GameBrief;
  try {
    const sanitized = stripJsonFences(aiText);
    parsed = JSON.parse(sanitized) as GameBrief;
    if (!isValidBrief(parsed)) {
      throw new Error('AI response JSON shape is invalid.');
    }
  } catch (error) {
    logRouteError('ai_parse', error, { rawAiResponse: aiText.slice(0, 1200) });
    return json(
      { ok: false, error: "Oyun brief'i oluşturulamadı. Lütfen fikri biraz daha net yazıp tekrar deneyin." },
      422
    );
  }

  const { data, error } = await context.supabase
    .from('unity_game_projects')
    .insert({
      workspace_id: context.workspaceId,
      user_id: context.userId,
      app_name: parsed.title,
      user_prompt: prompt,
      package_name: parsed.packageName,
      target_platform: targetPlatform,
      status: 'brief_ready',
      approval_status: 'pending',
      game_brief: parsed
    })
    .select('id')
    .single();

  if (error || !data) {
    logRouteError('db_write', error ?? new Error('Missing inserted row data'));
    return json({ ok: false, error: error?.message ?? 'Kayıt oluşturulamadı.' }, 400);
  }

  return json({ ok: true, projectId: data.id, brief: parsed });
}
