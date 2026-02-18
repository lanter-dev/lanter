// Fetch available model names for each provider.
// Returns a string[] sorted alphabetically.

export async function fetchModels(provider, config) {
  switch (provider) {
    case 'ollama':   return fetchOllamaModels(config)
    case 'openai':   return fetchOpenAIModels(config)
    case 'anthropic': return listAnthropicModels()
    default: throw new Error(`No model listing available for provider: ${provider}`)
  }
}

async function fetchOllamaModels(config) {
  const baseUrl = config.ollama?.baseUrl ?? 'http://localhost:11434/v1'
  const apiKey  = config.ollama?.apiKey
  // Strip trailing /v1 — Ollama tags API lives at /api/tags
  const root = baseUrl.replace(/\/v1\/?$/, '')
  const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
  const res = await fetch(`${root}/api/tags`, { headers })
  if (!res.ok) throw new Error(`Ollama API returned ${res.status}: ${res.statusText}`)
  const data = await res.json()
  return (data.models ?? [])
    .map(m => m.name)
    .sort()
}

async function fetchOpenAIModels(config) {
  const baseUrl = config.openai?.baseUrl ?? 'https://api.openai.com/v1'
  const apiKey  = config.openai?.apiKey ?? ''
  const res = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`OpenAI API returned ${res.status}: ${res.statusText}`)
  const data = await res.json()
  return (data.data ?? [])
    .map(m => m.id)
    .sort()
}

function listAnthropicModels() {
  // Anthropic has no public list endpoint — keep a curated list of current models.
  return [
    'claude-opus-4-5',
    'claude-sonnet-4-5',
    'claude-haiku-4-5',
    'claude-opus-4-5-20251101',
    'claude-sonnet-4-5-20251101',
    'claude-haiku-4-5-20251001',
  ]
}
