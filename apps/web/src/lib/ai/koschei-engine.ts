import "server-only";
import { GoogleGenAI } from "@google/genai";

export type KoscheiGeneration = {
  text: string;
  tokensIn: number | null;
  tokensOut: number | null;
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

export const runKoscheiModel = async (input: { systemPrompt: string; userInput: string; model: string }): Promise<KoscheiGeneration> => {
  const response = await ai.models.generateContent({
    model: input.model,
    contents: `${input.systemPrompt}\n\n${input.userInput}`
  });

  const text = response.text ?? "";

  return {
    text,
    tokensIn: response.usageMetadata?.promptTokenCount ?? null,
    tokensOut: response.usageMetadata?.candidatesTokenCount ?? null
  };
};
