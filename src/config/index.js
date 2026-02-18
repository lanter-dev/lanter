import { cosmiconfig } from 'cosmiconfig'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { defaults } from './defaults.js'
import { configSchema } from './schema.js'

function deepMerge(target, source) {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (source[key] !== undefined && source[key] !== '') {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object'
      ) {
        result[key] = deepMerge(target[key], source[key])
      } else {
        result[key] = source[key]
      }
    }
  }
  return result
}

function getEnvOverrides() {
  const overrides = {}

  if (process.env.LANTER_PROVIDER) {
    overrides.provider = process.env.LANTER_PROVIDER
  }
  if (process.env.LANTER_MODEL) {
    overrides.model = process.env.LANTER_MODEL
  }
  if (process.env.OPENAI_API_KEY) {
    overrides.openai = { apiKey: process.env.OPENAI_API_KEY }
  }
  if (process.env.OPENAI_BASE_URL) {
    overrides.openai = { ...overrides.openai, baseUrl: process.env.OPENAI_BASE_URL }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    overrides.anthropic = { apiKey: process.env.ANTHROPIC_API_KEY }
  }
  if (process.env.OLLAMA_BASE_URL) {
    overrides.ollama = { baseUrl: process.env.OLLAMA_BASE_URL }
  }

  return overrides
}

function getCliOverrides(flags = {}) {
  const overrides = {}
  if (flags.provider) overrides.provider = flags.provider
  if (flags.model) overrides.model = flags.model
  return overrides
}

export async function loadConfig(flags = {}) {
  const explorer = cosmiconfig('lanter', {
    searchPlaces: [
      'config.json',
      '.lanterrc',
      '.lanterrc.json',
    ],
    searchStrategy: 'global',
  })

  const configDir = path.join(os.homedir(), '.lanter')
  let fileConfig = {}

  try {
    const result = await explorer.search(configDir)
    if (result && result.config) {
      fileConfig = result.config
    }
  } catch {
    // no config file found, use defaults
  }

  const envOverrides = getEnvOverrides()
  const cliOverrides = getCliOverrides(flags)

  // Precedence: CLI flags > env vars > config file > defaults
  const merged = deepMerge(
    deepMerge(deepMerge(defaults, fileConfig), envOverrides),
    cliOverrides,
  )

  const parsed = configSchema.safeParse(merged)
  if (!parsed.success) {
    throw new Error(`Invalid configuration: ${parsed.error.message}`)
  }

  return parsed.data
}

export function getConfigPath() {
  return path.join(os.homedir(), '.lanter', 'config.json')
}

export async function setConfigValue(key, value) {
  const configPath = getConfigPath()
  const configDir = path.dirname(configPath)

  await fs.promises.mkdir(configDir, { recursive: true })

  let config = {}
  try {
    const raw = await fs.promises.readFile(configPath, 'utf-8')
    config = JSON.parse(raw)
  } catch {
    // file doesn't exist yet
  }

  // Support nested keys like "openai.apiKey"
  const parts = key.split('.')
  let target = config
  for (let i = 0; i < parts.length - 1; i++) {
    if (!target[parts[i]] || typeof target[parts[i]] !== 'object') {
      target[parts[i]] = {}
    }
    target = target[parts[i]]
  }
  target[parts[parts.length - 1]] = value

  await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2) + '\n')
}

export async function getConfigValue(key) {
  const config = await loadConfig()
  const parts = key.split('.')
  let value = config
  for (const part of parts) {
    if (value === undefined || value === null) return undefined
    value = value[part]
  }
  return value
}
