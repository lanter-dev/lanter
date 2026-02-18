import { createOpenAIProvider } from './openai.js'
import { createOllamaProvider } from './ollama.js'
import { createAnthropicProvider } from './anthropic.js'

const providers = {
  openai: createOpenAIProvider,
  ollama: createOllamaProvider,
  anthropic: createAnthropicProvider,
}

export function getModelProvider(config) {
  const factory = providers[config.provider]
  if (!factory) {
    throw new Error(`Unknown provider: ${config.provider}. Supported: ${Object.keys(providers).join(', ')}`)
  }
  return factory(config)
}
