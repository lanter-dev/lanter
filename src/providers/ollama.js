import { OpenAIChatCompletionsModel } from '@openai/agents'
import OpenAI from 'openai'

function normalizeContent(content) {
  if (content === null || content === undefined) {
    return ''
  }
  if (Array.isArray(content)) {
    return content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')
  }
  return content
}

function ollamaFetch(url, init) {
  if (init?.body) {
    try {
      const body = JSON.parse(init.body)
      if (body.messages) {
        body.messages = body.messages.map(msg => ({
          ...msg,
          content: normalizeContent(msg.content),
        }))
        init = { ...init, body: JSON.stringify(body) }
      }
    } catch {
      // not JSON, leave as-is
    }
  }
  return fetch(url, init)
}

export function createOllamaProvider(config) {
  const client = new OpenAI({
    apiKey: config.ollama.apiKey || '',
    baseURL: config.ollama.baseUrl,
    fetch: ollamaFetch,
  })

  return new OpenAIChatCompletionsModel(client, config.model)
}
