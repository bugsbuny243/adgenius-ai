import { GoogleGenAI } from '@google/genai'

export type ExtractionResult = {
  customerName: string | null
  workTitle: string | null
  summary: string
  keyDates: Array<{ label: string; date: string; confidence: number }>
  taskList: Array<{ title: string; dueDate: string | null; assignee: string | null; priority: 'low' | 'medium' | 'high' }>
  riskFlags: string[]
  missingInformation: string[]
  nextActions: string[]
}

const systemPrompt = `You are OperaAI, an operations extraction engine.
Return ONLY valid JSON with these keys:
customerName, workTitle, summary, keyDates, taskList, riskFlags, missingInformation, nextActions.
Dates must be ISO 8601 strings.`

export async function runGeminiExtraction(input: string): Promise<{ parsed: ExtractionResult; raw: unknown }> {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const response = await client.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: `${systemPrompt}\n\nINPUT:\n${input}`,
    config: {
      responseMimeType: 'application/json',
    },
  })

  const rawText = response.text
  const parsed = JSON.parse(rawText) as ExtractionResult
  return {
    parsed,
    raw: parsed,
  }
}
