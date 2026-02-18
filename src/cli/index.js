import { Command } from 'commander'
import { createRequire } from 'node:module'
import { registerEvaluateCommand } from './commands/evaluate.js'
import { registerRunCommand } from './commands/run.js'
import { registerConfigCommand } from './commands/config.js'

const require = createRequire(import.meta.url)
const { version } = require('../../package.json')

export function createProgram() {
  const program = new Command()

  program
    .name('lanter')
    .description('CLI tool that uses agentic AI to convert codebases between programming languages')
    .version(version)
    .option('-p, --provider <name>', 'AI provider (openai, anthropic, ollama)')
    .option('-m, --model <name>', 'Model name to use')

  registerEvaluateCommand(program)
  registerRunCommand(program)
  registerConfigCommand(program)

  return program
}
