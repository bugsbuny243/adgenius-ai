export type GeminiExtraction = {
  summary: string
  tasks: Array<{ title: string; dueDate?: string; priority: 'low' | 'medium' | 'high' }>
  risks: string[]
  missingFields: string[]
  customer?: { name: string; email?: string }
  workItem?: { title: string; summary?: string }
  note?: string
}

/**
 * Placeholder Gemini extraction helper.
 * This is intentionally deterministic for the architecture cutover phase.
 */
export async function extractOperationalData(input: string): Promise<GeminiExtraction> {
  return {
    summary: input.slice(0, 140) || 'No input provided.',
    tasks: [{ title: 'Review extracted input', priority: 'medium' }],
    risks: [],
    missingFields: [],
    note: 'Gemini integration is in placeholder mode until product wiring is complete.',
  }
}
