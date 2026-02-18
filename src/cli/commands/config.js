import { select, isCancel, spinner } from '@clack/prompts'
import { loadConfig, setConfigValue, getConfigValue, getConfigPath } from '../../config/index.js'
import { fetchModels } from '../../providers/models.js'
import { logStep, logSuccess, logError } from '../../ui/index.js'

export function registerConfigCommand(program) {
  const configCmd = program
    .command('config')
    .description('Manage lanter configuration')

  configCmd
    .command('set <key> <value>')
    .description('Set a configuration value (e.g., "provider openai", "openai.apiKey sk-...")')
    .action(async (key, value) => {
      try {
        await setConfigValue(key, value)
        logSuccess(`Set ${key} = ${key.toLowerCase().includes('key') ? '***' : value}`)
        logStep(`Config file: ${getConfigPath()}`)
      } catch (err) {
        logError(`Failed to set config: ${err.message}`)
        process.exit(1)
      }
    })

  configCmd
    .command('get <key>')
    .description('Get a configuration value')
    .action(async (key) => {
      try {
        const value = await getConfigValue(key)
        if (value === undefined) {
          logError(`Key not found: ${key}`)
          process.exit(1)
        }
        const display = key.toLowerCase().includes('key') && value
          ? '***' + String(value).slice(-4)
          : value
        if (typeof display === 'object') {
          console.log(JSON.stringify(display, null, 2))
        } else {
          console.log(display)
        }
      } catch (err) {
        logError(`Failed to get config: ${err.message}`)
        process.exit(1)
      }
    })

  configCmd
    .command('model')
    .description('Interactively select a model for the current provider')
    .option('-p, --provider <name>', 'Provider to list models for (overrides config)')
    .action(async (options) => {
      let config
      try {
        config = await loadConfig(options.provider ? { provider: options.provider } : {})
      } catch (err) {
        logError(`Failed to load config: ${err.message}`)
        process.exit(1)
      }

      const provider = config.provider
      const s = spinner()
      s.start(`Fetching models from ${provider}...`)

      let models
      try {
        models = await fetchModels(provider, config)
        s.stop(`Found ${models.length} model${models.length === 1 ? '' : 's'} for ${provider}`)
      } catch (err) {
        s.stop(`Failed to fetch models: ${err.message}`)
        logError(err.message)
        process.exit(1)
      }

      if (models.length === 0) {
        logError(`No models returned from ${provider}`)
        process.exit(1)
      }

      const chosen = await select({
        message: `Select a model (current: ${config.model ?? 'none'})`,
        options: models.map(m => ({ value: m, label: m })),
        initialValue: config.model,
      })

      if (isCancel(chosen)) {
        logStep('Cancelled — no changes made')
        process.exit(0)
      }

      await setConfigValue('model', chosen)
      logSuccess(`Model set to: ${chosen}`)
      logStep(`Config file: ${getConfigPath()}`)
    })

  configCmd
    .command('list')
    .description('List all configuration values with their sources')
    .action(async () => {
      try {
        const config = await loadConfig()
        logStep(`Config file: ${getConfigPath()}`)
        console.log()
        for (const [key, value] of Object.entries(config)) {
          if (typeof value === 'object' && value !== null) {
            console.log(`${key}:`)
            for (const [subKey, subValue] of Object.entries(value)) {
              const display = subKey.toLowerCase().includes('key') && subValue
                ? '***' + String(subValue).slice(-4)
                : subValue
              console.log(`  ${subKey}: ${display || '(not set)'}`)
            }
          } else {
            console.log(`${key}: ${value || '(not set)'}`)
          }
        }
      } catch (err) {
        logError(`Failed to list config: ${err.message}`)
        process.exit(1)
      }
    })
}
