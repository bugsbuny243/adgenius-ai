import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { requireActiveGameAgentPackage } from '@/lib/game-agent-access';

type BriefRequest = {
  prompt?: unknown;
  userPrompt?: unknown;
  gameIdea?: unknown;
  targetPlatform?: unknown;
  platform?: unknown;
  advancedProjectIntake?: unknown;
};

type ComplexityLevel = 'simple' | 'medium' | 'advanced';
type InfrastructureLevel = 'none' | 'basic' | 'advanced';
type ProjectType = 'singleplayer' | 'multiplayer' | 'mmo' | 'realtime' | 'video' | 'heavy_backend' | 'server_required' | 'other';
type DeliveryMode = 'apk_aab_only' | 'play_publish' | 'setup_assisted';

type AdvancedProjectIntake = {
  project_type?: unknown;
  desired_game_or_app_description?: unknown;
  existing_server_provider?: unknown;
  has_vps_or_dedicated_server?: unknown;
  has_backend_api?: unknown;
  has_database?: unknown;
  has_auth_system?: unknown;
  has_realtime_server?: unknown;
  has_domain_ssl?: unknown;
  has_google_play_console?: unknown;
  has_admob_or_ads_account?: unknown;
  has_iap_setup?: unknown;
  one_time_budget_usd?: unknown;
  monthly_infrastructure_budget_usd?: unknown;
  expected_daily_users?: unknown;
  expected_concurrent_users?: unknown;
  target_regions?: unknown;
  required_features?: unknown;
  optional_features?: unknown;
  delivery_mode?: unknown;
};

type ScopeOption = {
  label: string;
  one_time_budget_usd: number;
  monthly_infrastructure_budget_usd: number;
  scope: string[];
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
  google_play_required: boolean;
  google_play_account_status: 'unknown' | 'user_has_account' | 'user_needs_setup' | 'artifact_only';
  publishing_blockers: string[];
  delivery_mode: DeliveryMode;
  requires_custom_scope: boolean;
  budget_required: boolean;
  infrastructure_intake_required: boolean;
  estimated_minimum_budget: number;
  estimated_monthly_infrastructure_cost: number;
  scalable_scope_options: ScopeOption[];
  feasible_mvp_scope: string[];
  deferred_features: string[];
  required_budget_to_include_deferred_features: number;
  infrastructure_gap_analysis: string[];
  recommended_next_step: string;
  infrastructure_required?: boolean;
  feature_status?: 'coming_soon';
  warning?: string;
};

