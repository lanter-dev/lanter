import { loadConfig, setConfigValue, getConfigValue, getConfigPath } from '../../config/index.js'
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
