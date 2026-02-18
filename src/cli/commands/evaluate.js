import path from 'node:path'
import fs from 'node:fs'
import { loadConfig } from '../../config/index.js'
import { runAgent } from '../../agent/index.js'
import { ensureProjectDir } from '../../project/index.js'
import { startTask, endTask, logStep, logError, logSuccess } from '../../ui/index.js'
import { createEmitter } from '../../events/emitter.js'
import { createDisplay } from '../../ui/display.js'
import { formatSummary } from '../../ui/summary.js'

export function registerEvaluateCommand(program) {
  program
    .command('evaluate')
    .description('Evaluate a codebase for conversion feasibility')
    .requiredOption('-i, --input <dir>', 'Input directory containing the source code')
    .requiredOption('-d, --destination <language>', 'Target language for conversion assessment')
    .action(async (options, cmd) => {
      const globalOpts = cmd.parent.opts()

      const inputDir = path.resolve(options.input)
      if (!fs.existsSync(inputDir)) {
        logError(`Input directory does not exist: ${inputDir}`)
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

      logStep(`Evaluating codebase: ${inputDir}`)
      logStep(`Target language: ${options.destination}`)

      const projectDir = await ensureProjectDir(inputDir)
      const outputDir = path.join(projectDir, 'evaluation')
      await fs.promises.mkdir(outputDir, { recursive: true })

      const emitter = createEmitter()
      const display = createDisplay(emitter, { auditLogPath: path.join(projectDir, 'events.log') })

      try {
        const { summary, finalOutput } = await runAgent({
          config,
          command: 'evaluate',
          inputDir,
          outputDir,
          destination: options.destination,
          emitter,
        })

        display.stop()

        logSuccess(`Evaluation docs written to: ${outputDir}`)
        console.log()

        if (summary) {
          console.log(formatSummary(summary, outputDir))
        } else if (finalOutput) {
          console.log(finalOutput)
        }

        console.log()
      } catch (err) {
        display.stop()
        logError(`Evaluation failed: ${err.message}`)
        process.exit(1)
      }
    })
}
