import 'server-only';

import { GoogleGenAI } from '@google/genai';

const DEFAULT_MODEL_LABEL = 'koschei-text-v1';
const PROVIDER_MODEL = 'gemini-2.5-flash';

const MODEL_ALIAS_MAP: Record<string, string> = {
  'ai-standard': PROVIDER_MODEL,
  'koschei-text-v1': PROVIDER_MODEL,
};

type UsageMetadataLike = {
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
    const usageMetadata = response.usageMetadata as UsageMetadataLike | undefined;
    const tokensInput = usageMetadata?.promptTokenCount ?? 0;
    const tokensOutput = usageMetadata?.candidatesTokenCount ?? 0;

    return {
      text: text && text.length > 0 ? text : 'AI engine bir yanıt döndürmedi.',
      model,
      tokensInput,
      tokensOutput,
      usageMetadata: response.usageMetadata ?? null,
      raw: response,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI isteği başarısız oldu.';
    throw new Error(`AI isteği başarısız oldu: ${message}`);
  }
}
