import { OpenAIChatCompletionsModel } from '@openai/agents'
import OpenAI from 'openai'

export function createOllamaProvider(config) {
  const client = new OpenAI({
    apiKey: 'ollama',
    baseURL: config.ollama.baseUrl,
  })

  return new OpenAIChatCompletionsModel(client, config.model)
}
