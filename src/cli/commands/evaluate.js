import path from 'node:path'
import fs from 'node:fs'
import { loadConfig } from '../../config/index.js'
import { runAgent } from '../../agent/index.js'
import { saveArtifact } from '../../project/index.js'
import { startTask, endTask, logStep, logError, showReport } from '../../ui/index.js'

export function registerEvaluateCommand(program) {
  program
    .command('evaluate')
    .description('Evaluate a codebase for conversion feasibility')
    .requiredOption('-i, --input <dir>', 'Input directory containing the source code')
    .option('-d, --destination <language>', 'Target language for conversion assessment')
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
      if (options.destination) {
        logStep(`Target language: ${options.destination}`)
      }

      const agentSpinner = startTask('Running evaluation agent...')
      try {
        const report = await runAgent({
          config,
          command: 'evaluate',
          inputDir,
          destination: options.destination,
        })

        endTask(agentSpinner, 'Evaluation complete')

        // Save the report as an artifact
        const artifactPath = await saveArtifact(inputDir, 'evaluation-report.md', report)
        logStep(`Report saved to: ${artifactPath}`)

        showReport(report)
      } catch (err) {
        endTask(agentSpinner, `Evaluation failed: ${err.message}`, false)
        process.exit(1)
      }
    })
}
