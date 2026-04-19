import { GoogleGenAI } from '@google/genai';

export type KoscheiModelAlias =
  | 'koschei-fast'
  | 'koschei-deep'
  | 'koschei-research'
  | 'koschei-orchestrator'
  | 'koschei-script'
  | 'koschei-title-hook'
  | 'koschei-seo'
  | 'koschei-thumbnail'
  | 'koschei-qa-safety';

export type AgentRunProfile = {
  alias: KoscheiModelAlias;
  displayLabel: string;
  enableResearchMode: boolean;
  maxOutputTokens: number;
  thinkingBudget?: number;
  instructionSuffix?: string;
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
  maxOutputTokens: 4_096,
  thinkingBudget: 1536
};

const PROFILE_ORCHESTRATOR: AgentRunProfile = {
  alias: 'koschei-orchestrator',
  displayLabel: 'Koschei Orchestrator',
  enableResearchMode: true,
  maxOutputTokens: 8_192,
  thinkingBudget: 3072,
  instructionSuffix:
    'Araştırma, script, başlık-hook, SEO, thumbnail ve QA/safety çıktısını ayrı başlıklarla tek yanıtta üret.'
};

const PROFILE_SCRIPT: AgentRunProfile = {
  alias: 'koschei-script',
  displayLabel: 'Koschei Script Agent',
  enableResearchMode: false,
  maxOutputTokens: 6_144,
  thinkingBudget: 2304,
  instructionSuffix: 'Yanıtı kısa intro, ana akış blokları ve kapanış CTA şeklinde video script formatında üret.'
};

const PROFILE_TITLE_HOOK: AgentRunProfile = {
  alias: 'koschei-title-hook',
  displayLabel: 'Koschei Title & Hook Agent',
  enableResearchMode: true,
  maxOutputTokens: 2_048,
  thinkingBudget: 1024,
  instructionSuffix: 'Yanıtı yalnızca başlık ve ilk 10 saniye hook alternatifleri olarak ver.'
};

const PROFILE_SEO: AgentRunProfile = {
  alias: 'koschei-seo',
  displayLabel: 'Koschei SEO Agent',
  enableResearchMode: true,
  maxOutputTokens: 2_560,
  thinkingBudget: 1280,
  instructionSuffix: 'Yanıtı YouTube açıklama metni, etiket önerileri ve chapter planı olarak üret.'
};

const PROFILE_THUMBNAIL: AgentRunProfile = {
  alias: 'koschei-thumbnail',
  displayLabel: 'Koschei Thumbnail Agent',
  enableResearchMode: false,
  maxOutputTokens: 1_536,
  thinkingBudget: 768,
  instructionSuffix: 'Yanıtı thumbnail konsepti, sahne, metin ve renk varyantlarıyla ver.'
};

const PROFILE_QA_SAFETY: AgentRunProfile = {
  alias: 'koschei-qa-safety',
  displayLabel: 'Koschei QA/Safety Agent',
  enableResearchMode: false,
  maxOutputTokens: 2_048,
  thinkingBudget: 1024,
  instructionSuffix: 'Yanıtı kalite kontrol listesi, riskler ve düzeltme önerileri formatında ver.'
};

function resolveModelAlias(agentSlug: string, agentMode?: string | null): AgentRunProfile {
  const normalized = agentSlug.trim().toLowerCase();
  const mode = typeof agentMode === 'string' ? agentMode.trim().toLowerCase() : '';

  if (mode === 'orchestrator') return PROFILE_ORCHESTRATOR;
  if (mode === 'research') return PROFILE_RESEARCH;
  if (mode === 'script') return PROFILE_SCRIPT;
  if (mode === 'title-hook') return PROFILE_TITLE_HOOK;
  if (mode === 'seo') return PROFILE_SEO;
  if (mode === 'thumbnail') return PROFILE_THUMBNAIL;
  if (mode === 'qa-safety') return PROFILE_QA_SAFETY;

  if (normalized === 'arastirma') return PROFILE_RESEARCH;
  if (normalized === 'yazilim' || normalized === 'rapor') return PROFILE_DEEP;
  return PROFILE_FAST;
}

function resolveServerModel(alias: KoscheiModelAlias): string {
  if (
    alias === 'koschei-deep' ||
    alias === 'koschei-research' ||
    alias === 'koschei-orchestrator' ||
    alias === 'koschei-script' ||
    alias === 'koschei-title-hook' ||
    alias === 'koschei-seo' ||
    alias === 'koschei-thumbnail' ||
    alias === 'koschei-qa-safety'
  ) {
    return 'gemini-2.5-pro';
  }
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

  const composedPrompt = [systemPrompt?.trim(), profile.instructionSuffix?.trim()].filter(Boolean).join('\n\n');
  if (composedPrompt) {
    config.systemInstruction = composedPrompt;
  }

  if (profile.alias === 'koschei-deep' || profile.thinkingBudget) {
    config.thinkingConfig = {
      thinkingBudget: profile.thinkingBudget ?? 2048
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
  const profile = resolveModelAlias(options.agentSlug, options.agentMode);
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
  const profile = resolveModelAlias(options.agentSlug, options.agentMode);
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
