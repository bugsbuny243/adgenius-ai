import { GoogleGenAI } from '@google/genai'

type RunAgentInput = {
  modelName?: string
  systemPrompt: string
  userInput: string
}

export type GeminiExtraction = {
  summary: string
  tasks: Array<{ title: string; dueDate?: string; priority: 'low' | 'medium' | 'high' }>
  risks: string[]
  missingFields: string[]
  customer?: { name: string; email?: string }
  workItem?: { title: string; summary?: string }
  note?: string
}

export async function extractOperationalData(input: string): Promise<GeminiExtraction> {
  return {
    summary: input.slice(0, 140) || 'No input provided.',
    tasks: [{ title: 'Review extracted input', priority: 'medium' }],
    risks: [],
    missingFields: [],
    note: 'Legacy extraction compatibility mode.',
  }
}

export async function runAgent({ modelName = 'gemini-2.5-flash', systemPrompt, userInput }: RunAgentInput) {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY tanımlı değil.')
  }

  const ai = new GoogleGenAI({ apiKey })

  const response = await ai.models.generateContent({
    model: modelName,
    contents: userInput,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.4,
    },
  })

  return {
    modelName,
    text: response.text ?? 'Model çıktısı boş döndü.',
    usageMetadata: response.usageMetadata,
  }
}
