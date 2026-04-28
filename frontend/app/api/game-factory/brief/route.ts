import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { requireActiveGameAgentPackage } from '@/lib/game-agent-access';

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
  google_play_required: boolean;
  google_play_account_status: 'unknown' | 'user_has_account' | 'user_needs_setup' | 'artifact_only';
  publishing_blockers: string[];
  delivery_mode: 'apk_aab_only' | 'play_publish' | 'setup_assisted';
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

type ParseFailureReason =
  | 'invalid_json'
  | 'missing_title'
  | 'missing_summary'
  | 'missing_mechanics'
  | 'missing_store_short_description'
  | 'missing_store_full_description'
  | 'missing_visual_style'
  | 'missing_controls'
  | 'missing_monetization_notes'
  | 'missing_release_notes'
  | 'empty_ai_response';

const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';

function resolveAiProvider(rawProvider: string | undefined): 'groq' | 'openai' {
  const normalized = rawProvider?.trim().toLowerCase();
  if (normalized === 'openai') return 'openai';
  if (normalized === 'groq') return 'groq';
  return 'groq';
}

const GAME_BRIEF_SCHEMA = {
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
    'storeFullDescription',
    'google_play_required',
    'google_play_account_status',
    'publishing_blockers',
    'delivery_mode'
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
    storeFullDescription: { type: 'string', minLength: 1 },
    google_play_required: { type: 'boolean' },
    google_play_account_status: { type: 'string', enum: ['unknown', 'user_has_account', 'user_needs_setup', 'artifact_only'] },
    publishing_blockers: { type: 'array', items: { type: 'string', minLength: 1 } },
    delivery_mode: { type: 'string', enum: ['apk_aab_only', 'play_publish', 'setup_assisted'] }
  }
} as const;

