import OpenAI from 'openai';

export type KoscheiModelAlias = 'koschei-fast' | 'koschei-deep' | 'koschei-research';

type OpenAiModelName = 'gpt-5-mini' | 'gpt-5.1' | 'gpt-5-nano';

export type AgentRunProfile = {
  alias: KoscheiModelAlias;
<<<<<<< codex/simplify-and-recover-koschei-application
  displayLabel: 'Koschei AI motoru';
=======
  displayLabel: 'Hızlı mod' | 'Derin analiz modu' | 'Araştırma destekli mod';
  model: OpenAiModelName;
>>>>>>> main
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
<<<<<<< codex/simplify-and-recover-koschei-application
  displayLabel: 'Koschei AI motoru',
=======
  displayLabel: 'Hızlı mod',
  model: 'gpt-5-mini',
>>>>>>> main
  enableResearchMode: false,
  maxOutputTokens: 2_048,
  temperature: 0.8
};

const PROFILE_DEEP: AgentRunProfile = {
  alias: 'koschei-deep',
<<<<<<< codex/simplify-and-recover-koschei-application
  displayLabel: 'Koschei AI motoru',
=======
  displayLabel: 'Derin analiz modu',
  model: 'gpt-5.1',
>>>>>>> main
  enableResearchMode: false,
  maxOutputTokens: 4_096,
  reasoningEffort: 'medium',
  temperature: 0.35
};

const PROFILE_RESEARCH: AgentRunProfile = {
  alias: 'koschei-research',
<<<<<<< codex/simplify-and-recover-koschei-application
  displayLabel: 'Koschei AI motoru',
=======
  displayLabel: 'Araştırma destekli mod',
  model: 'gpt-5.1',
>>>>>>> main
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

<<<<<<< codex/simplify-and-recover-koschei-application
function collectTextParts(parts: unknown): string {
  if (!Array.isArray(parts)) return '';

  return parts
    .map((part) => {
      if (!part || typeof part !== 'object') return '';
      const entry = part as Record<string, unknown>;
      if (typeof entry.text === 'string') return entry.text;
      if (typeof entry.inlineData === 'string') return entry.inlineData;
      return '';
    })
    .join('')
    .trim();
}

function extractTextFromResponse(source: unknown): string {
  if (!source || typeof source !== 'object') return '';

  const response = source as Record<string, unknown>;

  if (typeof response.text === 'string' && response.text.trim()) {
    return response.text.trim();
  }

  const candidates = Array.isArray(response.candidates) ? response.candidates : [];
  const candidateText = candidates
    .map((candidate) => {
      if (!candidate || typeof candidate !== 'object') return '';
      const content = (candidate as { content?: { parts?: unknown } }).content;
      return collectTextParts(content?.parts);
    })
    .join('\n')
    .trim();

  if (candidateText) {
    return candidateText;
  }

  const output = collectTextParts(response.output);
  if (output) {
    return output;
  }

  return '';
}

function normalizeProviderError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? 'run_failed');
  const normalized = raw.toLowerCase();

  if (
    normalized.includes('429') ||
    normalized.includes('resource_exhausted') ||
    normalized.includes('quota') ||
    normalized.includes('billing') ||
    normalized.includes('depleted credits')
  ) {
    return 'provider_quota_exceeded';
  }

  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'provider_rate_limited';
  }

  return 'provider_error';
}
=======
function extractOutputText(response: unknown): string {
  if (!response || typeof response !== 'object') return '';
>>>>>>> main

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

<<<<<<< codex/simplify-and-recover-koschei-application
async function runInternal(options: RunTextOptions, stream: boolean): Promise<AiRunResult> {
  const profile = resolveRunProfile(options.agentSlug, options.agentMode);
  const model = resolveServerModel(profile.alias);
  const client = new GoogleGenAI({ apiKey: options.apiKey });

  try {
    if (!stream) {
      const response = await client.models.generateContent({
        model,
        config: buildConfig(profile, options.systemPrompt),
        contents: options.userInput
      });

      return {
        text: extractTextFromResponse(response),
        alias: profile.alias,
        displayLabel: profile.displayLabel,
        usage: extractUsage(response.usageMetadata)
      };
    }

    const responseStream = await client.models.generateContentStream({
      model,
      config: buildConfig(profile, options.systemPrompt),
      contents: options.userInput
    });

    let text = '';
    let usage: { inputTokens: number | null; outputTokens: number | null } = { inputTokens: null, outputTokens: null };

    for await (const chunk of responseStream) {
      const chunkText = extractTextFromResponse(chunk);
      if (chunkText) {
        text += chunkText;
      }
      const usageChunk = extractUsage((chunk as { usageMetadata?: unknown }).usageMetadata);
      usage = {
        inputTokens: usageChunk.inputTokens ?? usage.inputTokens,
        outputTokens: usageChunk.outputTokens ?? usage.outputTokens
      };
    }

    return {
      text: text.trim(),
      alias: profile.alias,
      displayLabel: profile.displayLabel,
      usage
    };
  } catch (error) {
    throw new Error(normalizeProviderError(error));
  }
=======
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
>>>>>>> main
}

export async function runTextWithAiEngine(options: RunTextOptions): Promise<AiRunResult> {
  return runInternal(options);
}

export async function runTextStreamWithAiEngine(options: RunTextOptions): Promise<AiRunResult> {
  return runInternal(options);
}
