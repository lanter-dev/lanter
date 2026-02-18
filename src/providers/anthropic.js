import { AiSdkModel } from '@openai/agents-extensions'
import { createAnthropic } from '@ai-sdk/anthropic'

export function createAnthropicProvider(config) {
  const anthropic = createAnthropic({
    apiKey: config.anthropic.apiKey,
  })

  return new AiSdkModel({
    aisdkModel: anthropic(config.model),
  })
}
