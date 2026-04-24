import OpenAI from 'openai';

export type KoscheiModelAlias = 'koschei-fast' | 'koschei-deep' | 'koschei-research';

type OpenAiModelName = 'gpt-5-mini' | 'gpt-5.1' | 'gpt-5-nano';

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
  apiKey: string;
  agentSlug: string;
  agentMode?: string | null;
  userInput: string;
  systemPrompt: string | null;
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

const PROFILE_FAST: AgentRunProfile = {
  alias: 'koschei-fast',
  displayLabel: 'Hızlı mod',
  model: 'gpt-5-mini',
  enableResearchMode: false,
  maxOutputTokens: 2_048,
  temperature: 0.8
};

const PROFILE_DEEP: AgentRunProfile = {
  alias: 'koschei-deep',
  displayLabel: 'Derin analiz modu',
  model: 'gpt-5.1',
  enableResearchMode: false,
  maxOutputTokens: 4_096,
  reasoningEffort: 'medium',
  temperature: 0.35
};

const PROFILE_RESEARCH: AgentRunProfile = {
  alias: 'koschei-research',
  displayLabel: 'Araştırma destekli mod',
  model: 'gpt-5.1',
  enableResearchMode: true,
  maxOutputTokens: 4_096,
  reasoningEffort: 'high',
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

  if (RESEARCH_AGENT_SLUGS.has(normalizedSlug) || RESEARCH_MODES.has(normalizedMode)) {
    return PROFILE_RESEARCH;
  }

  if (DEEP_AGENT_SLUGS.has(normalizedSlug) || DEEP_MODES.has(normalizedMode)) {
    return PROFILE_DEEP;
  }

  if (NANO_MODES.has(normalizedMode)) {
    return {
      ...PROFILE_FAST,
      model: 'gpt-5-nano',
      maxOutputTokens: 800,
      temperature: 0.2
    };
  }

  return PROFILE_FAST;
}

function extractOutputText(response: unknown): string {
  if (!response || typeof response !== 'object') return '';

  const source = response as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  if (typeof source.output_text === 'string' && source.output_text.trim()) {
    return source.output_text.trim();
  }

  if (!Array.isArray(source.output)) {
    return '';
  }

  return source.output
    .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
    .map((part) => (part.type === 'output_text' || part.type === 'text' ? part.text ?? '' : ''))
    .join('')
    .trim();
}

function extractUsage(response: unknown): { inputTokens: number | null; outputTokens: number | null } {
  if (!response || typeof response !== 'object') {
    return { inputTokens: null, outputTokens: null };
  }

  const usage = (response as { usage?: { input_tokens?: number; output_tokens?: number } }).usage;
  return {
    inputTokens: typeof usage?.input_tokens === 'number' ? usage.input_tokens : null,
    outputTokens: typeof usage?.output_tokens === 'number' ? usage.output_tokens : null
  };
}

function createOpenAiClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}

async function runInternal(options: RunTextOptions): Promise<AiRunResult> {
  const profile = resolveRunProfile(options.agentSlug, options.agentMode);
  const client = createOpenAiClient(options.apiKey);

  const response = await client.responses.create({
    model: profile.model,
    input: options.userInput,
    instructions: options.systemPrompt?.trim() || undefined,
    max_output_tokens: profile.maxOutputTokens,
    temperature: profile.temperature,
    reasoning: profile.reasoningEffort ? { effort: profile.reasoningEffort } : undefined,
    tools: profile.enableResearchMode ? [{ type: 'web_search_preview' }] : undefined
  });

  return {
    text: extractOutputText(response),
    alias: profile.alias,
    displayLabel: profile.displayLabel,
    usage: extractUsage(response)
  };
}

export async function runTextWithAiEngine(options: RunTextOptions): Promise<AiRunResult> {
  return runInternal(options);
}

export async function runTextStreamWithAiEngine(options: RunTextOptions): Promise<AiRunResult> {
  return runInternal(options);
}
