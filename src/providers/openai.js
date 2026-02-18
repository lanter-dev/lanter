import { OpenAIChatCompletionsModel } from '@openai/agents'
import OpenAI from 'openai'

export function createOpenAIProvider(config) {
  const client = new OpenAI({
    apiKey: config.openai.apiKey,
    baseURL: config.openai.baseUrl,
  })

  return new OpenAIChatCompletionsModel(client, config.model)
}
