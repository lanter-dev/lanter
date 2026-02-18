export const defaults = {
  provider: 'openai',
  model: 'gpt-5.2',
  maxContextTokens: 128000,
  openai: {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
  },
  anthropic: {
    apiKey: '',
  },
  ollama: {
    apiKey: '',
    baseUrl: 'http://localhost:11434/v1',
  },
}
