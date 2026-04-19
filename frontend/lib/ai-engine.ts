import { GoogleGenAI } from '@google/genai';

export type KoscheiModelAlias = 'koschei-fast' | 'koschei-deep' | 'koschei-research';

export type AgentRunProfile = {
  alias: KoscheiModelAlias;
  displayLabel: string;
  enableResearchMode: boolean;
  maxOutputTokens: number;
};

type RunTextOptions = {
  apiKey: string;
  agentSlug: string;
  userInput: string;
  systemPrompt: string | null;
};

export type AiRunResult = {
  text: string;
  alias: KoscheiModelAlias;
  displayLabel: string;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
  };
};

const PROFILE_FAST: AgentRunProfile = {
  alias: 'koschei-fast',
  displayLabel: 'Hızlı mod',
  enableResearchMode: false,
  maxOutputTokens: 2_048
};

const PROFILE_DEEP: AgentRunProfile = {
  alias: 'koschei-deep',
  displayLabel: 'Derin analiz modu',
  enableResearchMode: false,
  maxOutputTokens: 4_096
};

const PROFILE_RESEARCH: AgentRunProfile = {
  alias: 'koschei-research',
  displayLabel: 'Araştırma destekli mod',
  enableResearchMode: true,
  maxOutputTokens: 4_096
};

function resolveModelAlias(agentSlug: string): AgentRunProfile {
  const normalized = agentSlug.trim().toLowerCase();

  if (normalized === 'arastirma') return PROFILE_RESEARCH;
  if (normalized === 'yazilim' || normalized === 'rapor') return PROFILE_DEEP;
  return PROFILE_FAST;
}

function resolveServerModel(alias: KoscheiModelAlias): string {
  if (alias === 'koschei-deep') return 'gemini-2.5-pro';
  if (alias === 'koschei-research') return 'gemini-2.5-pro';
  return 'gemini-2.5-flash';
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
    maxOutputTokens: profile.maxOutputTokens
  };

  if (systemPrompt && systemPrompt.trim()) {
    config.systemInstruction = systemPrompt;
  }

  if (profile.alias === 'koschei-deep') {
    config.thinkingConfig = {
      thinkingBudget: 2048
    };
  }

  if (profile.enableResearchMode) {
    config.tools = [{ googleSearch: {} }];
    config.thinkingConfig = {
      thinkingBudget: 1536
    };
  }

  return config;
}

export async function runTextWithAiEngine(options: RunTextOptions): Promise<AiRunResult> {
  const profile = resolveModelAlias(options.agentSlug);
  const model = resolveServerModel(profile.alias);

  const client = new GoogleGenAI({ apiKey: options.apiKey });
  const response = await client.models.generateContent({
    model,
    config: buildConfig(profile, options.systemPrompt),
    contents: options.userInput
  });

  const text = (response.text ?? '').trim();
  return {
    text,
    alias: profile.alias,
    displayLabel: profile.displayLabel,
    usage: extractUsage(response.usageMetadata)
  };
}

export async function runTextStreamWithAiEngine(options: RunTextOptions): Promise<AiRunResult> {
  const profile = resolveModelAlias(options.agentSlug);
  const model = resolveServerModel(profile.alias);

  const client = new GoogleGenAI({ apiKey: options.apiKey });
  const stream = await client.models.generateContentStream({
    model,
    config: buildConfig(profile, options.systemPrompt),
    contents: options.userInput
  });

  let text = '';
  let usage: { inputTokens: number | null; outputTokens: number | null } = { inputTokens: null, outputTokens: null };

  for await (const chunk of stream) {
    text += chunk.text ?? '';
    usage = extractUsage(chunk.usageMetadata);
  }

  return {
    text: text.trim(),
    alias: profile.alias,
    displayLabel: profile.displayLabel,
    usage
  };
}
