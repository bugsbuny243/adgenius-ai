import { GoogleGenAI } from '@google/genai';

export type KoscheiModelAlias = 'koschei-fast' | 'koschei-deep' | 'koschei-research';

export type AgentRunProfile = {
  alias: KoscheiModelAlias;
  displayLabel: 'Koschei AI motoru';
  enableResearchMode: boolean;
  maxOutputTokens: number;
  thinkingBudget?: number;
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
  displayLabel: 'Koschei AI motoru',
  enableResearchMode: false,
  maxOutputTokens: 2_048,
  temperature: 0.8
};

const PROFILE_DEEP: AgentRunProfile = {
  alias: 'koschei-deep',
  displayLabel: 'Koschei AI motoru',
  enableResearchMode: false,
  maxOutputTokens: 4_096,
  thinkingBudget: 2_048,
  temperature: 0.35
};

const PROFILE_RESEARCH: AgentRunProfile = {
  alias: 'koschei-research',
  displayLabel: 'Koschei AI motoru',
  enableResearchMode: true,
  maxOutputTokens: 4_096,
  thinkingBudget: 1_536,
  temperature: 0.3
};

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

  return PROFILE_FAST;
}

function resolveServerModel(alias: KoscheiModelAlias): string {
  return alias === 'koschei-fast' ? 'gemini-2.5-flash' : 'gemini-2.5-pro';
}

function extractUsage(source: unknown): { inputTokens: number | null; outputTokens: number | null } {
  if (!source || typeof source !== 'object') {
    return { inputTokens: null, outputTokens: null };
  }

  const usage = source as Record<string, unknown>;
  return {
    inputTokens: typeof usage.promptTokenCount === 'number' ? usage.promptTokenCount : null,
    outputTokens: typeof usage.candidatesTokenCount === 'number' ? usage.candidatesTokenCount : null
  };
}

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

function buildConfig(profile: AgentRunProfile, systemPrompt: string | null): Record<string, unknown> {
  const config: Record<string, unknown> = {
    maxOutputTokens: profile.maxOutputTokens,
    temperature: profile.temperature
  };

  if (systemPrompt?.trim()) {
    config.systemInstruction = systemPrompt.trim();
  }

  if (profile.thinkingBudget) {
    config.thinkingConfig = {
      thinkingBudget: profile.thinkingBudget
    };
  }

  if (profile.enableResearchMode) {
    config.tools = [{ googleSearch: {} }];
  }

  return config;
}

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
}

export async function runTextWithAiEngine(options: RunTextOptions): Promise<AiRunResult> {
  return runInternal(options, false);
}

export async function runTextStreamWithAiEngine(options: RunTextOptions): Promise<AiRunResult> {
  return runInternal(options, true);
}
