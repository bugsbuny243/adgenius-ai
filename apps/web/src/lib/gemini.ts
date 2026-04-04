import { GoogleGenAI } from '@google/genai'

export type GeminiExtraction = {
  summary: string
  tasks: Array<{ title: string; dueDate?: string; priority: 'low' | 'medium' | 'high' }>
  risks: string[]
  missingFields: string[]
  customer?: { name: string; email?: string }
  workItem?: { title: string; summary?: string }
  note?: string
}

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          dueDate: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['title', 'priority'],
      },
    },
    risks: { type: 'array', items: { type: 'string' } },
    missingFields: { type: 'array', items: { type: 'string' } },
    customer: {
      type: 'object',
      properties: { name: { type: 'string' }, email: { type: 'string' } },
    },
    workItem: {
      type: 'object',
      properties: { title: { type: 'string' }, summary: { type: 'string' } },
    },
    note: { type: 'string' },
  },
  required: ['summary', 'tasks', 'risks', 'missingFields'],
}

export async function extractOperationalData(input: string) {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const response = await client.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: [
      {
        role: 'user',
        parts: [{ text: `Extract operational records from this mixed input:\n${input}` }],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: OUTPUT_SCHEMA,
    },
  })

  const text = response.text?.trim() ?? '{}'
  return JSON.parse(text) as GeminiExtraction
}
