export type KoscheiModelAlias = 'koschei-fast' | 'koschei-deep' | 'koschei-research';

type ReasoningEffort = NonNullable<AgentRunProfile['reasoningEffort']>;

export type AgentRunProfile = {
  alias: KoscheiModelAlias;
  displayLabel: 'Hızlı mod' | 'Derin analiz modu' | 'Araştırma destekli mod';
  model: string;
  enableResearchMode: boolean;
  maxOutputTokens: number;
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  temperature: number;
};

type RunTextOptions = {
  agentSlug: string;
  agentMode?: string | null;
  userInput: string;
  systemPrompt: string | null;
};

type ChatMessage = { role: 'system' | 'user'; content: string };
type ChatCompletionParams = {
  model: string;
  temperature: number;
  response_format: { type: 'json_object' };
  messages: ChatMessage[];
};

export type GameBrief = {
  target_engine: 'Unity' | 'Godot';
  target_platforms: Array<'Android' | 'WebGL' | 'StandaloneWindows64'>;
  gameplay_goals: string;
  visual_style: string;
  controls: string;
  mechanics: Record<string, number | string | boolean>;
  store_short_description: string;
  store_full_description: string;
};

export type AiRunResult = {
  text: string;
  alias: KoscheiModelAlias;
  displayLabel: AgentRunProfile['displayLabel'];
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
  };
};

const DEFAULT_MODEL = 'meta-llama/Meta-Llama-3.1-70B-Instruct';
const HUGGING_FACE_BASE_URL = 'https://api-inference.huggingface.co/v1/';

const GAME_DESIGNER_SYSTEM_PROMPT = [
  'Sen kıdemli bir Unity Oyun Sistem Mimarısın (Multi-Platform).',
  'Kullanıcıdan gelen tek cümlelik oyun fikrini analiz et ve SADECE geçerli bir JSON nesnesi döndür.',
  'JSON anahtarları birebir şu şekilde olmalı: target_engine, target_platforms, gameplay_goals, visual_style, controls, mechanics, store_short_description, store_full_description.',
  'target_engine her zaman Unity olmalı. Başka motor seçme.',
  'target_platforms bir dizi olmalı ve sadece Android, WebGL, StandaloneWindows64 değerlerinden en az birini içermeli.',
  'mechanics alanı seçilen oyun motorunda kolayca uygulanabilecek teknik değerler taşımalı (ör. player_speed, gravity_scale, enemy_spawn_interval_seconds).',
  'store_short_description kısa ve ASO odaklı olmalı, store_full_description daha detaylı ASO uyumlu bir metin olmalı.',
  'JSON dışı hiçbir metin, markdown veya kod bloğu yazma.'
].join(' ');

type OpenAIClient = {
  chat: {
    completions: {
      create: (params: ChatCompletionParams) => Promise<{ choices: Array<{ message?: { content?: string | null } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }>;
    };
  };
};

let cachedClient: OpenAIClient | null = null;

async function getHuggingFaceClient(): Promise<OpenAIClient> {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.HF_TOKEN?.trim();
  if (!apiKey) throw new Error('missing_hf_token');

  const baseURL = HUGGING_FACE_BASE_URL;
  const req = (globalThis as { __non_webpack_require__?: (id: string) => unknown }).__non_webpack_require__
    || (Function('return require')() as (id: string) => unknown);
  const mod = req('openai') as { default?: new (options: { apiKey: string; baseURL: string }) => OpenAIClient };
  const OpenAICtor = mod?.default;
  if (!OpenAICtor) throw new Error('missing_openai_sdk');

  cachedClient = new OpenAICtor({ apiKey, baseURL });
  return cachedClient;
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first < 0 || last < first) {
    throw new Error('invalid_hf_response');
  }
  return trimmed.slice(first, last + 1);
}

function parseGameBrief(raw: string): GameBrief {
  const parsed = JSON.parse(extractJsonObject(raw)) as Partial<GameBrief>;
  const allowedEngines = new Set<GameBrief['target_engine']>(['Unity']);
  const allowedPlatforms = new Set<GameBrief['target_platforms'][number]>(['Android', 'WebGL', 'StandaloneWindows64']);
  const targetPlatforms = Array.isArray(parsed.target_platforms)
    ? parsed.target_platforms.filter((platform): platform is GameBrief['target_platforms'][number] => (
      typeof platform === 'string' && allowedPlatforms.has(platform as GameBrief['target_platforms'][number])
    ))
    : [];

  if (!parsed
    || typeof parsed.target_engine !== 'string'
    || !allowedEngines.has(parsed.target_engine as GameBrief['target_engine'])
    || targetPlatforms.length === 0
    || typeof parsed.gameplay_goals !== 'string'
    || typeof parsed.visual_style !== 'string'
    || typeof parsed.controls !== 'string'
    || typeof parsed.store_short_description !== 'string'
    || typeof parsed.store_full_description !== 'string'
    || typeof parsed.mechanics !== 'object'
    || parsed.mechanics === null
    || Array.isArray(parsed.mechanics)) {
    throw new Error('invalid_game_brief_shape');
  }

  return {
    target_engine: parsed.target_engine,
    target_platforms: [...new Set(targetPlatforms)],
    gameplay_goals: parsed.gameplay_goals.trim(),
    visual_style: parsed.visual_style.trim(),
    controls: parsed.controls.trim(),
    mechanics: parsed.mechanics,
    store_short_description: parsed.store_short_description.trim(),
    store_full_description: parsed.store_full_description.trim()
  };
}

