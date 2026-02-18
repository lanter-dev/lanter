export const defaults = {
  provider: 'openai',
  model: 'gpt-4.1',
  openai: {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
  },
  anthropic: {
    apiKey: '',
  },
  ollama: {
    baseUrl: 'http://localhost:11434/v1',
  },
}