type NormalizedAdvancedIntake = {
  projectType: ProjectType;
  desiredScope: string;
  existingInfrastructure: Record<string, unknown>;
  budgetJson: Record<string, unknown>;
  targetScaleJson: Record<string, unknown>;
  requiredFeatures: string[];
  optionalFeatures: string[];
  deliveryMode: DeliveryMode;
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

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim().replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function clampInt(value: number | null, fallback = 0): number {
  if (value === null || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.round(value));
}

function normalizeDeliveryMode(value: unknown): DeliveryMode {
  if (value === 'apk_aab_only' || value === 'play_publish' || value === 'setup_assisted') return value;
  return 'play_publish';
}

function normalizeProjectType(value: unknown): ProjectType {
  const input = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (input === 'singleplayer' || input === 'multiplayer' || input === 'mmo' || input === 'realtime' || input === 'video' || input === 'heavy_backend' || input === 'server_required' || input === 'other') {
    return input;
  }
  return 'other';
}

function normalizeAdvancedIntake(raw: unknown, prompt: string): NormalizedAdvancedIntake {
  const intake = typeof raw === 'object' && raw ? (raw as AdvancedProjectIntake) : {};
  const requiredFeatures = toStringArray(intake.required_features);
  const optionalFeatures = toStringArray(intake.optional_features);
  const targetRegions = toStringArray(intake.target_regions);
  const oneTimeBudget = clampInt(toNumber(intake.one_time_budget_usd));
  const monthlyBudget = clampInt(toNumber(intake.monthly_infrastructure_budget_usd));
  const dailyUsers = clampInt(toNumber(intake.expected_daily_users));
  const concurrentUsers = clampInt(toNumber(intake.expected_concurrent_users));
  const projectType = normalizeProjectType(intake.project_type);
  const desiredScope = isNonEmptyString(intake.desired_game_or_app_description)
    ? intake.desired_game_or_app_description.trim()
    : prompt;

  return {
    projectType,
    desiredScope,
    existingInfrastructure: {
      existing_server_provider: isNonEmptyString(intake.existing_server_provider) ? intake.existing_server_provider.trim() : '',
      has_vps_or_dedicated_server: toBool(intake.has_vps_or_dedicated_server),
      has_backend_api: toBool(intake.has_backend_api),
      has_database: toBool(intake.has_database),
      has_auth_system: toBool(intake.has_auth_system),
      has_realtime_server: toBool(intake.has_realtime_server),
      has_domain_ssl: toBool(intake.has_domain_ssl),
      has_google_play_console: toBool(intake.has_google_play_console),
      has_admob_or_ads_account: toBool(intake.has_admob_or_ads_account),
      has_iap_setup: toBool(intake.has_iap_setup)
    },
    budgetJson: {
      one_time_budget_usd: oneTimeBudget,
      monthly_infrastructure_budget_usd: monthlyBudget
    },
    targetScaleJson: {
      expected_daily_users: dailyUsers,
      expected_concurrent_users: concurrentUsers,
      target_regions: targetRegions
    },
    requiredFeatures,
    optionalFeatures,
    deliveryMode: normalizeDeliveryMode(intake.delivery_mode)
  };
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
    'publishingRequirements', 'blockersBeforeBuild', 'blockersBeforePublish',
    'requires_custom_scope', 'budget_required', 'infrastructure_intake_required',
    'estimated_minimum_budget', 'estimated_monthly_infrastructure_cost', 'scalable_scope_options',
    'feasible_mvp_scope', 'deferred_features', 'required_budget_to_include_deferred_features',
    'infrastructure_gap_analysis', 'recommended_next_step'
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
    blockersBeforePublish: { type: 'array', items: { type: 'string', minLength: 1 } },
    requires_custom_scope: { type: 'boolean' },
    budget_required: { type: 'boolean' },
    infrastructure_intake_required: { type: 'boolean' },
    estimated_minimum_budget: { type: 'number', minimum: 0 },
    estimated_monthly_infrastructure_cost: { type: 'number', minimum: 0 },
    scalable_scope_options: {
      type: 'array',
      items: {
        type: 'object',
        required: ['label', 'one_time_budget_usd', 'monthly_infrastructure_budget_usd', 'scope'],
        additionalProperties: false,
        properties: {
          label: { type: 'string', minLength: 1 },
          one_time_budget_usd: { type: 'number', minimum: 0 },
          monthly_infrastructure_budget_usd: { type: 'number', minimum: 0 },
          scope: { type: 'array', items: { type: 'string', minLength: 1 } }
        }
      }
    },
    feasible_mvp_scope: { type: 'array', items: { type: 'string', minLength: 1 } },
    deferred_features: { type: 'array', items: { type: 'string', minLength: 1 } },
    required_budget_to_include_deferred_features: { type: 'number', minimum: 0 },
    infrastructure_gap_analysis: { type: 'array', items: { type: 'string', minLength: 1 } },
    recommended_next_step: { type: 'string', minLength: 1 }
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
            'title, slug, packageName, summary, gameType, targetPlatform, mechanics, visualStyle, controls, monetizationNotes, releaseNotes, storeShortDescription, storeFullDescription, complexityLevel, infrastructureRequired, infrastructureLevel, requiredInfrastructure, requiredUserAccounts, monetizationRequired, iapRequired, adsRequired, subscriptionsRequired, backendRequired, multiplayerRequired, publishingRequirements, blockersBeforeBuild, blockersBeforePublish, requires_custom_scope, budget_required, infrastructure_intake_required, estimated_minimum_budget, estimated_monthly_infrastructure_cost, scalable_scope_options, feasible_mvp_scope, deferred_features, required_budget_to_include_deferred_features, infrastructure_gap_analysis, recommended_next_step\n\n' +
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

const COMING_SOON_WARNING = 'Bu özellikler yakında desteklenecek profesyonel altyapı paketine dahildir.';

function inferComingSoonInfrastructureRequirement(prompt: string, intake: NormalizedAdvancedIntake): boolean {
  const featureHaystack = intake.requiredFeatures.join(' ');
  const haystack = `${prompt} ${featureHaystack} ${intake.projectType}`.toLowerCase();
  return /(multiplayer|çok oyunculu|mmo|live[-\s]?service|realtime|real-time|matchmaking|lobby|chat server|dedicated server|game server|socket|sunucu|server)/i.test(haystack)
    || intake.projectType === 'multiplayer'
    || intake.projectType === 'mmo'
    || intake.projectType === 'realtime'
    || intake.projectType === 'server_required';
}

function getProjectComplexitySignal(prompt: string, intake: NormalizedAdvancedIntake) {
  const haystack = `${prompt} ${intake.projectType} ${intake.requiredFeatures.join(' ')}`.toLowerCase();
  const isAdvanced =
    intake.projectType === 'multiplayer' ||
    intake.projectType === 'mmo' ||
    intake.projectType === 'realtime' ||
    intake.projectType === 'video' ||
    intake.projectType === 'heavy_backend' ||
    intake.projectType === 'server_required' ||
    /(mmo|multiplayer|çok oyunculu|pvp|realtime|socket|matchmaking|video|cdn|stream|backend|sunucu|server)/i.test(haystack);

  let estimatedMinimumBudget = isAdvanced ? 12000 : 3500;
  let estimatedMonthlyInfrastructureCost = isAdvanced ? 350 : 40;

  if (intake.projectType === 'mmo') {
    estimatedMinimumBudget = 30000;
    estimatedMonthlyInfrastructureCost = 1200;
  } else if (intake.projectType === 'video') {
    estimatedMinimumBudget = 20000;
    estimatedMonthlyInfrastructureCost = 900;
  } else if (intake.projectType === 'realtime' || intake.projectType === 'multiplayer') {
    estimatedMinimumBudget = 15000;
    estimatedMonthlyInfrastructureCost = 500;
  }

  const concurrentUsers = typeof intake.targetScaleJson.expected_concurrent_users === 'number' ? intake.targetScaleJson.expected_concurrent_users : 0;
  const minScaleBudgetBoost = concurrentUsers > 500 ? 6000 : concurrentUsers > 150 ? 2500 : 0;
  estimatedMinimumBudget += minScaleBudgetBoost;
  estimatedMonthlyInfrastructureCost += concurrentUsers > 500 ? 700 : concurrentUsers > 150 ? 250 : 0;

  return {
    requiresCustomScope: isAdvanced,
    estimatedMinimumBudget,
    estimatedMonthlyInfrastructureCost,
    minScaleBudgetBoost
  };
}

function generateBudgetScope(prompt: string, intake: NormalizedAdvancedIntake) {
  const oneTimeBudget = typeof intake.budgetJson.one_time_budget_usd === 'number' ? intake.budgetJson.one_time_budget_usd : 0;
  const monthlyBudget = typeof intake.budgetJson.monthly_infrastructure_budget_usd === 'number' ? intake.budgetJson.monthly_infrastructure_budget_usd : 0;
  const complexity = getProjectComplexitySignal(prompt, intake);
  const insufficientBudget = oneTimeBudget > 0 && oneTimeBudget < complexity.estimatedMinimumBudget;
  const insufficientMonthly = monthlyBudget > 0 && monthlyBudget < complexity.estimatedMonthlyInfrastructureCost;

  const darkOrbitLike = /darkorbit/i.test(prompt);
  const tiktokLike = /tiktok/i.test(prompt);
  const mmoWithoutServer = intake.projectType === 'mmo' && !Boolean(intake.existingInfrastructure.has_vps_or_dedicated_server);

  const feasibleMvpScope = [
    'Core gameplay/app loop and basic UI',
    ...(complexity.requiresCustomScope ? ['Limited online prototype (single room / capped concurrency)'] : []),
    ...(darkOrbitLike ? ['Single-player or bot-backed space combat MVP'] : []),
    ...(tiktokLike ? ['Simple video feed MVP without heavy transcoding/CDN pipeline'] : [])
  ];

  const deferredFeatures = [
    ...(complexity.requiresCustomScope ? ['Full-scale realtime backend + autoscaling + observability'] : []),
    ...(darkOrbitLike ? ['Persistent galaxy-scale MMO progression and large scale PvP'] : []),
    ...(tiktokLike ? ['Advanced transcoding ladder, CDN optimization, recommendation ranking'] : [])
  ];

  const infrastructureGapAnalysis: string[] = [];
  if (!intake.existingInfrastructure.has_backend_api) infrastructureGapAnalysis.push('Missing backend API service ownership.');
  if (!intake.existingInfrastructure.has_database) infrastructureGapAnalysis.push('Missing production-ready database.');
  if (complexity.requiresCustomScope && !intake.existingInfrastructure.has_realtime_server) {
    infrastructureGapAnalysis.push('Missing realtime server stack for multiplayer/session sync.');
  }
  if (mmoWithoutServer) infrastructureGapAnalysis.push('MMO scope requires user-owned server or managed setup before full build.');
  if (insufficientBudget) infrastructureGapAnalysis.push('One-time budget is below realistic minimum for requested scope.');
  if (insufficientMonthly) infrastructureGapAnalysis.push('Monthly infrastructure budget is below expected hosting/ops baseline.');

  const scalableScopeOptions: ScopeOption[] = [
    {
      label: 'Lean MVP',
      one_time_budget_usd: Math.max(3000, Math.floor(complexity.estimatedMinimumBudget * 0.35)),
      monthly_infrastructure_budget_usd: Math.max(40, Math.floor(complexity.estimatedMonthlyInfrastructureCost * 0.35)),
      scope: feasibleMvpScope
    },
    {
      label: 'Balanced',
      one_time_budget_usd: Math.max(6000, Math.floor(complexity.estimatedMinimumBudget * 0.7)),
      monthly_infrastructure_budget_usd: Math.max(100, Math.floor(complexity.estimatedMonthlyInfrastructureCost * 0.7)),
      scope: [...feasibleMvpScope, 'Improved progression/content depth and moderate scale backend hardening']
    },
    {
      label: 'Target Scope',
      one_time_budget_usd: complexity.estimatedMinimumBudget,
      monthly_infrastructure_budget_usd: complexity.estimatedMonthlyInfrastructureCost,
      scope: [...feasibleMvpScope, ...deferredFeatures]
    }
  ];

  const recommendedNextStep = insufficientBudget || insufficientMonthly
    ? 'Proceed with Lean MVP scope now, defer advanced features, and revisit budget/infrastructure after validating retention.'
    : 'Proceed with Balanced/Target scope, then finalize infrastructure provisioning checklist before build.';

  return {
    requires_custom_scope: complexity.requiresCustomScope,
    budget_required: complexity.requiresCustomScope,
    infrastructure_intake_required: complexity.requiresCustomScope,
    estimated_minimum_budget: complexity.estimatedMinimumBudget,
    estimated_monthly_infrastructure_cost: complexity.estimatedMonthlyInfrastructureCost,
    scalable_scope_options: scalableScopeOptions,
    feasible_mvp_scope: feasibleMvpScope,
    deferred_features: deferredFeatures,
    required_budget_to_include_deferred_features: complexity.estimatedMinimumBudget + Math.max(2000, deferredFeatures.length * 1000),
    infrastructure_gap_analysis: infrastructureGapAnalysis,
    recommended_next_step: recommendedNextStep
  };
}

function normalizeBrief(raw: Record<string, unknown>, prompt: string, platform: 'android', advancedIntake: NormalizedAdvancedIntake): GameBrief {
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
  const budgetScope = generateBudgetScope(prompt, advancedIntake);
  const infrastructureRequiredSoon = inferComingSoonInfrastructureRequirement(prompt, advancedIntake);

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
    blockersBeforePublish: toStringArray(raw.blockersBeforePublish).length ? toStringArray(raw.blockersBeforePublish) : inferred.blockersBeforePublish,
    google_play_required: toBool(raw.google_play_required) || toBool(raw.googlePlayRequired) || true,
    google_play_account_status:
      raw.google_play_account_status === 'unknown' ||
      raw.google_play_account_status === 'user_has_account' ||
      raw.google_play_account_status === 'user_needs_setup' ||
      raw.google_play_account_status === 'artifact_only'
        ? raw.google_play_account_status
        : raw.googlePlayAccountStatus === 'unknown' ||
            raw.googlePlayAccountStatus === 'user_has_account' ||
            raw.googlePlayAccountStatus === 'user_needs_setup' ||
            raw.googlePlayAccountStatus === 'artifact_only'
          ? raw.googlePlayAccountStatus
          : 'unknown',
    publishing_blockers: toStringArray(raw.publishing_blockers).length
      ? toStringArray(raw.publishing_blockers)
      : toStringArray(raw.blockersBeforePublish).length
        ? toStringArray(raw.blockersBeforePublish)
        : inferred.blockersBeforePublish,
    delivery_mode: normalizeDeliveryMode(raw.delivery_mode ?? raw.deliveryMode ?? advancedIntake.deliveryMode),
    requires_custom_scope: toBool(raw.requires_custom_scope) || budgetScope.requires_custom_scope,
    budget_required: toBool(raw.budget_required) || budgetScope.budget_required,
    infrastructure_intake_required: toBool(raw.infrastructure_intake_required) || budgetScope.infrastructure_intake_required,
    estimated_minimum_budget: clampInt(toNumber(raw.estimated_minimum_budget), budgetScope.estimated_minimum_budget),
    estimated_monthly_infrastructure_cost: clampInt(toNumber(raw.estimated_monthly_infrastructure_cost), budgetScope.estimated_monthly_infrastructure_cost),
    scalable_scope_options: Array.isArray(raw.scalable_scope_options) && raw.scalable_scope_options.length
      ? (raw.scalable_scope_options as Array<Record<string, unknown>>).map((option) => ({
          label: isNonEmptyString(option.label) ? option.label.trim() : 'Option',
          one_time_budget_usd: clampInt(toNumber(option.one_time_budget_usd)),
          monthly_infrastructure_budget_usd: clampInt(toNumber(option.monthly_infrastructure_budget_usd)),
          scope: toStringArray(option.scope)
        }))
      : budgetScope.scalable_scope_options,
    feasible_mvp_scope: toStringArray(raw.feasible_mvp_scope).length ? toStringArray(raw.feasible_mvp_scope) : budgetScope.feasible_mvp_scope,
    deferred_features: toStringArray(raw.deferred_features).length ? toStringArray(raw.deferred_features) : budgetScope.deferred_features,
    required_budget_to_include_deferred_features: clampInt(toNumber(raw.required_budget_to_include_deferred_features), budgetScope.required_budget_to_include_deferred_features),
    infrastructure_gap_analysis: toStringArray(raw.infrastructure_gap_analysis).length ? toStringArray(raw.infrastructure_gap_analysis) : budgetScope.infrastructure_gap_analysis,
    recommended_next_step: isNonEmptyString(raw.recommended_next_step) ? raw.recommended_next_step.trim() : budgetScope.recommended_next_step,
    ...(infrastructureRequiredSoon
      ? {
          infrastructure_required: true,
          feature_status: 'coming_soon' as const,
          warning: COMING_SOON_WARNING
        }
      : {})
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
  if (!Array.isArray(brief.feasible_mvp_scope)) return 'invalid_json';
  if (!Array.isArray(brief.deferred_features)) return 'invalid_json';
  if (!Array.isArray(brief.infrastructure_gap_analysis)) return 'invalid_json';
  if (!isNonEmptyString(brief.recommended_next_step)) return 'invalid_json';
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
  const advancedIntake = normalizeAdvancedIntake(requestBody.advancedProjectIntake, prompt);
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
                'title, slug, packageName, summary, gameType, targetPlatform, mechanics, visualStyle, controls, monetizationNotes, releaseNotes, storeShortDescription, storeFullDescription, complexityLevel, infrastructureRequired, infrastructureLevel, requiredInfrastructure, requiredUserAccounts, monetizationRequired, iapRequired, adsRequired, subscriptionsRequired, backendRequired, multiplayerRequired, publishingRequirements, blockersBeforeBuild, blockersBeforePublish, requires_custom_scope, budget_required, infrastructure_intake_required, estimated_minimum_budget, estimated_monthly_infrastructure_cost, scalable_scope_options, feasible_mvp_scope, deferred_features, required_budget_to_include_deferred_features, infrastructure_gap_analysis, recommended_next_step\n\n' +
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
    const normalized = normalizeBrief(JSON.parse(aiText) as Record<string, unknown>, prompt, targetPlatform, advancedIntake);
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

  await context.supabase.from('advanced_project_intakes').insert({
    workspace_id: context.workspaceId,
    user_id: context.userId,
    project_id: data.id,
    project_type: advancedIntake.projectType,
    desired_scope: advancedIntake.desiredScope,
    existing_infrastructure: advancedIntake.existingInfrastructure,
    budget_json: advancedIntake.budgetJson,
    target_scale_json: advancedIntake.targetScaleJson,
    required_features: advancedIntake.requiredFeatures,
    generated_scope: {
      scalable_scope_options: parsed.scalable_scope_options,
      feasible_mvp_scope: parsed.feasible_mvp_scope,
      deferred_features: parsed.deferred_features,
      required_budget_to_include_deferred_features: parsed.required_budget_to_include_deferred_features,
      infrastructure_gap_analysis: parsed.infrastructure_gap_analysis,
      recommended_next_step: parsed.recommended_next_step
    },
    status: 'draft'
  });

  return json({ ok: true, projectId: data.id, brief: parsed });
}
