import { z } from 'zod'

export const configSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'ollama']).optional(),
  model: z.string().optional(),
  openai: z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional(),
  }).optional(),
  anthropic: z.object({
    apiKey: z.string().optional(),
  }).optional(),
  ollama: z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional(),
  }).optional(),
})
