import { z } from 'zod'

export const startRunSchema = z.object({
  agentId: z.string().min(1),
  inputText: z.string().min(1),
  knowledgeSourceId: z.string().optional(),
})

export const createAgentSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  instructions: z.string().min(10),
  templateId: z.string().optional(),
})