async function callGroqBriefModel(prompt: string, targetPlatform: 'android', model: string): Promise<string> {
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  if (!groqApiKey) {
    throw new Error('missing_groq_key');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'Sen bir oyun tasarımcısısın. SADECE geçerli bir JSON nesnesi döndür. Markdown, kod bloğu, açıklama, yorum veya ek metin yazma.'
        },
        {
          role: 'user',
          content:
            `Kullanıcı oyun fikri: ${prompt}\n` +
            `Hedef platform: ${targetPlatform}\n\n` +
            'Aşağıdaki alanlarla bir oyun brief JSON nesnesi üret:\n' +
            'title, slug, packageName, summary, gameType, targetPlatform, mechanics, visualStyle, controls, monetizationNotes, releaseNotes, storeShortDescription, storeFullDescription, google_play_required, google_play_account_status, publishing_blockers, delivery_mode\n\n' +
            'Kurallar:\n' +
            '- gameType değeri kesinlikle "runner_2d" olmalı.\n' +
            '- targetPlatform değeri kesinlikle "android" olmalı.\n' +
            '- mechanics en az 1 maddelik dizi olmalı.\n' +
            '- google_play_required boolean olmalı.\n' +
            '- google_play_account_status başlangıçta "unknown" olmalı.\n' +
            '- publishing_blockers en az bir açıklayıcı madde içermeli.\n' +
            '- delivery_mode başlangıçta "setup_assisted" olmalı.\n' +
            '- Sadece JSON döndür.'
        }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`groq_http_${response.status}:${errorBody.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
  };

  const rawContent = payload.choices?.[0]?.message?.content;
  if (typeof rawContent === 'string') {
    return rawContent.trim();
  }

  if (Array.isArray(rawContent)) {
    const text = rawContent
      .map((item) => (typeof item?.text === 'string' ? item.text : ''))
      .join('\n')
      .trim();
    return text;
  }

  return '';
}

function toSlug(input: string): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function toMechanics(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(isNonEmptyString).map((entry) => entry.trim());
  }
  if (isNonEmptyString(value)) {
    return value
      .split(/\n|,|;|•|-/g)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function inferRunnerFromPrompt(prompt: string): boolean {
  return /(runner|sonsuz koşu|koşu|engel|zıpla|zipl)/i.test(prompt);
}

function normalizeBrief(raw: Record<string, unknown>, prompt: string, platform: 'android'): GameBrief {
  const title = isNonEmptyString(raw.title) ? raw.title.trim() : '';
  const summary = isNonEmptyString(raw.summary) ? raw.summary.trim() : '';
  const slug = isNonEmptyString(raw.slug) ? toSlug(raw.slug) : toSlug(title);
  const mechanics = toMechanics(raw.mechanics);
  const storeShortDescription = isNonEmptyString(raw.storeShortDescription) ? raw.storeShortDescription.trim() : '';
  const storeFullDescription = isNonEmptyString(raw.storeFullDescription) ? raw.storeFullDescription.trim() : '';
  const rawGooglePlayStatus = isNonEmptyString(raw.google_play_account_status) ? raw.google_play_account_status.trim() : '';
  const googlePlayAccountStatus: GameBrief['google_play_account_status'] = rawGooglePlayStatus === 'user_has_account' || rawGooglePlayStatus === 'user_needs_setup' || rawGooglePlayStatus === 'artifact_only'
    ? rawGooglePlayStatus
    : 'unknown';
  const rawDeliveryMode = isNonEmptyString(raw.delivery_mode) ? raw.delivery_mode.trim() : '';
  const deliveryMode: GameBrief['delivery_mode'] = rawDeliveryMode === 'apk_aab_only' || rawDeliveryMode === 'play_publish' || rawDeliveryMode === 'setup_assisted'
    ? rawDeliveryMode
    : 'setup_assisted';
  const publishingBlockers = Array.isArray(raw.publishing_blockers)
    ? raw.publishing_blockers.filter(isNonEmptyString).map((entry) => entry.trim()).filter(Boolean)
    : [];

  const gameType = raw.gameType === 'runner_2d' ? 'runner_2d' : inferRunnerFromPrompt(prompt) ? 'runner_2d' : '';
  const finalSlug = slug || toSlug(title);
  const packageName = isNonEmptyString(raw.packageName)
    ? raw.packageName.trim()
    : `com.koschei.generated.${finalSlug.replace(/-/g, '') || 'game'}`;

  return {
    title,
    slug: finalSlug || 'oyun',
    packageName,
    summary,
    gameType: gameType as 'runner_2d',
    targetPlatform: platform,
    mechanics,
    visualStyle: isNonEmptyString(raw.visualStyle) ? raw.visualStyle.trim() : '',
    controls: isNonEmptyString(raw.controls) ? raw.controls.trim() : '',
    monetizationNotes: isNonEmptyString(raw.monetizationNotes) ? raw.monetizationNotes.trim() : '',
    releaseNotes: isNonEmptyString(raw.releaseNotes) ? raw.releaseNotes.trim() : '',
    storeShortDescription,
    storeFullDescription,
    google_play_required: typeof raw.google_play_required === 'boolean' ? raw.google_play_required : true,
    google_play_account_status: googlePlayAccountStatus,
    publishing_blockers: publishingBlockers.length > 0 ? publishingBlockers : ['Google Play readiness checklist not confirmed.'],
    delivery_mode: deliveryMode
  };
}

function getParseFailureReason(brief: GameBrief): ParseFailureReason | null {
  if (!isNonEmptyString(brief.title)) return 'missing_title';
  if (!isNonEmptyString(brief.summary)) return 'missing_summary';
  if (brief.gameType !== 'runner_2d') return 'invalid_json';
  if (!Array.isArray(brief.mechanics) || brief.mechanics.length === 0) return 'missing_mechanics';
  if (!isNonEmptyString(brief.visualStyle)) return 'missing_visual_style';
  if (!isNonEmptyString(brief.controls)) return 'missing_controls';
  if (!isNonEmptyString(brief.monetizationNotes)) return 'missing_monetization_notes';
  if (!isNonEmptyString(brief.releaseNotes)) return 'missing_release_notes';
  if (!isNonEmptyString(brief.storeShortDescription)) return 'missing_store_short_description';
  if (!isNonEmptyString(brief.storeFullDescription)) return 'missing_store_full_description';
  if (!Array.isArray(brief.publishing_blockers)) return 'invalid_json';
  return null;
}

export async function POST(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  const packageGateResponse = await requireActiveGameAgentPackage(context.supabase, context.userId, context.workspaceId);
  if (packageGateResponse) return packageGateResponse;

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
  void requestedPlatform;
  const normalizedTargetPlatform = 'android';
  const targetPlatform = normalizedTargetPlatform;

  const provider = resolveAiProvider(process.env.AI_PROVIDER);
  const isGroqProvider = provider === 'groq';
  const model = isGroqProvider
    ? process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL
    : process.env.OPENAI_MODEL_PRIMARY?.trim() || 'gpt-4o';

  if (isGroqProvider) {
    if (!process.env.GROQ_API_KEY?.trim()) {
      return json({ ok: false, error: 'GROQ_API_KEY eksik.' }, 500);
    }
  } else if (!process.env.OPENAI_API_KEY?.trim()) {
    return json({ ok: false, error: 'OPENAI_API_KEY eksik.' }, 500);
  }

  let aiText = '';
  try {
    console.info('[game-factory brief]', {
      stage: 'ai_call_started',
      provider,
      model,
      promptLength: prompt.length,
      platform: targetPlatform
    });

    if (isGroqProvider) {
      aiText = await callGroqBriefModel(prompt, targetPlatform, model);
    } else {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await client.responses.create({
        model,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text:
                  'Sen bir oyun tasarımcısısın. SADECE geçerli bir JSON nesnesi döndür. Markdown, kod bloğu, açıklama, yorum veya ek metin yazma.'
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
                  'Aşağıdaki alanlarla bir oyun brief JSON nesnesi üret:\n' +
                  'title, slug, packageName, summary, gameType, targetPlatform, mechanics, visualStyle, controls, monetizationNotes, releaseNotes, storeShortDescription, storeFullDescription, google_play_required, google_play_account_status, publishing_blockers, delivery_mode\n\n' +
                  'Kurallar:\n' +
                  '- gameType değeri kesinlikle "runner_2d" olmalı.\n' +
                  '- targetPlatform değeri kesinlikle "android" olmalı.\n' +
                  '- mechanics en az 1 maddelik dizi olmalı.\n' +
                  '- google_play_required boolean olmalı.\n' +
                  '- google_play_account_status başlangıçta "unknown" olmalı.\n' +
                  '- publishing_blockers en az bir açıklayıcı madde içermeli.\n' +
                  '- delivery_mode başlangıçta "setup_assisted" olmalı.\n' +
                  '- Sadece JSON döndür.'
              }
            ]
          }
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'game_factory_brief',
            strict: true,
            schema: GAME_BRIEF_SCHEMA
          }
        }
      } as never);

      aiText = typeof response.output_text === 'string' ? response.output_text.trim() : '';
    }
    console.info('[game-factory brief]', {
      stage: 'ai_response_received',
      rawResponseLength: aiText.length,
      rawResponsePreview: aiText.slice(0, 800)
    });

    if (!aiText) {
      console.error('[game-factory brief]', {
        stage: 'ai_parse_failed',
        reason: 'empty_ai_response'
      });
      return json(
        { ok: false, error: "Oyun brief'i oluşturulamadı. Lütfen fikri biraz daha net yazıp tekrar deneyin." },
        502
      );
    }
  } catch (error) {
    const reason = error instanceof Error && /json_schema|response_format|not supported|unsupported/i.test(error.message)
      ? 'unsupported_model_json_mode'
      : isGroqProvider
        ? 'groq_error'
        : 'openai_error';
    console.error('[game-factory brief]', {
      stage: 'ai_parse_failed',
      reason
    });
    logRouteError('ai_call', error);
    return json(
      { ok: false, error: "Oyun brief'i oluşturulamadı. Lütfen fikri biraz daha net yazıp tekrar deneyin." },
      502
    );
  }

  let parsed: GameBrief;
  try {
    const normalized = normalizeBrief(JSON.parse(aiText) as Record<string, unknown>, prompt, targetPlatform);
    const reason = getParseFailureReason(normalized);
    if (reason) {
      console.error('[game-factory brief]', {
        stage: 'ai_parse_failed',
        reason
      });
      return json(
        { ok: false, error: "Oyun brief'i oluşturulamadı. Lütfen fikri biraz daha net yazıp tekrar deneyin." },
        422
      );
    }
    parsed = normalized;
  } catch (error) {
    const reason = error instanceof SyntaxError ? 'invalid_json' : 'invalid_json';
    console.error('[game-factory brief]', {
      stage: 'ai_parse_failed',
      reason,
      details: error instanceof Error ? error.message : String(error)
    });
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
      target_platform: normalizedTargetPlatform,
      status: 'draft',
      approval_status: 'pending',
      game_brief: parsed
    })
    .select('id')
    .single();

  if (error || !data) {
    const insertPayload = {
      status: 'draft' as const,
      approval_status: 'pending' as const,
      target_platform: normalizedTargetPlatform
    };
    console.error('[game-factory brief]', {
      stage: 'db_write',
      table: 'unity_game_projects',
      status: insertPayload.status,
      approvalStatus: insertPayload.approval_status,
      targetPlatform: insertPayload.target_platform,
      message: error?.message
    });
    logRouteError('db_write', error ?? new Error('Missing inserted row data'));
    return json({ error: 'Oyun projesi kaydedilemedi. Lütfen tekrar deneyin.' }, 400);
  }

  return json({ ok: true, projectId: data.id, brief: parsed });
}
