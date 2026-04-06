import 'server-only';

import { GoogleGenAI } from '@google/genai';

const DEFAULT_MODEL_LABEL = 'ai-standard';
const PROVIDER_MODEL = 'gemini-2.5-flash';

const MODEL_ALIAS_MAP: Record<string, string> = {
  'ai-standard': PROVIDER_MODEL,
  'koschei-text-v1': PROVIDER_MODEL,
};

type UsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
};

export type RunAIParams = {
  systemPrompt: string;
  userInput: string;
  model?: string;
};

export type AIRunResult = {
  text: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  usageMetadata: unknown;
  raw: unknown;
};

function resolveProviderModel(model: string): string {
  return MODEL_ALIAS_MAP[model] ?? model;
}

function resolveTokenUsage(usageMetadata: unknown): { tokensInput: number; tokensOutput: number } {
  if (!usageMetadata || typeof usageMetadata !== 'object') {
    return { tokensInput: 0, tokensOutput: 0 };
  }

  const usage = usageMetadata as UsageMetadata;

  return {
    tokensInput: typeof usage.promptTokenCount === 'number' ? usage.promptTokenCount : 0,
    tokensOutput: typeof usage.candidatesTokenCount === 'number' ? usage.candidatesTokenCount : 0,
  };
}

export async function runAI({
  systemPrompt,
  userInput,
  model = DEFAULT_MODEL_LABEL,
}: RunAIParams): Promise<AIRunResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('AI API anahtarı bulunamadı.');
  }

  try {
    const aiClient = new GoogleGenAI({ apiKey });
    const response = await aiClient.models.generateContent({
      model: resolveProviderModel(model),
      config: {
        systemInstruction: systemPrompt,
      },
      contents: userInput,
    });

    const text = response.text?.trim();
    const usageMetadata = response.usageMetadata ?? null;
    const { tokensInput, tokensOutput } = resolveTokenUsage(usageMetadata);

    return {
      text: text && text.length > 0 ? text : 'AI engine bir yanıt döndürmedi.',
      model,
      tokensInput,
      tokensOutput,
      usageMetadata,
      raw: response,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI isteği başarısız oldu.';
    throw new Error(`AI isteği başarısız oldu: ${message}`);
  }
}
