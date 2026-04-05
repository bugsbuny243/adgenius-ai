import 'server-only';

import { GoogleGenAI } from '@google/genai';

export type RunAgentParams = {
  systemPrompt: string;
  userInput: string;
  model?: string;
};

export type GeminiRunResult = {
  text: string;
  model: string;
  usageMetadata: unknown;
  raw: unknown;
};

export async function runAgent({
  systemPrompt,
  userInput,
  model = 'gemini-2.5-flash',
}: RunAgentParams): Promise<GeminiRunResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY bulunamadı.');
  }

  try {
    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model,
      config: {
        systemInstruction: systemPrompt,
      },
      contents: userInput,
    });

    const text = response.text?.trim();

    return {
      text: text && text.length > 0 ? text : 'Model bir yanıt döndürmedi.',
      model,
      usageMetadata: response.usageMetadata ?? null,
      raw: response,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gemini isteği başarısız oldu.';
    throw new Error(`Gemini isteği başarısız oldu: ${message}`);
  }
}
