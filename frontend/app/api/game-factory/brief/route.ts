import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { requireActiveGameAgentPackage } from '@/lib/game-agent-access';

type BriefRequest = {
  prompt?: unknown;
  userPrompt?: unknown;
  gameIdea?: unknown;
  targetPlatform?: unknown;
  platform?: unknown;
};

type ComplexityLevel = 'simple' | 'medium' | 'advanced';
type InfrastructureLevel = 'none' | 'basic' | 'advanced';

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
  complexityLevel: ComplexityLevel;
  infrastructureRequired: boolean;
  infrastructureLevel: InfrastructureLevel;
  requiredInfrastructure: string[];
  requiredUserAccounts: string[];
  monetizationRequired: boolean;
  iapRequired: boolean;
  adsRequired: boolean;
  subscriptionsRequired: boolean;
  backendRequired: boolean;
  multiplayerRequired: boolean;
  publishingRequirements: string[];
  blockersBeforeBuild: string[];
  blockersBeforePublish: string[];
};

function logRouteError(stage: 'request_parse' | 'ai_call' | 'ai_parse' | 'db_write', error: unknown, extras?: Record<string, unknown>) {
  const normalized = error instanceof Error
    ? { message: error.message, stack: error.stack }
    : { message: typeof error === 'string' ? error : 'Unknown error' };

  console.error('[game-factory brief]', { route: 'game-factory brief', stage, ...extras, ...normalized });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function toBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', 'yes', '1', 'evet'].includes(value.trim().toLowerCase());
  return false;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(isNonEmptyString).map((entry) => entry.trim());
  if (isNonEmptyString(value)) {
    return value.split(/\n|,|;|•|-/g).map((entry) => entry.trim()).filter(Boolean);
  }
  return [];
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
    'title', 'slug', 'packageName', 'summary', 'gameType', 'targetPlatform', 'mechanics', 'visualStyle', 'controls',
    'monetizationNotes', 'releaseNotes', 'storeShortDescription', 'storeFullDescription',
    'complexityLevel', 'infrastructureRequired', 'infrastructureLevel', 'requiredInfrastructure', 'requiredUserAccounts',
    'monetizationRequired', 'iapRequired', 'adsRequired', 'subscriptionsRequired', 'backendRequired', 'multiplayerRequired',
    'publishingRequirements', 'blockersBeforeBuild', 'blockersBeforePublish'
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
    complexityLevel: { type: 'string', enum: ['simple', 'medium', 'advanced'] },
    infrastructureRequired: { type: 'boolean' },
    infrastructureLevel: { type: 'string', enum: ['none', 'basic', 'advanced'] },
    requiredInfrastructure: { type: 'array', items: { type: 'string', minLength: 1 } },
    requiredUserAccounts: { type: 'array', items: { type: 'string', minLength: 1 } },
    monetizationRequired: { type: 'boolean' },
    iapRequired: { type: 'boolean' },
    adsRequired: { type: 'boolean' },
    subscriptionsRequired: { type: 'boolean' },
    backendRequired: { type: 'boolean' },
    multiplayerRequired: { type: 'boolean' },
    publishingRequirements: { type: 'array', items: { type: 'string', minLength: 1 } },
    blockersBeforeBuild: { type: 'array', items: { type: 'string', minLength: 1 } },
    blockersBeforePublish: { type: 'array', items: { type: 'string', minLength: 1 } }
  }
} as const;

