import path from 'node:path'
import fs from 'node:fs'
import { loadConfig } from '../../config/index.js'
import { runAgent } from '../../agent/index.js'
import { ensureProjectDir } from '../../project/index.js'
import { startTask, endTask, logStep, logError, logSuccess } from '../../ui/index.js'
import { createEmitter } from '../../events/emitter.js'
import { createDisplay } from '../../ui/display.js'

export function registerRunCommand(program) {
  program
    .command('run')
    .description('Convert a codebase to another programming language')
    .requiredOption('-i, --input <dir>', 'Input directory containing the source code')
    .requiredOption('-o, --output <dir>', 'Output directory for converted code')
    .requiredOption('-d, --destination <language>', 'Target programming language')
    .action(async (options, cmd) => {
      const globalOpts = cmd.parent.opts()

      const inputDir = path.resolve(options.input)
      const outputDir = path.resolve(options.output)

      if (!fs.existsSync(inputDir)) {
        logError(`Input directory does not exist: ${inputDir}`)
        process.exit(1)
      }

      // Create output directory if it doesn't exist
      try {
        await fs.promises.mkdir(outputDir, { recursive: true })
      } catch (err) {
        logError(`Cannot create output directory: ${err.message}`)
        process.exit(1)
      }

      const spinner = startTask('Loading configuration...')
      let config
      try {
        config = await loadConfig(globalOpts)
        endTask(spinner, `Using provider: ${config.provider} (${config.model})`)
      } catch (err) {
        endTask(spinner, `Config error: ${err.message}`, false)
        process.exit(1)
      }

      logStep(`Source: ${inputDir}`)
      logStep(`Output: ${outputDir}`)
      logStep(`Target language: ${options.destination}`)

      const projectDir = await ensureProjectDir(inputDir)
      const emitter = createEmitter()
      const display = createDisplay(emitter, { auditLogPath: path.join(projectDir, 'events.log') })

      try {
        const result = await runAgent({
          config,
          command: 'run',
          inputDir,
          outputDir,
          destination: options.destination,
          emitter,
        })

        display.stop()
        logSuccess(`Converted code written to: ${outputDir}`)

        if (result) {
          console.log()
          console.log(result)
        }
      } catch (err) {
        display.stop()
        logError(`Conversion failed: ${err.message}`)
        process.exit(1)
      }
    })
}