export async function generateGameBriefWithAi(prompt: string): Promise<GameBrief> {
  const userPrompt = prompt.trim();
  if (!userPrompt) throw new Error('prompt_required');

  const model = process.env.KOSCHEI_MODEL?.trim() || DEFAULT_MODEL;
  const client = await getHuggingFaceClient();
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: GAME_DESIGNER_SYSTEM_PROMPT },
      { role: 'user', content: `Kullanıcı oyun fikri: ${userPrompt}` }
    ]
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('empty_hf_response');

  return parseGameBrief(content);
}

const PROFILE_FAST: AgentRunProfile = {
  alias: 'koschei-fast',
  displayLabel: 'Hızlı mod',
  model: process.env.KOSCHEI_MODEL_FAST?.trim() || process.env.KOSCHEI_MODEL?.trim() || DEFAULT_MODEL,
  enableResearchMode: false,
  maxOutputTokens: 2_048,
  temperature: 0.8
};

function resolveReasoningEffort(): ReasoningEffort {
  const configured = process.env.KOSCHEI_REASONING_EFFORT?.trim().toLowerCase();
  if (configured === 'minimal' || configured === 'low' || configured === 'medium' || configured === 'high') {
    return configured;
  }
  return 'medium';
}

const PROFILE_DEEP: AgentRunProfile = {
  alias: 'koschei-deep',
  displayLabel: 'Derin analiz modu',
  model: process.env.KOSCHEI_MODEL_REASONING?.trim() || process.env.KOSCHEI_MODEL?.trim() || DEFAULT_MODEL,
  enableResearchMode: false,
  maxOutputTokens: 4_096,
  reasoningEffort: resolveReasoningEffort(),
  temperature: 0.35
};

const PROFILE_RESEARCH: AgentRunProfile = {
  alias: 'koschei-research',
  displayLabel: 'Araştırma destekli mod',
  model: process.env.KOSCHEI_MODEL_REASONING?.trim() || process.env.KOSCHEI_MODEL?.trim() || DEFAULT_MODEL,
  enableResearchMode: true,
  maxOutputTokens: 4_096,
  reasoningEffort: resolveReasoningEffort(),
  temperature: 0.3
};

const NANO_MODES = new Set(['classification', 'route', 'router', 'triage']);
const DEEP_AGENT_SLUGS = new Set(['yazilim', 'rapor']);
const RESEARCH_AGENT_SLUGS = new Set(['arastirma']);
const RESEARCH_MODES = new Set(['research', 'trend', 'benchmark']);
const DEEP_MODES = new Set(['orchestrator', 'script', 'title-hook', 'seo', 'qa-safety', 'analysis']);

function resolveRunProfile(agentSlug: string, agentMode?: string | null): AgentRunProfile {
  const normalizedSlug = agentSlug.trim().toLowerCase();
  const normalizedMode = typeof agentMode === 'string' ? agentMode.trim().toLowerCase() : '';
  if (RESEARCH_AGENT_SLUGS.has(normalizedSlug) || RESEARCH_MODES.has(normalizedMode)) return PROFILE_RESEARCH;
  if (DEEP_AGENT_SLUGS.has(normalizedSlug) || DEEP_MODES.has(normalizedMode)) return PROFILE_DEEP;
  if (NANO_MODES.has(normalizedMode)) {
    return {
      ...PROFILE_FAST,
      model: process.env.KOSCHEI_MODEL_LIGHT?.trim() || process.env.KOSCHEI_MODEL?.trim() || DEFAULT_MODEL,
      maxOutputTokens: 800,
      temperature: 0.2
    };
  }
  return PROFILE_FAST;
}

function takeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function extractUsage(response: unknown): { inputTokens: number | null; outputTokens: number | null } {
  if (!response || typeof response !== 'object') return { inputTokens: null, outputTokens: null };
  const usage = (response as { usage?: { prompt_tokens?: number; completion_tokens?: number } }).usage;
  return {
    inputTokens: typeof usage?.prompt_tokens === 'number' ? usage.prompt_tokens : null,
    outputTokens: typeof usage?.completion_tokens === 'number' ? usage.completion_tokens : null
  };
}

async function runInternal(options: RunTextOptions): Promise<AiRunResult> {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase() || 'huggingface';
  if (provider !== 'huggingface' && provider !== 'openai-compatible') throw new Error('unsupported_provider');
  const profile = resolveRunProfile(options.agentSlug, options.agentMode);
  const client = await getHuggingFaceClient();

  const systemContent = options.systemPrompt?.trim() || 'Respond with valid JSON only. JSON output required.';
  const response = await client.chat.completions.create({
    model: profile.model,
    temperature: profile.temperature,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemContent.includes('JSON') ? systemContent : `${systemContent} Respond using valid JSON only.` },
      { role: 'user', content: options.userInput }
    ]
  });

  return {
    text: takeText(response.choices[0]?.message?.content),
    alias: profile.alias,
    displayLabel: profile.displayLabel,
    usage: extractUsage(response)
  };
}

export async function runTextWithAiEngine(options: RunTextOptions): Promise<AiRunResult> { return runInternal(options); }
export async function runTextStreamWithAiEngine(options: RunTextOptions): Promise<AiRunResult> { return runInternal(options); }

export async function generateGameBriefWithGroq(prompt: string): Promise<GameBrief> {
  return generateGameBriefWithAi(prompt);
}