async function callGroqBriefModel(prompt: string, targetPlatform: 'android', model: string): Promise<string> {
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  if (!groqApiKey) throw new Error('missing_groq_key');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'Sen bir oyun tasarımcısısın. SADECE geçerli bir JSON nesnesi döndür. Markdown, kod bloğu, açıklama, yorum veya ek metin yazma.'
        },
        {
          role: 'user',
          content:
            `Kullanıcı oyun fikri: ${prompt}\n` +
            `Hedef platform: ${targetPlatform}\n\n` +
            'Aşağıdaki alanlarla bir oyun brief JSON nesnesi üret:\n' +
            'title, slug, packageName, summary, gameType, targetPlatform, mechanics, visualStyle, controls, monetizationNotes, releaseNotes, storeShortDescription, storeFullDescription, complexityLevel, infrastructureRequired, infrastructureLevel, requiredInfrastructure, requiredUserAccounts, monetizationRequired, iapRequired, adsRequired, subscriptionsRequired, backendRequired, multiplayerRequired, publishingRequirements, blockersBeforeBuild, blockersBeforePublish\n\n' +
            'Kurallar:\n- gameType değeri kesinlikle "runner_2d" olmalı.\n- targetPlatform değeri kesinlikle "android" olmalı.\n- mechanics en az 1 maddelik dizi olmalı.\n- Sadece JSON döndür.'
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
  if (typeof rawContent === 'string') return rawContent.trim();
  if (Array.isArray(rawContent)) return rawContent.map((item) => (typeof item?.text === 'string' ? item.text : '')).join('\n').trim();
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

function inferRunnerFromPrompt(prompt: string): boolean {
  return /(runner|sonsuz koşu|koşu|engel|zıpla|zipl)/i.test(prompt);
}

function inferTechnicalRequirements(prompt: string, monetizationNotes: string) {
  const haystack = `${prompt} ${monetizationNotes}`.toLowerCase();
  const multiplayerRequired = /(multiplayer|çok oyunculu|co-op|coop|pvp|realtime|real-time|socket|matchmaking)/i.test(haystack);
  const backendRequired = /(backend|sunucu|server|api|auth|giriş|login|hesap|database|veritaban|firebase|leaderboard|bulut)/i.test(haystack) || multiplayerRequired;
  const iapRequired = /(iap|in-app|in app|satın al|purchase|coin pack|premium item|store)/i.test(haystack);
  const adsRequired = /(ads|admob|ad unit|rewarded|interstitial|banner|reklam)/i.test(haystack);
  const subscriptionsRequired = /(subscription|abonelik|monthly|yearly)/i.test(haystack);
  const monetizationRequired = iapRequired || adsRequired || subscriptionsRequired || /(monetizasyon|gelir|para kazan)/i.test(haystack);

  const requiredInfrastructure = [
    ...(backendRequired ? ['Server/backend API', 'Database'] : []),
    ...(multiplayerRequired ? ['Realtime multiplayer service'] : []),
    ...(iapRequired ? ['Google Play Billing product catalog'] : []),
    ...(adsRequired ? ['Ad network account + ad unit setup'] : [])
  ];

  const requiredUserAccounts = [
    'Google Play Console account',
    ...(backendRequired ? ['Backend hosting provider account'] : []),
    ...(adsRequired ? ['Ad network account (AdMob vb.)'] : [])
  ];

  const publishingRequirements = [
    'AAB artifact ready',
    'Google Play integration connected',
    'Package name configured and matched',
    'Release track selected',
    ...(iapRequired ? ['IAP products configured'] : []),
    ...(adsRequired ? ['Ad units configured'] : []),
    ...(backendRequired ? ['Backend endpoints configured'] : [])
  ];

  const technicalCount = [multiplayerRequired, backendRequired, iapRequired, adsRequired, subscriptionsRequired].filter(Boolean).length;
  const complexityLevel: ComplexityLevel = technicalCount >= 3 ? 'advanced' : technicalCount >= 1 ? 'medium' : 'simple';
  const infrastructureRequired = backendRequired || multiplayerRequired || iapRequired || adsRequired;
  const infrastructureLevel: InfrastructureLevel = !infrastructureRequired ? 'none' : multiplayerRequired || backendRequired ? 'advanced' : 'basic';

  return {
    complexityLevel,
    infrastructureRequired,
    infrastructureLevel,
    requiredInfrastructure,
    requiredUserAccounts,
    monetizationRequired,
    iapRequired,
    adsRequired,
    subscriptionsRequired,
    backendRequired,
    multiplayerRequired,
    publishingRequirements,
    blockersBeforeBuild: infrastructureRequired ? ['Technical checklist confirmation required before build.'] : [],
    blockersBeforePublish: ['Google Play integration, release configuration and required monetization/backend setup must be complete before publish.']
  };
}

function normalizeBrief(raw: Record<string, unknown>, prompt: string, platform: 'android'): GameBrief {
  const title = isNonEmptyString(raw.title) ? raw.title.trim() : '';
  const summary = isNonEmptyString(raw.summary) ? raw.summary.trim() : '';
  const slug = isNonEmptyString(raw.slug) ? toSlug(raw.slug) : toSlug(title);
  const mechanics = toStringArray(raw.mechanics);
  const storeShortDescription = isNonEmptyString(raw.storeShortDescription) ? raw.storeShortDescription.trim() : '';
  const storeFullDescription = isNonEmptyString(raw.storeFullDescription) ? raw.storeFullDescription.trim() : '';
  const monetizationNotes = isNonEmptyString(raw.monetizationNotes) ? raw.monetizationNotes.trim() : '';

  const gameType = raw.gameType === 'runner_2d' ? 'runner_2d' : inferRunnerFromPrompt(prompt) ? 'runner_2d' : '';
  const finalSlug = slug || toSlug(title);
  const packageName = isNonEmptyString(raw.packageName) ? raw.packageName.trim() : `com.koschei.generated.${finalSlug.replace(/-/g, '') || 'game'}`;
  const inferred = inferTechnicalRequirements(prompt, monetizationNotes);

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
    monetizationNotes,
    releaseNotes: isNonEmptyString(raw.releaseNotes) ? raw.releaseNotes.trim() : '',
    storeShortDescription,
    storeFullDescription,
    complexityLevel: raw.complexityLevel === 'simple' || raw.complexityLevel === 'medium' || raw.complexityLevel === 'advanced' ? raw.complexityLevel : inferred.complexityLevel,
    infrastructureRequired: toBool(raw.infrastructureRequired) || inferred.infrastructureRequired,
    infrastructureLevel: raw.infrastructureLevel === 'none' || raw.infrastructureLevel === 'basic' || raw.infrastructureLevel === 'advanced' ? raw.infrastructureLevel : inferred.infrastructureLevel,
    requiredInfrastructure: toStringArray(raw.requiredInfrastructure).length ? toStringArray(raw.requiredInfrastructure) : inferred.requiredInfrastructure,
    requiredUserAccounts: toStringArray(raw.requiredUserAccounts).length ? toStringArray(raw.requiredUserAccounts) : inferred.requiredUserAccounts,
    monetizationRequired: toBool(raw.monetizationRequired) || inferred.monetizationRequired,
    iapRequired: toBool(raw.iapRequired) || inferred.iapRequired,
    adsRequired: toBool(raw.adsRequired) || inferred.adsRequired,
    subscriptionsRequired: toBool(raw.subscriptionsRequired) || inferred.subscriptionsRequired,
    backendRequired: toBool(raw.backendRequired) || inferred.backendRequired,
    multiplayerRequired: toBool(raw.multiplayerRequired) || inferred.multiplayerRequired,
    publishingRequirements: toStringArray(raw.publishingRequirements).length ? toStringArray(raw.publishingRequirements) : inferred.publishingRequirements,
    blockersBeforeBuild: toStringArray(raw.blockersBeforeBuild).length ? toStringArray(raw.blockersBeforeBuild) : inferred.blockersBeforeBuild,
    blockersBeforePublish: toStringArray(raw.blockersBeforePublish).length ? toStringArray(raw.blockersBeforePublish) : inferred.blockersBeforePublish
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
    if (!rawBody || !rawBody.trim()) return json({ ok: false, error: 'Oyun fikri okunamadı. Lütfen tekrar deneyin.' }, 400);
    requestBody = JSON.parse(rawBody) as BriefRequest;
  } catch (error) {
    logRouteError('request_parse', error);
    return json({ ok: false, error: 'Oyun fikri okunamadı. Lütfen tekrar deneyin.' }, 400);
  }

  const promptValue = requestBody.prompt ?? requestBody.userPrompt ?? requestBody.gameIdea;
  const prompt = typeof promptValue === 'string' ? promptValue.trim() : '';
  if (!prompt) return json({ ok: false, error: 'Oyun fikri boş olamaz.' }, 400);

  const targetPlatform = 'android';
  const provider = resolveAiProvider(process.env.AI_PROVIDER);
  const isGroqProvider = provider === 'groq';
  const model = isGroqProvider ? process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL : process.env.OPENAI_MODEL_PRIMARY?.trim() || 'gpt-4o';

  if (isGroqProvider && !process.env.GROQ_API_KEY?.trim()) return json({ ok: false, error: 'GROQ_API_KEY eksik.' }, 500);
  if (!isGroqProvider && !process.env.OPENAI_API_KEY?.trim()) return json({ ok: false, error: 'OPENAI_API_KEY eksik.' }, 500);

  let aiText = '';
  try {
    if (isGroqProvider) {
      aiText = await callGroqBriefModel(prompt, targetPlatform, model);
    } else {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await client.responses.create({
        model,
        input: [
          { role: 'system', content: [{ type: 'input_text', text: 'Sen bir oyun tasarımcısısın. SADECE geçerli bir JSON nesnesi döndür. Markdown, kod bloğu, açıklama, yorum veya ek metin yazma.' }] },
          {
            role: 'user',
            content: [{
              type: 'input_text',
              text:
                `Kullanıcı oyun fikri: ${prompt}\n` +
                `Hedef platform: ${targetPlatform}\n\n` +
                'Aşağıdaki alanlarla bir oyun brief JSON nesnesi üret:\n' +
                'title, slug, packageName, summary, gameType, targetPlatform, mechanics, visualStyle, controls, monetizationNotes, releaseNotes, storeShortDescription, storeFullDescription, complexityLevel, infrastructureRequired, infrastructureLevel, requiredInfrastructure, requiredUserAccounts, monetizationRequired, iapRequired, adsRequired, subscriptionsRequired, backendRequired, multiplayerRequired, publishingRequirements, blockersBeforeBuild, blockersBeforePublish\n\n' +
                'Kurallar:\n- gameType değeri kesinlikle "runner_2d" olmalı.\n- targetPlatform değeri kesinlikle "android" olmalı.\n- mechanics en az 1 maddelik dizi olmalı.\n- Sadece JSON döndür.'
            }]
          }
        ],
        text: { format: { type: 'json_schema', name: 'game_factory_brief', strict: true, schema: GAME_BRIEF_SCHEMA } }
      } as never);
      aiText = typeof response.output_text === 'string' ? response.output_text.trim() : '';
    }

    if (!aiText) {
      console.error('[game-factory brief]', { stage: 'ai_parse_failed', reason: 'empty_ai_response' });
      return json({ ok: false, error: "Oyun brief'i oluşturulamadı. Lütfen fikri biraz daha net yazıp tekrar deneyin." }, 502);
    }
  } catch (error) {
    logRouteError('ai_call', error);
    return json({ ok: false, error: "Oyun brief'i oluşturulamadı. Lütfen fikri biraz daha net yazıp tekrar deneyin." }, 502);
  }

  let parsed: GameBrief;
  try {
    const normalized = normalizeBrief(JSON.parse(aiText) as Record<string, unknown>, prompt, targetPlatform);
    const reason = getParseFailureReason(normalized);
    if (reason) {
      console.error('[game-factory brief]', { stage: 'ai_parse_failed', reason });
      return json({ ok: false, error: "Oyun brief'i oluşturulamadı. Lütfen fikri biraz daha net yazıp tekrar deneyin." }, 422);
    }
    parsed = normalized;
  } catch (error) {
    logRouteError('ai_parse', error, { rawAiResponse: aiText.slice(0, 1200) });
    return json({ ok: false, error: "Oyun brief'i oluşturulamadı. Lütfen fikri biraz daha net yazıp tekrar deneyin." }, 422);
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
      status: 'draft',
      approval_status: 'pending',
      game_brief: parsed
    })
    .select('id')
    .single();

  if (error || !data) {
    logRouteError('db_write', error ?? new Error('Missing inserted row data'));
    return json({ error: 'Oyun projesi kaydedilemedi. Lütfen tekrar deneyin.' }, 400);
  }

  await context.supabase.from('game_monetization_configs').upsert({
    workspace_id: context.workspaceId,
    unity_game_project_id: data.id,
    monetization_required: parsed.monetizationRequired,
    iap_required: parsed.iapRequired,
    ads_required: parsed.adsRequired,
    subscriptions_required: parsed.subscriptionsRequired,
    backend_required: parsed.backendRequired,
    multiplayer_required: parsed.multiplayerRequired,
    privacy_policy_required: parsed.iapRequired || parsed.adsRequired,
    metadata: {
      complexity_level: parsed.complexityLevel,
      infrastructure_level: parsed.infrastructureLevel
    }
  }, { onConflict: 'unity_game_project_id' });

  return json({ ok: true, projectId: data.id, brief: parsed });
}
