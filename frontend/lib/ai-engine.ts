import { GoogleGenAI } from '@google/genai';

export type KoscheiModelAlias = 'koschei-fast' | 'koschei-deep' | 'koschei-research';

export type AgentRunProfile = {
  alias: KoscheiModelAlias;
  displayLabel: 'Hızlı mod' | 'Derin analiz modu' | 'Araştırma destekli mod';
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
  displayLabel: 'Hızlı mod',
  enableResearchMode: false,
  maxOutputTokens: 2_048,
  temperature: 0.8
};

const PROFILE_DEEP: AgentRunProfile = {
  alias: 'koschei-deep',
  displayLabel: 'Derin analiz modu',
  enableResearchMode: false,
  maxOutputTokens: 4_096,
  thinkingBudget: 2_048,
  temperature: 0.35
};

const PROFILE_RESEARCH: AgentRunProfile = {
  alias: 'koschei-research',
  displayLabel: 'Araştırma destekli mod',
  enableResearchMode: true,
  maxOutputTokens: 4_096,
  thinkingBudget: 1_536,
  temperature: 0.3
};

const DEEP_AGENT_SLUGS = new Set(['yazilim', 'rapor']);
const RESEARCH_AGENT_SLUGS = new Set(['arastirma']);
const RESEARCH_MODES = new Set(['research']);
const DEEP_MODES = new Set(['orchestrator', 'script', 'title-hook', 'seo', 'qa-safety']);

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

  if (!stream) {
    const response = await client.models.generateContent({
      model,
      config: buildConfig(profile, options.systemPrompt),
      contents: options.userInput
    });

    return {
      text: (response.text ?? '').trim(),
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
    text += chunk.text ?? '';
    const usageChunk = extractUsage(chunk.usageMetadata);
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
}

export async function runTextWithAiEngine(options: RunTextOptions): Promise<AiRunResult> {
  return runInternal(options, false);
}

export async function runTextStreamWithAiEngine(options: RunTextOptions): Promise<AiRunResult> {
  return runInternal(options, true);
}
