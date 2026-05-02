import OpenAI from 'openai';
import { getServerEnv } from '@/lib/env';

export type KoscheiModelAlias = 'koschei-fast' | 'koschei-deep' | 'koschei-research';

type OpenAiModelName = string;
type ReasoningEffort = NonNullable<AgentRunProfile['reasoningEffort']>;

export type AgentRunProfile = {
  alias: KoscheiModelAlias;
  displayLabel: 'Hızlı mod' | 'Derin analiz modu' | 'Araştırma destekli mod';
  model: OpenAiModelName;
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

export type GameBrief = {
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

const GAME_DESIGNER_SYSTEM_PROMPT = [
  'Sen kıdemli bir oyun tasarımcısı (Game Designer) ve Unity uzmanısın.',
  'Kullanıcıdan gelen tek cümlelik oyun fikrini analiz et ve SADECE geçerli bir JSON nesnesi döndür.',
  'JSON anahtarları birebir şu şekilde olmalı: gameplay_goals, visual_style, controls, mechanics, store_short_description, store_full_description.',
  'mechanics alanı Unity içerisinde kolayca kullanılabilecek teknik değerler taşımalı (ör. player_speed, gravity_scale, enemy_spawn_interval_seconds).',
  'store_short_description kısa ve ASO odaklı olmalı, store_full_description daha detaylı ASO uyumlu bir metin olmalı.',
  'JSON dışı hiçbir metin, markdown veya kod bloğu yazma.'
].join(' ');

type GroqClient = {
  chat: {
    completions: {
      create: (params: {
        model: string;
        temperature: number;
        response_format: { type: 'json_object' };
        messages: Array<{ role: 'system' | 'user'; content: string }>;
      }) => Promise<{ choices: Array<{ message?: { content?: string | null } }> }>;
    };
  };
};

let cachedGroqClient: GroqClient | null = null;

async function getGroqClient(): Promise<GroqClient> {
  if (cachedGroqClient) return cachedGroqClient;
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('missing_groq_key');
  }

  const req = (globalThis as { __non_webpack_require__?: (id: string) => unknown }).__non_webpack_require__
    || (Function('return require')() as (id: string) => unknown);
  const mod = req('groq-sdk') as { default?: new (options: { apiKey: string }) => GroqClient };
  const GroqCtor = mod?.default;
  if (!GroqCtor) {
    throw new Error('missing_groq_sdk');
  }

  cachedGroqClient = new GroqCtor({ apiKey });
  return cachedGroqClient;
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first < 0 || last < first) {
    throw new Error('invalid_groq_response');
  }
  return trimmed.slice(first, last + 1);
}

function parseGameBrief(raw: string): GameBrief {
  const parsed = JSON.parse(extractJsonObject(raw)) as Partial<GameBrief>;
  if (
    !parsed ||
    typeof parsed.gameplay_goals !== 'string' ||
    typeof parsed.visual_style !== 'string' ||
    typeof parsed.controls !== 'string' ||
    typeof parsed.store_short_description !== 'string' ||
    typeof parsed.store_full_description !== 'string' ||
    typeof parsed.mechanics !== 'object' ||
    parsed.mechanics === null ||
    Array.isArray(parsed.mechanics)
  ) {
    throw new Error('invalid_game_brief_shape');
  }

  return {
    gameplay_goals: parsed.gameplay_goals.trim(),
    visual_style: parsed.visual_style.trim(),
    controls: parsed.controls.trim(),
    mechanics: parsed.mechanics,
    store_short_description: parsed.store_short_description.trim(),
    store_full_description: parsed.store_full_description.trim()
  };
}

export async function generateGameBriefWithGroq(prompt: string): Promise<GameBrief> {
  const userPrompt = prompt.trim();
  if (!userPrompt) {
    throw new Error('prompt_required');
  }

  const model = process.env.GROQ_MODEL?.trim();
  if (!model) {
    throw new Error('missing_groq_model');
  }

  const groq = await getGroqClient();
  const completion = await groq.chat.completions.create({
    model,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: GAME_DESIGNER_SYSTEM_PROMPT },
      { role: 'user', content: `Kullanıcı oyun fikri: ${userPrompt}` }
    ]
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('empty_groq_response');
  }

  return parseGameBrief(content);
}

