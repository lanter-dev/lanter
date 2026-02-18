import path from 'node:path'
import fs from 'node:fs'
import { confirm, isCancel } from '@clack/prompts'
import { loadConfig } from '../../config/index.js'
import { runAgent } from '../../agent/index.js'
import { ensureProjectDir, saveArtifact } from '../../project/index.js'
import { startTask, endTask, logStep, logError, logSuccess } from '../../ui/index.js'
import { createEmitter } from '../../events/emitter.js'
import { createDisplay } from '../../ui/display.js'
import { formatRunSummary } from '../../ui/run-summary.js'
import { formatSummary } from '../../ui/summary.js'

export function registerRunCommand(program) {
  program
    .command('run')
    .description('Convert a codebase to another programming language')
    .requiredOption('-i, --input <dir>', 'Input directory containing the source code')
    .requiredOption('-o, --output <dir>', 'Output directory for converted code')
    .requiredOption('-d, --destination <language>', 'Target programming language')
    .option('-e, --evaluate', 'Run evaluation before conversion without prompting')
    .action(async (options, cmd) => {
      const globalOpts = cmd.parent.opts()

      const inputDir = path.resolve(options.input)
      const outputDir = path.resolve(options.output)

      if (!fs.existsSync(inputDir)) {
        logError(`Input directory does not exist: ${inputDir}`)
        process.exit(1)
      }

      // Ensure project dir early (before config loading)
      const projectDir = await ensureProjectDir(inputDir)

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

      // Check for prior evaluation
      const evalDir = path.join(projectDir, 'evaluation')
      let hasEvaluation = false
      try {
        const entries = await fs.promises.readdir(evalDir)
        hasEvaluation = entries.length > 0
      } catch {
        // evaluation dir doesn't exist
      }

      if (!hasEvaluation) {
        if (!options.evaluate) {
          const answer = await confirm({
            message: 'No evaluation found. Run it now?',
          })

          if (isCancel(answer) || !answer) {
            logError('Evaluation is required. Run `lanter evaluate` first, or use `lanter run -e` to evaluate automatically.')
            process.exit(1)
          }
        }

        logStep('Running evaluation...')
        const evalOutputDir = path.join(projectDir, 'evaluation')
        await fs.promises.mkdir(evalOutputDir, { recursive: true })

        const evalEmitter = createEmitter()
        const evalDisplay = createDisplay(evalEmitter, { auditLogPath: path.join(projectDir, 'events.log') })

        try {
          const { summary: evalSummary } = await runAgent({
            config,
            command: 'evaluate',
            inputDir,
            outputDir: evalOutputDir,
            destination: options.destination,
            emitter: evalEmitter,
          })

          evalDisplay.stop()

          if (evalSummary) {
            await saveArtifact(inputDir, 'evaluation/summary.json', JSON.stringify(evalSummary, null, 2))
            logSuccess('Evaluation complete:')
            console.log(formatSummary(evalSummary, evalOutputDir))
            console.log()
          } else {
            logSuccess('Evaluation complete.')
          }
        } catch (err) {
          evalDisplay.stop()
          logError(`Evaluation failed: ${err.message}`)
          process.exit(1)
        }
      }

      logStep(`Source: ${inputDir}`)
      logStep(`Output: ${outputDir}`)
      logStep(`Target language: ${options.destination}`)

      const emitter = createEmitter()
      const display = createDisplay(emitter, { auditLogPath: path.join(projectDir, 'events.log') })

      try {
        const { summary, finalOutput } = await runAgent({
          config,
          command: 'run',
          inputDir,
          outputDir,
          destination: options.destination,
          emitter,
        })

        display.stop()
        logSuccess(`Converted code written to: ${outputDir}`)

        if (summary) {
          await saveArtifact(inputDir, 'run-summary.json', JSON.stringify(summary, null, 2))
          console.log()
          console.log(formatRunSummary(summary))
        } else if (finalOutput) {
          console.log()
          console.log(finalOutput)
        }
      } catch (err) {
        display.stop()
        logError(`Conversion failed: ${err.message}`)
        process.exit(1)
      }
    })
}
