import 'server-only';

import { GoogleGenAI } from '@google/genai';

type RunAgentParams = {
  systemPrompt: string;
  userInput: string;
  model?: string;
};

export async function runAgent({
  systemPrompt,
  userInput,
  model = 'gemini-2.5-flash',
}: RunAgentParams): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing.');
  }

  const client = new GoogleGenAI({ apiKey });

  const response = await client.models.generateContent({
    model,
    config: {
      systemInstruction: systemPrompt,
    },
    contents: userInput,
  });

  return response.text ?? 'Model bir yanıt döndürmedi.';
}