const PROFILE_FAST: AgentRunProfile = {
  alias: 'koschei-fast',
  displayLabel: 'Hızlı mod',
  model: process.env.OPENAI_MODEL_FAST?.trim() || 'gpt-5-mini',
  enableResearchMode: false,
  maxOutputTokens: 2_048,
  temperature: 0.8
};
// ... existing OpenAI engine kept as-is below
function resolveReasoningEffort(): ReasoningEffort {
  const configured = process.env.OPENAI_REASONING_EFFORT?.trim().toLowerCase();
  if (configured === 'minimal' || configured === 'low' || configured === 'medium' || configured === 'high') {
    return configured;
  }
  return 'medium';
}
const PROFILE_DEEP: AgentRunProfile = {
  alias: 'koschei-deep',
  displayLabel: 'Derin analiz modu',
  model: process.env.OPENAI_MODEL_REASONING?.trim() || process.env.OPENAI_MODEL_PRIMARY?.trim() || 'gpt-5.2',
  enableResearchMode: false,
  maxOutputTokens: 4_096,
  reasoningEffort: resolveReasoningEffort(),
  temperature: 0.35
};
const PROFILE_RESEARCH: AgentRunProfile = {
  alias: 'koschei-research',
  displayLabel: 'Araştırma destekli mod',
  model: process.env.OPENAI_MODEL_REASONING?.trim() || process.env.OPENAI_MODEL_PRIMARY?.trim() || 'gpt-5.2',
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
function resolveRunProfile(agentSlug: string, agentMode?: string | null): AgentRunProfile { const normalizedSlug = agentSlug.trim().toLowerCase(); const normalizedMode = typeof agentMode === 'string' ? agentMode.trim().toLowerCase() : ''; if (RESEARCH_AGENT_SLUGS.has(normalizedSlug) || RESEARCH_MODES.has(normalizedMode)) return PROFILE_RESEARCH; if (DEEP_AGENT_SLUGS.has(normalizedSlug) || DEEP_MODES.has(normalizedMode)) return PROFILE_DEEP; if (NANO_MODES.has(normalizedMode)) return { ...PROFILE_FAST, model: process.env.OPENAI_MODEL_LIGHT?.trim() || 'gpt-5-nano', maxOutputTokens: 800, temperature: 0.2 }; return PROFILE_FAST; }
function takeText(value: unknown): string { if (typeof value !== 'string') return ''; return value.trim(); }
function extractOutputText(response: unknown): string { if (!response || typeof response !== 'object') return ''; const source = response as { output_text?: string; output?: Array<{ type?: string; text?: string; name?: string; content?: Array<{ type?: string; text?: string }>; }>; content?: Array<{ type?: string; text?: string }>; }; const fromOutputText = takeText(source.output_text); if (fromOutputText) return fromOutputText; if (Array.isArray(source.content)) { const contentText = source.content.map((part) => (part.type === 'output_text' || part.type === 'text' ? takeText(part.text) : '')).filter(Boolean).join('\n').trim(); if (contentText) return contentText; } if (!Array.isArray(source.output)) return ''; const fragments: string[] = []; for (const item of source.output) { if (item.type === 'message' && Array.isArray(item.content)) { for (const part of item.content) { if (part.type === 'output_text' || part.type === 'text') { const text = takeText(part.text); if (text) fragments.push(text); } } continue; } if (item.type === 'output_text' || item.type === 'text') { const text = takeText(item.text); if (text) fragments.push(text); } } return fragments.join('\n').trim(); }
function extractUsage(response: unknown): { inputTokens: number | null; outputTokens: number | null } { if (!response || typeof response !== 'object') return { inputTokens: null, outputTokens: null }; const usage = (response as { usage?: { input_tokens?: number; output_tokens?: number } }).usage; return { inputTokens: typeof usage?.input_tokens === 'number' ? usage.input_tokens : null, outputTokens: typeof usage?.output_tokens === 'number' ? usage.output_tokens : null }; }
let cachedClient: OpenAI | null = null; function getOpenAiClient(): OpenAI { if (cachedClient) return cachedClient; const { OPENAI_API_KEY: apiKey } = getServerEnv(); if (!apiKey) throw new Error('missing_openai_key'); cachedClient = new OpenAI({ apiKey }); return cachedClient; }
async function runInternal(options: RunTextOptions): Promise<AiRunResult> { const provider = process.env.AI_PROVIDER?.trim().toLowerCase() || 'openai'; if (provider !== 'openai') throw new Error('unsupported_provider'); const profile = resolveRunProfile(options.agentSlug, options.agentMode); const client = getOpenAiClient(); const response = await client.responses.create({ model: profile.model, input: options.userInput, instructions: options.systemPrompt?.trim() || undefined, max_output_tokens: profile.maxOutputTokens, temperature: profile.temperature, reasoning: profile.reasoningEffort ? { effort: profile.reasoningEffort } : undefined, tools: profile.enableResearchMode ? [{ type: 'web_search_preview' }] : undefined }); return { text: extractOutputText(response), alias: profile.alias, displayLabel: profile.displayLabel, usage: extractUsage(response) }; }
export async function runTextWithAiEngine(options: RunTextOptions): Promise<AiRunResult> { return runInternal(options); }
export async function runTextStreamWithAiEngine(options: RunTextOptions): Promise<AiRunResult> { return runInternal(options); }
